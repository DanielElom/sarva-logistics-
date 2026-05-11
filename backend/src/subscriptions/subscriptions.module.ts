/**
 * @module SubscriptionsModule
 * @description Rider subscription plans — weekly/monthly flat-fee tiers.
 *
 * SubscriptionsService   — plan listing, subscription purchase, active-check
 * SubscriptionsProcessor — BullMQ cron worker that expires subscriptions hourly
 * PaystackService        — re-used here to initiate subscription payments
 *
 * SubscriptionsService is exported so OrdersService and PaymentsService can
 * call hasActiveSubscription(riderUserId) to determine pricing tier.
 */
import { Module } from '@nestjs/common';
import {
  SubscriptionsController,
  AdminSubscriptionsController,
} from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsProcessor } from './subscriptions.processor';
import { PaystackService } from '../payments/paystack/paystack.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SubscriptionsController, AdminSubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsProcessor, PaystackService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
