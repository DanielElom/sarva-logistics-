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

    const pendingPayouts = await this.db.payout.aggregate({
      where: { riderId: profile.id, status: 'PENDING' },
      _sum: { amount: true },
    });

    const totalPaid = await this.db.payout.aggregate({
      where: { riderId: profile.id, status: 'PAID' },
      _sum: { amount: true },
    });

    return {
      walletBalance: profile.walletBalance,
      totalEarned: totalPaid._sum.amount ?? 0,
      pendingPayouts: pendingPayouts._sum.amount ?? 0,
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
