import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SmsModule } from './sms/sms.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RidersModule } from './riders/riders.module';
import { OrdersModule } from './orders/orders.module';
import { MatchingModule } from './matching/matching.module';
import { TrackingModule } from './tracking/tracking.module';
import { PaymentsModule } from './payments/payments.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';
import { AdminModule } from './admin/admin.module';
import { AdminService } from './admin/admin.service';
import { DevModule } from './dev/dev.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    SmsModule,
    EmailModule,
    AuthModule,
    UsersModule,
    RidersModule,
    OrdersModule,
    MatchingModule,
    TrackingModule,
    PaymentsModule,
    SubscriptionsModule,
    NotificationsModule,
    ChatModule,
    AdminModule,
    DevModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private adminService: AdminService) {}

  async onModuleInit() {
    await this.adminService.seedDefaultPricing();
  }
}
