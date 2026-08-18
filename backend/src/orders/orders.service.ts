/**
 * @module OrdersService
 * @description Core order lifecycle management for Sarva.
 *
 * DYNAMIC PRICING FORMULA
 * =======================
 * Price = (baseFare + (distanceKm × perKmRate)) × surgeMultiplier
 *
 * Default config values (stored in Redis, updatable via admin panel):
 *   config:baseFare        → ₦500   (covers first km + platform overhead)
 *   config:perKmRate       → ₦150   (per km after base)
 *   config:surgeMultiplier → 1.0    (1.0 = normal, 2.0 = double surge)
 *
 * Values are read from Redis on every order creation so admin pricing
 * changes take effect immediately without a server restart.
 * Minimum fare is ₦500 regardless of distance.
 *
 * Example: 5km delivery = max(₦500, (₦500 + 5×₦150) × 1.0) = ₦1,250
 *
 * CANCELLABLE STATUSES: PENDING, ASSIGNED, EN_ROUTE_TO_PICKUP
 * Once a rider is IN_TRANSIT, cancellation is not allowed via this service.
 */
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MapsService } from './maps/maps.service';
import { MatchingService } from '../matching/matching.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '../../generated/prisma';

const CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.ASSIGNED,
  OrderStatus.EN_ROUTE_TO_PICKUP,
];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private maps: MapsService,
    @Inject(forwardRef(() => MatchingService))
    private matching: MatchingService,
    private subscriptions: SubscriptionsService,
    private notifications: NotificationsService,
  ) {}

  private get db() {
    return this.prisma as any;
  }

  /**
   * Creates a new order, calculates dynamic price from Redis config,
   * checks if user has an active subscription (sets isPremium),
   * then kicks off rider matching as a fire-and-forget operation
   * so the API response is not blocked by the matching algorithm.
   *
   * @param userId - ID of the authenticated user placing the order
   * @param dto - Pickup/dropoff coordinates, delivery type, payment method
   */
  async createOrder(userId: string, dto: CreateOrderDto) {
    const distanceKm = await this.maps.getDistanceKm(
      dto.pickupLatitude,
      dto.pickupLongitude,
      dto.dropoffLatitude,
      dto.dropoffLongitude,
    );

    const [baseFareRaw, perKmRateRaw] = await Promise.all([
      this.redis.get('config:baseFare'),
      this.redis.get('config:perKmRate'),
      // V2_FEATURE: SURGE_PRICING — this.redis.get('config:surgeMultiplier')
    ]);
    const baseFare = parseFloat(baseFareRaw ?? '500');
    const perKmRate = parseFloat(perKmRateRaw ?? '150');
    const surgeMultiplier = 1.0; // V2_FEATURE: SURGE_PRICING — read from Redis and apply dynamic surge

    const finalPrice = Math.max(500, Math.round((baseFare + distanceKm * perKmRate) * surgeMultiplier));

    const isPremium = await this.subscriptions.hasActiveSubscription(userId);

    const businessAccount = await this.db.businessAccount.findUnique({
      where: { userId },
    });

    const order = await this.db.order.create({
      data: {
        userId,
        businessAccountId: businessAccount?.id ?? null,
        pickupAddress: dto.pickupAddress,
        pickupLatitude: dto.pickupLatitude,
        pickupLongitude: dto.pickupLongitude,
        dropoffAddress: dto.dropoffAddress,
        dropoffLatitude: dto.dropoffLatitude,
        dropoffLongitude: dto.dropoffLongitude,
        distanceKm,
        baseFare,
        perKmRate,
        surgeMultiplier,
        finalPrice,
        deliveryType: 'ON_DEMAND', // V2_FEATURE: DELIVERY_TYPES — use dto.deliveryType when enabled
        scheduledAt: null, // V2_FEATURE: SCHEDULED_DELIVERY — use dto.scheduledFor when enabled
        paymentMethod: dto.paymentMethod,
        isPremium,
        status: OrderStatus.PENDING,
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
    });

    // Fire-and-forget: don't block the API response
    this.matching.findMatch(order.id).catch((err) =>
      this.logger.error(`Matching failed for order ${order.id}: ${err.message}`),
    );
    this.notifications.sendOrderNotification(order.id, 'PENDING').catch(() => null);

    return order;
  }

  async getOrders(userId: string, page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;
    const where = { userId, ...(status ? { status } : {}) };
    const [orders, total] = await Promise.all([
      this.db.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          rider: {
            select: { id: true, user: { select: { name: true, phone: true } } },
          },
        },
      }),
      this.db.order.count({ where }),
    ]);

    return { data: orders, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getOrderById(orderId: string, requesterId: string, requesterRole: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        rider: {
          select: { id: true, userId: true, user: { select: { name: true, phone: true } } },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const isOwner = order.userId === requesterId;
    const isRider = order.rider?.userId === requesterId;
    const isAdmin = requesterRole === 'ADMIN';

    if (!isOwner && !isRider && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  async cancelOrder(userId: string, orderId: string, reason: string) {
    const order = await this.db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel an order with status ${order.status}`,
      );
    }

    const updated = await this.db.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancellationReason: reason,
      },
    });
    this.notifications.sendOrderNotification(orderId, 'CANCELLED').catch(() => null);
    return updated;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    return this.db.order.update({ where: { id: orderId }, data: { status } });
  }

  // ── Haversine distance (km) ──────────────────────────────────────────────
  private haversineKm(
    lat1: number, lng1: number,
    lat2: number, lng2: number,
  ): number {
    const R = 6371;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Pre-booking price estimate using Haversine distance (no DB write).
   * ETA formula: ~4 min/km + 8 min base (accounts for Abuja/Lagos city traffic).
   * Production upgrade: use Google Maps Directions API for real-time traffic ETA.
   */
  async getPriceEstimate(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
  ) {
    const distanceKm = this.haversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng);

    const [bfr, pkr] = await Promise.all([
      this.redis.get('config:baseFare'),
      this.redis.get('config:perKmRate'),
      // V2_FEATURE: SURGE_PRICING — this.redis.get('config:surgeMultiplier')
    ]);
    const baseFare = parseFloat(bfr ?? '300');
    const perKmRate = parseFloat(pkr ?? '120');
    const surge = 1.0; // V2_FEATURE: SURGE_PRICING — read from Redis when enabled

    const estimatedPrice = Math.round((baseFare + distanceKm * perKmRate) * surge);
    const estimatedEta = Math.round(distanceKm * 4 + 8); // ~4 min/km + 8 min base

    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      estimatedPrice,
      estimatedEta,
    };
  }

  async getPlacesAutocomplete(input: string) {
    const MOCK_PLACES = [
      { description: 'Victoria Island, Lagos', lat: 6.4281, lng: 3.4219 },
      { description: 'Wuse 2, Abuja', lat: 9.0765, lng: 7.4898 },
      { description: 'Lekki Phase 1, Lagos', lat: 6.4698, lng: 3.5852 },
      { description: 'Maitama, Abuja', lat: 9.0892, lng: 7.4829 },
      { description: 'Ikeja, Lagos', lat: 6.6018, lng: 3.3515 },
      { description: 'Garki, Abuja', lat: 9.0579, lng: 7.4951 },
      { description: 'Yaba, Lagos', lat: 6.5158, lng: 3.3770 },
      { description: 'Asokoro, Abuja', lat: 9.0481, lng: 7.5252 },
      { description: 'Allen Avenue, Ikeja, Lagos', lat: 6.6125, lng: 3.3590 },
      { description: 'Banana Island, Lagos', lat: 6.4482, lng: 3.4406 },
    ];

    const q = (input ?? '').toLowerCase().trim();
    const suggestions = q
      ? MOCK_PLACES.filter((p) =>
          p.description.toLowerCase().includes(q),
        ).slice(0, 6)
      : MOCK_PLACES.slice(0, 5);

    return { suggestions };
  }

  async parseAiAddress(description: string) {
    const fromMatch = description.match(
      /(?:from|pickup(?:\s+from)?|pick\s+up(?:\s+from)?|collect(?:\s+from)?)\s+([^,\n]+)/i,
    );
    const toMatch = description.match(
      /(?:\bto\b|deliver(?:\s+to)?|drop(?:\s*off)?(?:\s+at)?|destination[:\s]+)\s*([^,\n]+)/i,
    );
    return {
      pickupAddress: fromMatch?.[1]?.trim() ?? null,
      dropoffAddress: toMatch?.[1]?.trim() ?? null,
    };
  }

  /**
   * Customer confirms they received the package (4-digit code matched on rider side).
   * Moves order to DELIVERED_CONFIRMED — triggers payment capture downstream.
   * Only callable when status is DELIVERED_REQUESTED.
   */
  async confirmDelivery(userId: string, orderId: string) {
    const order = await this.db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    if (order.status !== OrderStatus.DELIVERED_REQUESTED) {
      throw new BadRequestException(`Order is not awaiting delivery confirmation`);
    }
    return this.db.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.DELIVERED_CONFIRMED },
    });
  }

  async rateRider(
    userId: string,
    orderId: string,
    dto: { stars: number; comment?: string },
  ) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { rider: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    if (!order.riderId) throw new BadRequestException('No rider assigned to this order');
    return this.db.rating.create({
      data: {
        orderId,
        raterUserId: userId,
        ratedRiderId: order.riderId,
        stars: dto.stars,
        comment: dto.comment ?? null,
      },
    });
  }

  async raiseDispute(
    userId: string,
    orderId: string,
    dto: { issueType: string; description: string },
  ) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { rider: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    if (!order.riderId) throw new BadRequestException('No rider assigned to this order');
    return this.db.dispute.create({
      data: {
        orderId,
        userId,
        riderId: order.riderId,
        issueType: dto.issueType,
        description: dto.description,
      },
    });
  }

  async getAdminOrders(filters: {
    status?: OrderStatus;
    page: number;
    limit: number;
  }) {
    const { status, page, limit } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.db.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          rider: {
            select: { id: true, user: { select: { name: true, phone: true } } },
          },
        },
      }),
      this.db.order.count({ where }),
    ]);

    return { data: orders, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
