/**
 * @module UsersService
 * @description Customer account management — profile, addresses, business account.
 *
 * updateFcmToken is called by the frontend after notification permission is granted
 * so push notifications can be sent to the correct FCM device token.
 *
 * upsertBusinessAccount sets verificationStatus=PENDING after update so the
 * admin team is notified to verify the CAC document before B2B features unlock.
 */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { BusinessAccountDto } from './dto/business-account.dto';
import { SaveAddressDto } from './dto/save-address.dto';
import { UserStatus, VerificationStatus } from '../../generated/prisma/enums';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private get db() {
    return this.prisma as any;
  }

  async getProfile(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { businessAccount: true, riderProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.db.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  async upsertBusinessAccount(userId: string, dto: BusinessAccountDto) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.db.businessAccount.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    return this.db.user.update({
      where: { id: userId },
      data: {
        companyName: dto.companyName,
        businessAddress: dto.businessAddress,
        cacDocument: dto.cacDocument,
        ...(dto.email && { email: dto.email }),
        verificationStatus: VerificationStatus.PENDING,
      },
      include: { businessAccount: true },
    });
  }

  async getSavedAddresses(userId: string) {
    return this.db.savedAddress.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addSavedAddress(userId: string, dto: SaveAddressDto) {
    return this.db.savedAddress.create({
      data: { ...dto, userId },
    });
  }

  async deleteSavedAddress(userId: string, addressId: string) {
    const address = await this.db.savedAddress.findUnique({
      where: { id: addressId },
    });
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId) throw new ForbiddenException('Not your address');
    return this.db.savedAddress.delete({ where: { id: addressId } });
  }

  async getOrderHistory(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.db.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          rider: {
            include: { user: { select: { name: true, profilePhoto: true } } },
          },
          payment: true,
        },
      }),
      this.db.order.count({ where: { userId } }),
    ]);
    return {
      data: orders,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async updateUserStatus(userId: string, status: UserStatus) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.db.user.update({ where: { id: userId }, data: { status } });
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    return this.db.user.update({
      where: { id: userId },
      data: { fcmToken },
      select: { id: true, fcmToken: true },
    });
  }
}
