/**
 * @module SmsModule
 * @description SMS delivery via Termii for OTP and transactional messages.
 *
 * @Global — SmsService is available in every module without explicit import.
 * Sends OTP codes during registration, login, and password reset flows.
 * Falls back to console.log in dev when TERMII_API_KEY is not set.
 */
import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';

@Global()
@Module({
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
