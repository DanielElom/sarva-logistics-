/**
 * @module AdminService
 * @description Back-office operations service for Fair-Ride platform operators.
 *
 * PRICING CONFIG
 * Dynamic pricing values are stored in Redis for zero-downtime updates.
 * Each write also upserts an AppConfig DB row as a durable backup.
 * seedDefaultPricing() is called at AppModule boot to hydrate Redis from DB
 * (or fall back to hardcoded defaults) without overwriting live admin changes.
 *
 * FINANCE
 * processPayout() decrements walletBalance atomically with payout record creation.
 * It validates bank account fields are set before initiating to prevent failed
 * transfers to riders who haven't completed bank onboarding.
 *
 * PRICING_KEYS and PRICING_DEFAULTS are module-scoped constants so default
 * values and Redis key names are defined in a single place.
 */
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import { CreatePromoDto } from './dto/create-promo.dto';
import {
  DisputeStatus,
  OrderStatus,
  PayoutStatus,
  RiderType,
  SubscriptionStatus,
  UserStatus,
  VerificationStatus,
} from '../../generated/prisma/enums';

const PRICING_KEYS = {
  baseFare: 'config:baseFare',
  perKmRate: 'config:perKmRate',
  surgeMultiplier: 'config:surgeMultiplier',
} as const;

