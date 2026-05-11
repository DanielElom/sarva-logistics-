/**
 * @module TrackingService
 * @description GPS log persistence and ETA calculation for active deliveries.
 *
 * GPS logging rationale:
 *   Every location_update Socket.io event (throttled to 5s on the client)
 *   writes a GpsLog row for the active order. This serves three purposes:
 *   1. Route replay in the receipt screen after delivery
 *   2. Admin dispute resolution (admin can see the exact route taken)
 *   3. Evidence in case of delivery complaints
 *
 * ETA calculation uses straight-line Haversine distance at 30 km/h average.
 *   Production upgrade: replace with Google Maps Directions API for real-time
 *   traffic-aware ETA. Current constant (AVG_SPEED_KMH=30) is calibrated for
 *   Nigerian urban traffic conditions in Lagos/Abuja.
 */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const AVG_SPEED_KMH = 30;

@Injectable()
export class TrackingService {
  constructor(private prisma: PrismaService) {}

  private get db() {
    return this.prisma as any;
  }

  calculateEta(
    currentLat: number,
    currentLng: number,
    destLat: number,
    destLng: number,
  ): { eta: number; distanceRemaining: number } {
    const R = 6371;
    const dLat = ((destLat - currentLat) * Math.PI) / 180;
    const dLng = ((destLng - currentLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((currentLat * Math.PI) / 180) *
        Math.cos((destLat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const eta = Math.max(1, Math.round((distanceKm / AVG_SPEED_KMH) * 60));
    return {
      eta,
      distanceRemaining: Math.round(distanceKm * 100) / 100,
    };
  }

  /**
   * Persists a GPS log entry and updates the rider's live position in RiderProfile.
   * Returns the calculated ETA (minutes) and remaining distance (km) to dropoff.
   * Called from the tracking gateway on every location_update event.
   */
  async logLocation(
    riderUserId: string,
    orderId: string,
    latitude: number,
    longitude: number,
  ): Promise<{ eta: number; distanceRemaining: number }> {
    const order = await this.db.order.findUnique({ where: { id: orderId } });
    if (!order) return { eta: 0, distanceRemaining: 0 };

    await Promise.all([
      this.db.gpsLog.create({
        data: { orderId, latitude, longitude, timestamp: new Date() },
      }),
      this.db.riderProfile.updateMany({
        where: { userId: riderUserId },
        data: { latitude, longitude, lastSeenAt: new Date() },
      }),
    ]);

    const destLat = parseFloat(order.dropoffLatitude.toString());
    const destLng = parseFloat(order.dropoffLongitude.toString());
    return this.calculateEta(latitude, longitude, destLat, destLng);
  }

  async getGpsTrail(
    orderId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { rider: { select: { userId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isOwner = order.userId === requesterId;
    const isRider = order.rider?.userId === requesterId;
    const isAdmin = requesterRole === 'ADMIN';
    if (!isOwner && !isRider && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    return this.db.gpsLog.findMany({
      where: { orderId },
      orderBy: { timestamp: 'asc' },
      select: { latitude: true, longitude: true, timestamp: true },
    });
  }
}
