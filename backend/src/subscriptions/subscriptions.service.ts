/**
 * @module SubscriptionsService
 * @description Rider and business subscription plan management.
 *
 * PLAN CATALOGUE (PLANS const — source of truth, no DB table)
 * ==============
 * Business Volume Tier 1  — ₦25,000/mo, 50 deliveries
 * Business Volume Tier 2  — ₦60,000/mo, 150 deliveries
 * Business Volume Tier 3  — ₦120,000/mo, unlimited
 * Business Flat           — ₦80,000/mo, unlimited + fleet priority
 * Rider Weekly            — ₦10,000/wk, 5% commission
 * Rider Monthly           — ₦25,000/mo, 0% commission
 *
 * hasActiveSubscription(userId) — called hot path (every order + every payment).
 * Returns boolean from a single indexed DB query; intentionally simple.
 *
 * checkAndExpireSubscriptions() — called by SubscriptionsProcessor hourly cron.
 * Bulk-expires all overdue ACTIVE subscriptions and resets rider commissionModel
 * back to PERCENTAGE so the 15% rate applies immediately.
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../payments/paystack/paystack.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import {
  CommissionModel,
  NotificationType,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../generated/prisma';

export interface PlanDefinition {
  id: string;
  plan: SubscriptionPlan;
  tier?: number;
  name: string;
  price: number;
  durationDays: number;
  deliveryLimit: number | null;
  description: string;
}

const PLANS: PlanDefinition[] = [
  {
    id: 'bv-1',
    plan: SubscriptionPlan.BUSINESS_VOLUME,
    tier: 1,
    name: 'Business Volume — Tier 1',
    price: 25000,
    durationDays: 30,
    deliveryLimit: 50,
    description: '50 deliveries/month',
  },
  {
    id: 'bv-2',
    plan: SubscriptionPlan.BUSINESS_VOLUME,
    tier: 2,
    name: 'Business Volume — Tier 2',
    price: 60000,
    durationDays: 30,
    deliveryLimit: 150,
    description: '150 deliveries/month',
  },
  {
    id: 'bv-3',
    plan: SubscriptionPlan.BUSINESS_VOLUME,
    tier: 3,
    name: 'Business Volume — Tier 3',
    price: 120000,
    durationDays: 30,
    deliveryLimit: null,
    description: 'Unlimited deliveries/month',
  },
  {
    id: 'bf',
    plan: SubscriptionPlan.BUSINESS_FLAT,
    name: 'Business Flat',
    price: 80000,
    durationDays: 30,
    deliveryLimit: null,
    description: 'Unlimited deliveries + guaranteed fleet bike priority',
  },
  {
    id: 'rw',
    plan: SubscriptionPlan.RIDER_WEEKLY,
    name: 'Rider Weekly',
    price: 10000,
    durationDays: 7,
    deliveryLimit: null,
    description: '5% commission per order (instead of 15%)',
  },
  {
    id: 'rm',
    plan: SubscriptionPlan.RIDER_MONTHLY,
    name: 'Rider Monthly',
    price: 25000,
    durationDays: 30,
    deliveryLimit: null,
    description: '0% commission per order',
  },
];

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private paystack: PaystackService,
    @Inject(forwardRef(() => NotificationsService))
    private notifications: NotificationsService,
  ) {}

  private get db() {
    return this.prisma as any;
  }

  getPlans() {
    return PLANS;
  }

  private resolvePlan(dto: CreateSubscriptionDto): PlanDefinition {
    const match = PLANS.find((p) => {
      if (p.plan !== dto.planType) return false;
      if (
        dto.planType === SubscriptionPlan.BUSINESS_VOLUME &&
        p.tier !== dto.tier
      ) {
        return false;
      }
      return true;
    });

    if (!match) {
      throw new BadRequestException(
        dto.planType === SubscriptionPlan.BUSINESS_VOLUME
          ? 'BUSINESS_VOLUME requires a tier of 1, 2, or 3'
          : `Unknown plan: ${dto.planType}`,
      );
    }
    return match;
  }

  async subscribe(userId: string, dto: CreateSubscriptionDto) {
    const plan = this.resolvePlan(dto);

    const existing = await this.db.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });
    if (existing) {
      throw new BadRequestException(
        'You already have an active subscription. Cancel it first.',
      );
    }

    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { riderProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const isRiderPlan =
      dto.planType === SubscriptionPlan.RIDER_WEEKLY ||
      dto.planType === SubscriptionPlan.RIDER_MONTHLY;

    const amountKobo = plan.price * 100;
    const reference = `sub-${userId}-${Date.now()}`;
    const callbackUrl = `${process.env['APP_URL'] || 'http://localhost:3000'}/subscription/verify?ref=${reference}`;

    const paystackResult = await this.paystack.initializeTransaction(
      user.email || `${user.phone}@sarvalogistics.ng`,
      amountKobo,
      reference,
      callbackUrl,
    );

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const riderId: string | null = isRiderPlan
      ? (user.riderProfile?.id ?? null)
      : null;

    const subscription = await this.db.subscription.create({
      data: {
        userId,
        riderId,
        plan: dto.planType,
        price: plan.price,
        startDate: now,
        endDate,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
      },
    });

    if (isRiderPlan && user.riderProfile) {
      await this.db.riderProfile.update({
        where: { id: user.riderProfile.id },
        data: { commissionModel: CommissionModel.SUBSCRIPTION },
      });
    }

    this.logger.log(
      `Subscription created: ${subscription.id} plan=${dto.planType} user=${userId}`,
    );

    return {
      subscription,
      paymentUrl: paystackResult.authorizationUrl,
      reference: paystackResult.reference,
    };
  }

  async getActiveSubscription(userId: string) {
    const now = new Date();
    const sub = await this.db.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endDate: { gt: now },
      },
    });
    if (!sub) throw new NotFoundException('No active subscription found');
    return sub;
  }

  async cancelSubscription(userId: string) {
    const now = new Date();
    const sub = await this.db.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });
    if (!sub) throw new NotFoundException('No active subscription to cancel');

    const updated = await this.db.subscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.CANCELLED, endDate: now },
    });

    if (sub.riderId) {
      await this.db.riderProfile.update({
        where: { id: sub.riderId },
        data: { commissionModel: CommissionModel.PERCENTAGE },
      });
    }

    this.logger.log(`Subscription cancelled: ${sub.id} user=${userId}`);
    return updated;
  }

  async checkAndExpireSubscriptions() {
    const now = new Date();
    const expired = await this.db.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE, endDate: { lte: now } },
      select: { id: true, riderId: true, userId: true },
    });

    if (expired.length === 0) return;

    await this.db.subscription.updateMany({
      where: { id: { in: expired.map((s: any) => s.id) } },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    const riderIds = expired
      .filter((s: any) => s.riderId)
      .map((s: any) => s.riderId);

    if (riderIds.length > 0) {
      await this.db.riderProfile.updateMany({
        where: { id: { in: riderIds } },
        data: { commissionModel: CommissionModel.PERCENTAGE },
      });
    }

    this.logger.log(
      `Expired ${expired.length} subscription(s), reset ${riderIds.length} rider commission model(s)`,
    );

    await Promise.allSettled(
      expired.map((s: any) =>
        this.notifications.send(
          s.userId,
          NotificationType.SYSTEM,
          'Subscription Expired',
          'Your Sarva subscription has expired. Renew to keep your benefits.',
        ),
      ),
    );
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const now = new Date();
    const sub = await this.db.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endDate: { gt: now },
      },
      select: { id: true },
    });
    return sub !== null;
  }

  async getAdminSubscriptions(filters: {
    status?: string;
    page: number;
    limit: number;
  }) {
    const { status, page, limit } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [subscriptions, total] = await Promise.all([
      this.db.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, phone: true, role: true } },
          rider: { select: { id: true, commissionModel: true, walletBalance: true } },
        },
      }),
      this.db.subscription.count({ where }),
    ]);

    return { data: subscriptions, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async adminUpdateSubscription(id: string, status: SubscriptionStatus) {
    const sub = await this.db.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');

    const updated = await this.db.subscription.update({
      where: { id },
      data: {
        status,
        ...(status === SubscriptionStatus.CANCELLED ||
        status === SubscriptionStatus.EXPIRED
          ? { endDate: new Date() }
          : {}),
      },
    });

    if (
      sub.riderId &&
      (status === SubscriptionStatus.CANCELLED ||
        status === SubscriptionStatus.EXPIRED)
    ) {
      await this.db.riderProfile.update({
        where: { id: sub.riderId },
        data: { commissionModel: CommissionModel.PERCENTAGE },
      });
    }

    return updated;
  }
}