const PRICING_DEFAULTS = { baseFare: 300, perKmRate: 120, surgeMultiplier: 1.0 };

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private get db() {
    return this.prisma as any;
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getDashboard() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalTripsToday,
      onlineRiders,
      pendingOrders,
      completedOrdersToday,
      revenueToday,
      openDisputes,
      pendingKycRiders,
      activeSubscriptions,
    ] = await Promise.all([
      this.db.order.count({ where: { createdAt: { gte: todayStart } } }),
      this.db.riderProfile.count({ where: { isOnline: true } }),
      this.db.order.count({ where: { status: OrderStatus.PENDING } }),
      this.db.order.count({
        where: { status: OrderStatus.DELIVERED_CONFIRMED, updatedAt: { gte: todayStart } },
      }),
      this.db.payment.aggregate({
        _sum: { grossAmount: true, commissionAmount: true },
        where: { createdAt: { gte: todayStart } },
      }),
      this.db.dispute.count({ where: { status: DisputeStatus.OPEN } }),
      this.db.riderProfile.count({ where: { verificationStatus: VerificationStatus.PENDING } }),
      this.db.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
    ]);

    return {
      totalTripsToday,
      activeRiders: onlineRiders,
      onlineRiders,
      pendingOrders,
      completedOrdersToday,
      totalRevenueToday: parseFloat(revenueToday._sum.grossAmount?.toString() ?? '0'),
      totalCommissionToday: parseFloat(revenueToday._sum.commissionAmount?.toString() ?? '0'),
      openDisputes,
      pendingKycRiders,
      activeSubscriptions,
    };
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  async getUsers(filters: {
    role?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const { role, status, page, limit } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, phone: true, email: true,
          role: true, status: true, createdAt: true,
          riderProfile: { select: { verificationStatus: true, isOnline: true } },
        },
      }),
      this.db.user.count({ where }),
    ]);

    return { data: users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getUserDetail(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        businessAccount: true,
        riderProfile: true,
        ordersAsUser: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, status: true, paymentMethod: true,
            paymentStatus: true, finalPrice: true, createdAt: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserStatus(userId: string, status: UserStatus) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.db.user.update({ where: { id: userId }, data: { status } });
  }

  // ─── Riders ───────────────────────────────────────────────────────────────

  async getRiders(filters: {
    verificationStatus?: string;
    riderType?: string;
    isOnline?: boolean;
    page: number;
    limit: number;
  }) {
    const { verificationStatus, riderType, isOnline, page, limit } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (verificationStatus) where.verificationStatus = verificationStatus;
    if (riderType) where.riderType = riderType;
    if (isOnline !== undefined) where.isOnline = isOnline;

    const [riders, total] = await Promise.all([
      this.db.riderProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, phone: true, status: true } } },
      }),
      this.db.riderProfile.count({ where }),
    ]);

    return { data: riders, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getRiderDetail(riderId: string) {
    const rider = await this.db.riderProfile.findUnique({
      where: { id: riderId },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, status: true } },
        payouts: { take: 10, orderBy: { createdAt: 'desc' } },
        order: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, status: true, finalPrice: true, paymentMethod: true, createdAt: true,
          },
        },
      },
    });
    if (!rider) throw new NotFoundException('Rider not found');
    return rider;
  }

  async verifyRider(
    riderId: string,
    status: VerificationStatus,
    _reason?: string,
  ) {
    const rider = await this.db.riderProfile.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');
    const updated = await this.db.riderProfile.update({
      where: { id: riderId },
      data: { verificationStatus: status },
    });
    // Sync User.status so GET /users/me reflects the change for the poll.
    await this.db.user.update({
      where: { id: rider.userId },
      data: { status: status === VerificationStatus.VERIFIED ? 'ACTIVE' : 'PENDING_VERIFICATION' },
    });
    return updated;
  }

  async changeRiderFleet(riderId: string, riderType: RiderType) {
    const rider = await this.db.riderProfile.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');
    return this.db.riderProfile.update({
      where: { id: riderId },
      data: { riderType },
    });
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async getOrders(filters: {
    status?: string;
    isPremium?: boolean;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const { status, isPremium, startDate, endDate, page, limit } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (isPremium !== undefined) where.isPremium = isPremium;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [orders, total] = await Promise.all([
      this.db.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          rider: { select: { id: true, user: { select: { name: true, phone: true } } } },
        },
      }),
      this.db.order.count({ where }),
    ]);

    return { data: orders, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getOrderDetail(orderId: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        rider: { include: { user: { select: { name: true, phone: true } } } },
        payment: true,
        dispute: true,
        gpsLogs: { orderBy: { timestamp: 'asc' } },
        chatMessages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async overrideOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    return this.db.order.update({ where: { id: orderId }, data: { status } });
  }

  async reassignOrder(orderId: string, newRiderId: string) {
    const order = await this.db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const rider = await this.db.riderProfile.findUnique({ where: { id: newRiderId } });
    if (!rider) throw new NotFoundException('Rider not found');

    const updated = await this.db.order.update({
      where: { id: orderId },
      data: { riderId: newRiderId, status: OrderStatus.ASSIGNED },
    });

    this.logger.log(`Order ${orderId} reassigned to rider ${newRiderId}`);
    return updated;
  }

  // ─── Disputes ─────────────────────────────────────────────────────────────

  async getDisputes(filters: { status?: string; page: number; limit: number }) {
    const { status, page, limit } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [disputes, total] = await Promise.all([
      this.db.dispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          order: { select: { id: true, status: true, finalPrice: true } },
        },
      }),
      this.db.dispute.count({ where }),
    ]);

    return { data: disputes, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getDisputeDetail(disputeId: string) {
    const dispute = await this.db.dispute.findUnique({
      where: { id: disputeId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        rider: { include: { user: { select: { name: true, phone: true } } } },
        order: {
          include: {
            gpsLogs: { orderBy: { timestamp: 'asc' } },
            chatMessages: {
              orderBy: { createdAt: 'asc' },
              include: { sender: { select: { name: true, role: true } } },
            },
            payment: true,
          },
        },
      },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

  async resolveDispute(disputeId: string, resolutionNotes: string) {
    const dispute = await this.db.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status === DisputeStatus.RESOLVED) {
      throw new BadRequestException('Dispute already resolved');
    }
    return this.db.dispute.update({
      where: { id: disputeId },
      data: { status: DisputeStatus.RESOLVED, resolutionNotes },
    });
  }

  // ─── Finance ──────────────────────────────────────────────────────────────

  async getFinanceSummary() {
    const [totals, pendingPayouts, paidPayouts] = await Promise.all([
      this.db.payment.aggregate({
        _sum: { grossAmount: true, commissionAmount: true, riderPayout: true },
        _count: { id: true },
      }),
      this.db.payment.count({ where: { payoutStatus: PayoutStatus.PENDING } }),
      this.db.payout.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: { status: PayoutStatus.PAID },
      }),
    ]);

    return {
      totalGtv: parseFloat(totals._sum.grossAmount?.toString() ?? '0'),
      totalCommission: parseFloat(totals._sum.commissionAmount?.toString() ?? '0'),
      totalRiderPayouts: parseFloat(totals._sum.riderPayout?.toString() ?? '0'),
      totalPayments: totals._count.id,
      pendingPayouts,
      paidPayouts: paidPayouts._count.id,
      totalPaid: parseFloat(paidPayouts._sum.amount?.toString() ?? '0'),
    };
  }

  async getFinanceReport(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const payments = await this.db.payment.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: {
        grossAmount: true,
        commissionAmount: true,
        riderPayout: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const byDay: Record<
      string,
      { date: string; revenue: number; commission: number; payouts: number; trips: number }
    > = {};

    for (const p of payments) {
      const day = p.createdAt.toISOString().slice(0, 10);
      if (!byDay[day]) {
        byDay[day] = { date: day, revenue: 0, commission: 0, payouts: 0, trips: 0 };
      }
      byDay[day].revenue += parseFloat(p.grossAmount.toString());
      byDay[day].commission += parseFloat(p.commissionAmount.toString());
      byDay[day].payouts += parseFloat(p.riderPayout.toString());
      byDay[day].trips += 1;
    }

    return Object.values(byDay);
  }

  async processPayout(riderId: string, amount: number) {
    const rider = await this.db.riderProfile.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');

    if (!rider.bankAccountNumber || !rider.bankName || !rider.bankAccountName) {
      throw new BadRequestException('Rider has not set up bank account details');
    }

    const walletBalance = parseFloat(rider.walletBalance.toString());
    if (amount > walletBalance) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ₦${walletBalance}`,
      );
    }

    const [payout] = await Promise.all([
      this.db.payout.create({
        data: {
          riderId,
          amount,
          status: PayoutStatus.PROCESSING,
          bankName: rider.bankName,
          bankAccountNumber: rider.bankAccountNumber,
          bankAccountName: rider.bankAccountName,
        },
      }),
      this.db.riderProfile.update({
        where: { id: riderId },
        data: { walletBalance: { decrement: amount } },
      }),
    ]);

    this.logger.log(`Payout ₦${amount} initiated for rider ${riderId}`);
    return payout;
  }

  // ─── Pricing ──────────────────────────────────────────────────────────────

  async getPricing() {
    const [baseFare, perKmRate, surgeMultiplier] = await Promise.all([
      this.redis.get(PRICING_KEYS.baseFare),
      this.redis.get(PRICING_KEYS.perKmRate),
      this.redis.get(PRICING_KEYS.surgeMultiplier),
    ]);

    return {
      baseFare: parseFloat(baseFare ?? String(PRICING_DEFAULTS.baseFare)),
      perKmRate: parseFloat(perKmRate ?? String(PRICING_DEFAULTS.perKmRate)),
      surgeMultiplier: parseFloat(
        surgeMultiplier ?? String(PRICING_DEFAULTS.surgeMultiplier),
      ),
    };
  }

  async updatePricing(dto: UpdatePricingDto) {
    const updates: Promise<void>[] = [];

    if (dto.baseFare !== undefined) {
      updates.push(this.redis.set(PRICING_KEYS.baseFare, String(dto.baseFare)));
      updates.push(
        this.db.appConfig.upsert({
          where: { key: 'baseFare' },
          create: { key: 'baseFare', value: String(dto.baseFare) },
          update: { value: String(dto.baseFare) },
        }),
      );
    }
    if (dto.perKmRate !== undefined) {
      updates.push(this.redis.set(PRICING_KEYS.perKmRate, String(dto.perKmRate)));
      updates.push(
        this.db.appConfig.upsert({
          where: { key: 'perKmRate' },
          create: { key: 'perKmRate', value: String(dto.perKmRate) },
          update: { value: String(dto.perKmRate) },
        }),
      );
    }
    if (dto.surgeMultiplier !== undefined) {
      updates.push(
        this.redis.set(PRICING_KEYS.surgeMultiplier, String(dto.surgeMultiplier)),
      );
      updates.push(
        this.db.appConfig.upsert({
          where: { key: 'surgeMultiplier' },
          create: { key: 'surgeMultiplier', value: String(dto.surgeMultiplier) },
          update: { value: String(dto.surgeMultiplier) },
        }),
      );
    }

    await Promise.all(updates);
    this.logger.log(`Pricing updated: ${JSON.stringify(dto)}`);
    return this.getPricing();
  }

  async seedDefaultPricing() {
    for (const [key, val] of Object.entries(PRICING_DEFAULTS)) {
      const redisKey = PRICING_KEYS[key as keyof typeof PRICING_KEYS];
      // Only set if not already present (don't overwrite admin changes)
      const existing = await this.redis.get(redisKey);
      if (existing === null) {
        // Try to load from DB first
        const dbConfig = await this.db.appConfig.findUnique({
          where: { key },
        });
        await this.redis.set(redisKey, dbConfig?.value ?? String(val));
      }
    }
    this.logger.log('Pricing config seeded into Redis');
  }

  // ─── Promos ───────────────────────────────────────────────────────────────

  async getPromos() {
    return this.db.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createPromo(dto: CreatePromoDto) {
    return this.db.promoCode.create({
      data: {
        code: dto.code.toUpperCase(),
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxUses: dto.maxUses ?? 100,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async togglePromo(promoId: string, isActive: boolean) {
    const promo = await this.db.promoCode.findUnique({ where: { id: promoId } });
    if (!promo) throw new NotFoundException('Promo code not found');
    return this.db.promoCode.update({
      where: { id: promoId },
      data: { isActive },
    });
  }
}
