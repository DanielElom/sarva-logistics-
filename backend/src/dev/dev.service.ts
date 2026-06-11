/**
 * @module DevService
 * @description Dev-only helper operations — creates test accounts, resets test data, returns DB snapshot.
 * All methods guard against production use.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const TEST_PHONES = [
  '+2348011110001',
  '+2348022220001',
  '+2348033330001',
  '+2348044440001',
  '+2348055550001',
];

const TEST_PASSWORD = 'TestPass123!';

@Injectable()
export class DevService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get db() {
    return this.prisma as any;
  }

  async createTestAccount(body: {
    phone: string;
    role: string;
    name: string;
    email: string;
  }) {
    const { phone, role, name, email } = body;
    const hashed = await bcrypt.hash(TEST_PASSWORD, 10);

    const user = await this.db.user.upsert({
      where: { phone },
      create: { phone, role, name, email, password: hashed, status: 'ACTIVE' },
      update: { role, name, email, password: hashed, status: 'ACTIVE' },
    });

    if (role === 'RIDER') {
      await this.db.riderProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          licenseDocument: 'mock://license.jpg',
          bikeDocument: 'mock://bike.jpg',
          photo: 'mock://photo.jpg',
          bvn: '12345678901',
          bankName: 'Test Bank',
          accountNumber: '0123456789',
          commissionModel: 'PERCENTAGE',
          verificationStatus: 'VERIFIED',
          isOnline: true,
        },
        update: { verificationStatus: 'VERIFIED', isOnline: true },
      });
    }

    if (['VENDOR', 'RESTAURANT', 'CORPORATE'].includes(role)) {
      await this.db.user.update({
        where: { id: user.id },
        data: { verificationStatus: 'VERIFIED' },
      });
      const existing = await this.db.businessAccount.findUnique({ where: { userId: user.id } });
      if (!existing) {
        await this.db.businessAccount.create({
          data: {
            userId: user.id,
            companyName: `Test ${role.charAt(0) + role.slice(1).toLowerCase()} Co`,
            cacDocument: 'mock://cac.pdf',
            address: '1 Test Street, Abuja',
          },
        });
      }
    }

    const secret = this.config.get<string>('JWT_SECRET') ?? 'dev-secret';
    const accessToken = jwt.sign(
      { sub: user.id, phone: user.phone, role: user.role },
      secret,
      { expiresIn: '30d' },
    );

    return { user, accessToken, password: TEST_PASSWORD };
  }

  async verifyRider(userId: string) {
    const rider = await this.db.riderProfile.findUnique({ where: { userId } });
    if (!rider) throw new Error('Rider profile not found for this user');
    return this.db.riderProfile.update({
      where: { userId },
      data: { verificationStatus: 'VERIFIED', isOnline: true },
    });
  }

  async approveBusiness(userId: string) {
    await (this.db as any).businessAccount.updateMany({
      where: { userId },
      data: { verificationStatus: 'VERIFIED' },
    });
    return this.db.user.update({
      where: { id: userId },
      data: { verificationStatus: 'VERIFIED', status: 'ACTIVE' },
    });
  }

  async resetTestData() {
    const users = await this.db.user.findMany({
      where: { phone: { in: TEST_PHONES } },
      select: { id: true },
    });
    const userIds = users.map((u: any) => u.id);

    if (userIds.length === 0) return { deleted: 0 };

    const orders = await this.db.order.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const orderIds = orders.map((o: any) => o.id);

    if (orderIds.length) {
      await this.db.gpsLog.deleteMany({ where: { orderId: { in: orderIds } } });
      await this.db.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await this.db.rating.deleteMany({ where: { orderId: { in: orderIds } } });
      await this.db.chatMessage.deleteMany({ where: { orderId: { in: orderIds } } });
      await this.db.callLog.deleteMany({ where: { orderId: { in: orderIds } } });
      await this.db.dispute.deleteMany({ where: { orderId: { in: orderIds } } });
      await this.db.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    await this.db.subscription.deleteMany({ where: { userId: { in: userIds } } });
    await this.db.savedAddress.deleteMany({ where: { userId: { in: userIds } } });
    await this.db.notification.deleteMany({ where: { userId: { in: userIds } } });
    await this.db.riderProfile.deleteMany({ where: { userId: { in: userIds } } });
    await this.db.businessAccount.deleteMany({ where: { userId: { in: userIds } } });
    await this.db.user.deleteMany({ where: { id: { in: userIds } } });

    return { deleted: userIds.length };
  }

  async getDbSnapshot() {
    const [users, orders, riders, payments, pendingKyc, activeOrders] = await Promise.all([
      this.db.user.count(),
      this.db.order.count(),
      this.db.riderProfile.count(),
      this.db.payment.count(),
      this.db.user.count({ where: { status: 'PENDING_VERIFICATION' } }),
      this.db.order.count({
        where: {
          status: {
            in: ['PENDING', 'ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DELIVERY'],
          },
        },
      }),
    ]);
    return { users, orders, riders, payments, pendingKyc, activeOrders };
  }

  async getTestAccounts() {
    return this.db.user.findMany({
      where: { phone: { in: TEST_PHONES } },
      select: {
        id: true, phone: true, name: true, role: true, status: true, verificationStatus: true,
        riderProfile: { select: { verificationStatus: true, isOnline: true } },
      },
    });
  }

  async getPendingApprovals() {
    return this.db.user.findMany({
      where: { status: 'PENDING_VERIFICATION' },
      select: { id: true, name: true, phone: true, role: true, status: true, verificationStatus: true },
      take: 50,
    });
  }

  async updatePricing(baseFare: number, perKmRate: number, surgeMultiplier: number) {
    await Promise.all([
      this.db.appConfig.upsert({
        where: { key: 'baseFare' },
        create: { key: 'baseFare', value: String(baseFare) },
        update: { value: String(baseFare) },
      }),
      this.db.appConfig.upsert({
        where: { key: 'perKmRate' },
        create: { key: 'perKmRate', value: String(perKmRate) },
        update: { value: String(perKmRate) },
      }),
      this.db.appConfig.upsert({
        where: { key: 'surgeMultiplier' },
        create: { key: 'surgeMultiplier', value: String(surgeMultiplier) },
        update: { value: String(surgeMultiplier) },
      }),
    ]);
    return { baseFare, perKmRate, surgeMultiplier };
  }
}
