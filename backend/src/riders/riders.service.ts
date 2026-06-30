/**
 * @module RidersService
 * @description Rider profile, KYC, online status, and earnings management.
 *
 * ensureProfile() is called before any update to lazily create the RiderProfile
 * row for new riders who have not yet completed their profile wizard.
 *
 * verifyRider() atomically updates both RiderProfile.verificationStatus and
 * User.status — VERIFIED → ACTIVE, REJECTED → SUSPENDED — so role guards
 * immediately reflect the new state on the next API call.
 *
 * getEarnings() returns three figures from the Payout table:
 *   walletBalance  — current available balance (credited on delivery capture)
 *   totalEarned    — sum of PAID payouts (historical)
 *   pendingPayouts — sum of PENDING payout requests (awaiting admin processing)
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRiderDto } from './dto/update-rider.dto';
import { KycDto } from './dto/kyc.dto';
import { VerifyRiderDto } from './dto/verify-rider.dto';
import {
  UserStatus,
  VerificationStatus,
} from '../../generated/prisma/enums';

@Injectable()
export class RidersService {
  constructor(private prisma: PrismaService) {}

  private get db() {
    return this.prisma as any;
  }

  async getRiderProfile(userId: string) {
    const profile = await this.db.riderProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException('Rider profile not found');
    return profile;
  }

  async ensureProfile(userId: string) {
    return this.db.riderProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updateRiderProfile(userId: string, dto: UpdateRiderDto) {
    await this.ensureProfile(userId);
    const { fleetType, ...rest } = dto;
    return this.db.riderProfile.update({
      where: { userId },
      data: {
        ...rest,
        ...(fleetType !== undefined && { riderType: fleetType }),
      },
    });
  }

  async submitKyc(userId: string, dto: KycDto) {
    await this.ensureProfile(userId);
    return this.db.riderProfile.update({
      where: { userId },
      data: {
        idDocument: dto.idDocument,
        licenseDocument: dto.licenseDocument,
        bikePapers: dto.bikePapers,
        bvn: dto.bvnNin,
        bikePhotoFront: dto.bikePhotoFront,
        bikePhotoSide: dto.bikePhotoSide,
        bikePhotoPlate: dto.bikePhotoPlate,
        profilePhoto: dto.profilePhoto,
        verificationStatus: VerificationStatus.PENDING,
      },
    });
  }

  async toggleOnlineStatus(userId: string, isOnline: boolean) {
    const profile = await this.db.riderProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Rider profile not found');
    return this.db.riderProfile.update({
      where: { userId },
      data: { isOnline },
    });
  }

  async getEarnings(userId: string) {
    const profile = await this.db.riderProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Rider profile not found');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const completedOrders = await this.db.order.findMany({
      where: { riderId: profile.id, status: 'DELIVERED_CONFIRMED' },
      include: { payment: { select: { riderPayout: true } } },
      orderBy: { createdAt: 'desc' },
    });

    let today = 0, week = 0, month = 0, allTime = 0;
    const dailyBars: number[] = Array(7).fill(0);

    for (const order of completedOrders) {
      const net = Number(order.payment?.riderPayout ?? 0);
      allTime += net;
      if (order.createdAt >= startOfMonth) month += net;
      if (order.createdAt >= startOfWeek) week += net;
      if (order.createdAt >= startOfToday) today += net;
      const daysAgo = Math.floor(
        (now.getTime() - new Date(order.createdAt).getTime()) / 86_400_000,
      );
      if (daysAgo >= 0 && daysAgo < 7) {
        dailyBars[6 - daysAgo] += net;
      }
    }

    const recentEarnings = completedOrders.slice(0, 10).map((o: any) => ({
      id: o.id,
      date: o.createdAt,
      fare: Number(o.finalPrice),
      commission: Number(o.finalPrice) - Number(o.payment?.riderPayout ?? 0),
      net: Number(o.payment?.riderPayout ?? 0),
      status: 'PAID',
    }));

    const pendingPayouts = await this.db.payout.aggregate({
      where: { riderId: profile.id, status: 'PENDING' },
      _sum: { amount: true },
    });

    return {
      walletBalance: Number(profile.walletBalance),
      today,
      week,
      month,
      allTime,
      dailyBars,
      recentEarnings,
      pendingPayouts: Number(pendingPayouts._sum.amount ?? 0),
    };
  }

  async verifyRider(riderUserId: string, dto: VerifyRiderDto) {
    const profile = await this.db.riderProfile.findUnique({
      where: { userId: riderUserId },
    });
    if (!profile) throw new NotFoundException('Rider profile not found');

    const userStatus =
      dto.status === VerificationStatus.VERIFIED
        ? UserStatus.ACTIVE
        : UserStatus.SUSPENDED;

    const [updatedProfile] = await Promise.all([
      this.db.riderProfile.update({
        where: { userId: riderUserId },
        data: { verificationStatus: dto.status },
      }),
      this.db.user.update({
        where: { id: riderUserId },
        data: { status: userStatus },
      }),
    ]);

    return updatedProfile;
  }

  async listRiders(filters: {
    verified?: boolean;
    online?: boolean;
    fleetType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.verified !== undefined) {
      where.verificationStatus = filters.verified
        ? VerificationStatus.VERIFIED
        : VerificationStatus.PENDING;
    }
    if (filters.online !== undefined) where.isOnline = filters.online;
    if (filters.fleetType) where.riderType = filters.fleetType;

    const [riders, total] = await Promise.all([
      this.db.riderProfile.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { name: true, phone: true, email: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.riderProfile.count({ where }),
    ]);

    return { data: riders, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
