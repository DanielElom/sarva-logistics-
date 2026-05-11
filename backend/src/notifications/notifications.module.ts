/**
 * @module NotificationsModule
 * @description Push and SMS notification dispatch for order lifecycle events.
 *
 * Sends FCM push notifications (via firebase-admin) and SMS alerts when order
 * status changes: PENDING → ASSIGNED → IN_TRANSIT → DELIVERED → CANCELLED.
 * Also used for payment capture confirmation.
 *
 * NotificationsService is exported and imported by OrdersModule, MatchingModule,
 * PaymentsModule, and SubscriptionsModule so any service can trigger a notification.
 */
import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
