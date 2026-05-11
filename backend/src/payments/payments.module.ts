/**
 * @module PaymentsModule
 * @description Payment initiation, webhook handling, and commission split.
 *
 * Supported payment providers:
 *   PaystackService — card + bank transfer, HMAC-SHA512 webhook verification
 *   OpayService     — OPay mobile money, HMAC webhook verification
 *
 * PaymentsController      — customer: initiate, verify, confirm cash payment
 * AdminPaymentsController — admin: paginated payment list, payout management
 *
 * SubscriptionsModule is imported to check rider subscription status
 * before calculating the commission split (15% vs 5% platform rate).
 */
import { Module } from '@nestjs/common';
import { PaymentsController, AdminPaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack/paystack.service';
import { OpayService } from './opay/opay.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SubscriptionsModule, NotificationsModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService, PaystackService, OpayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
