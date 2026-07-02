/**
 * @module PaymentsService
 * @description Payment initiation, webhook handling, and commission split for Fair-Ride.
 *
 * COMMISSION SPLIT LOGIC
 * ======================
 * Standard riders (no subscription):
 *   Platform: 15%  |  Rider: 85%
 *
 * Subscribed riders (active subscription):
 *   Platform: 5%   |  Rider: 95%
 *   (Rider pays a flat weekly/monthly fee instead of high per-trip commission)
 *
 * Split only runs on DELIVERED_CONFIRMED orders (called by confirmDelivery).
 *
 * Cash payments: rider collects cash from customer, platform reconciles
 *   commission via periodic payout deductions from rider wallet.
 * Card/OPay/Bank: platform captures full amount, credits rider share
 *   to RiderProfile.walletBalance immediately after webhook confirmation.
 *
 * Payment reference format: fr-{orderId}-{timestamp}
 *   Used by webhook handlers to look up the order from the Paystack/OPay callback.
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from './paystack/paystack.service';
import { OpayService } from './opay/opay.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../generated/prisma';

const PLATFORM_RATE = 0.0; // V1: 0% commission — rider keeps 100%
/* V2_FEATURE: COMMISSION
const PLATFORM_RATE = 0.15;
const SUBSCRIPTION_PLATFORM_RATE = 0.05;
*/

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private paystack: PaystackService,
    private opay: OpayService,
    private subscriptions: SubscriptionsService,
    private notifications: NotificationsService,
  ) {}

  private get db() {
    return this.prisma as any;
  }

  async initiatePayment(userId: string, orderId: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    if (order.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Payment already ${order.paymentStatus.toLowerCase()}`,
      );
    }

    switch (order.paymentMethod as PaymentMethod) {
      // V2_FEATURE: CARD_PAYMENT — case PaymentMethod.CARD:
      case PaymentMethod.BANK_TRANSFER:
        return this.initiatePaystack(order);
      // V2_FEATURE: OPAY_PAYMENT — case PaymentMethod.OPAY: return this.initiateOpay(order);
      case PaymentMethod.CASH:
        return { message: 'Cash payment — pay rider on delivery', orderId };
      case PaymentMethod.CARD:
      case PaymentMethod.OPAY:
        throw new BadRequestException('This payment method is not available yet. Please use Cash or Bank Transfer.');
      default:
        throw new BadRequestException('Unsupported payment method');
    }
  }

  async initiatePaystack(order: any) {
    const amountKobo = Math.round(parseFloat(order.finalPrice.toString()) * 100);
    const reference = `fr-${order.id}-${Date.now()}`;
    const callbackUrl = `${process.env['APP_URL'] || 'http://localhost:3000'}/payment/verify?ref=${reference}`;

    const result = await this.paystack.initializeTransaction(
      order.user.email || `${order.user.phone}@fairride.ng`,
      amountKobo,
      reference,
      callbackUrl,
    );

    await this.db.order.update({
      where: { id: order.id },
      data: { paymentStatus: PaymentStatus.AUTHORIZED },
    });

    return {
      paymentMethod: order.paymentMethod,
      authorizationUrl: result.authorizationUrl,
      reference: result.reference,
      amount: parseFloat(order.finalPrice.toString()),
    };
  }

  async initiateOpay(order: any) {
    const amount = parseFloat(order.finalPrice.toString());
    const reference = `fr-${order.id}-${Date.now()}`;

    const result = await this.opay.initiatePayment(
      amount,
      reference,
      order.user.phone,
    );

    await this.db.order.update({
      where: { id: order.id },
      data: { paymentStatus: PaymentStatus.AUTHORIZED },
    });

    return {
      paymentMethod: PaymentMethod.OPAY,
      paymentUrl: result.paymentUrl,
      reference: result.reference,
      amount,
    };
  }

  async confirmCashPayment(riderUserId: string, orderId: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { rider: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.rider?.userId !== riderUserId) {
      throw new ForbiddenException('Only the assigned rider can confirm cash payment');
    }
    if (order.paymentMethod !== PaymentMethod.CASH) {
      throw new BadRequestException('Order payment method is not CASH');
    }
    if (order.paymentStatus === PaymentStatus.CAPTURED) {
      throw new BadRequestException('Payment already captured');
    }

    const grossAmount = parseFloat(order.finalPrice.toString());
    return this.splitAndCredit(orderId, grossAmount, order.rider.userId);
  }

  /**
   * Calculates platform commission vs rider share, upserts the Payment record,
   * marks the order as CAPTURED, and increments the rider's wallet balance.
   * Idempotent: safe to call twice (upsert prevents duplicate Payment rows).
   *
   * @param grossAmount - Total fare paid by customer in Naira (not kobo)
   * @param riderUserId - User.id of the rider (used to check subscription status)
   */
  async splitAndCredit(
    orderId: string,
    grossAmount: number,
    riderUserId: string,
  ) {
    // V1: 0% commission — rider keeps 100% of the fare
    // V2_FEATURE: COMMISSION — restore isSubscribed check and SUBSCRIPTION_PLATFORM_RATE
    const platformCommission = Math.round(grossAmount * PLATFORM_RATE * 100) / 100;
    const riderShare = Math.round((grossAmount - platformCommission) * 100) / 100;

    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { rider: true },
    });

    const [payment] = await Promise.all([
      this.db.payment.upsert({
        where: { orderId },
        create: {
          orderId,
          grossAmount,
          commissionAmount: platformCommission,
          riderPayout: riderShare,
          payoutStatus: 'PENDING',
        },
        update: {
          grossAmount,
          commissionAmount: platformCommission,
          riderPayout: riderShare,
          payoutStatus: 'PENDING',
        },
      }),
      this.db.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.CAPTURED },
      }),
      ...(order.rider
        ? [
            this.db.riderProfile.update({
              where: { id: order.rider.id },
              data: {
                walletBalance: { increment: riderShare },
              },
            }),
          ]
        : []),
    ]);

    this.logger.log(
      `Payment split for order ${orderId}: ` +
        `gross=₦${grossAmount} rider=₦${riderShare} platform=₦${platformCommission}`,
    );

    this.notifications.sendOrderNotification(orderId, 'PAYMENT_CAPTURED').catch(() => null);

    return payment;
  }

  /**
   * Handles Paystack charge.success webhook events.
   * Verifies HMAC-SHA512 signature before processing.
   * Parses orderId from reference (format: fr-{orderId}-{timestamp}),
   * then calls splitAndCredit to distribute the funds.
   * Idempotent: skips orders already CAPTURED.
   */
  async handlePaystackWebhook(rawBody: string, signature: string) {
    if (!this.paystack.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid Paystack webhook signature');
    }

    const payload = JSON.parse(rawBody);
    const event: string = payload.event;

    if (event !== 'charge.success') {
      return { received: true };
    }

    const reference: string = payload.data?.reference ?? '';
    // reference format: fr-<orderId>-<timestamp>
    const orderId = reference.split('-').slice(1, -1).join('-');
    if (!orderId) return { received: true };

    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { rider: true },
    });
    if (!order || order.paymentStatus === PaymentStatus.CAPTURED) {
      return { received: true };
    }

    await this.db.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        grossAmount: 0,
        commissionAmount: 0,
        riderPayout: 0,
        gatewayReference: reference,
      },
      update: { gatewayReference: reference },
    });

    const riderUserId = order.rider?.userId ?? '';
    const grossAmount = parseFloat(order.finalPrice.toString());
    await this.splitAndCredit(orderId, grossAmount, riderUserId);

    return { received: true };
  }

  async handleOpayWebhook(rawBody: string, signature: string) {
    if (!this.opay.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid Opay webhook signature');
    }

    const payload = JSON.parse(rawBody);
    if (payload.status !== 'SUCCESS') return { received: true };

    const reference: string = payload.reference ?? '';
    const orderId = reference.split('-').slice(1, -1).join('-');
    if (!orderId) return { received: true };

    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { rider: true },
    });
    if (!order || order.paymentStatus === PaymentStatus.CAPTURED) {
      return { received: true };
    }

    const riderUserId = order.rider?.userId ?? '';
    const grossAmount = parseFloat(order.finalPrice.toString());
    await this.splitAndCredit(orderId, grossAmount, riderUserId);

    return { received: true };
  }

  async getPaymentByOrder(orderId: string, requesterId: string, requesterRole: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { rider: { select: { userId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isOwner = order.userId === requesterId;
    const isRider = order.rider?.userId === requesterId;
    const isAdmin = requesterRole === 'ADMIN';
    if (!isOwner && !isRider && !isAdmin) throw new ForbiddenException('Access denied');

    const payment = await this.db.payment.findUnique({ where: { orderId } });
    if (!payment) throw new NotFoundException('No payment record for this order');
    return payment;
  }

  async getAdminPayments(filters: {
    status?: string;
    page: number;
    limit: number;
  }) {
    const { status, page, limit } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.payoutStatus = status;

    const [payments, total] = await Promise.all([
      this.db.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              finalPrice: true,
              paymentMethod: true,
              paymentStatus: true,
              user: { select: { name: true, phone: true } },
            },
          },
        },
      }),
      this.db.payment.count({ where }),
    ]);

    return { data: payments, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    return this.db.order.update({ where: { id: orderId }, data: { paymentStatus: status } });
  }
}
