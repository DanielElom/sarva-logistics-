/**
 * @module EmailModule
 * @description Transactional email delivery via Resend.
 *
 * @Global — injected into every module without explicit import.
 * Sends OTP emails (registration, forgot-password), order receipts, and
 * subscription confirmation emails. Falls back to console.log in dev
 * when RESEND_API_KEY is not set.
 */
import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
