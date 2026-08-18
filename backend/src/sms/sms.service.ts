/**
 * @module SmsService
 * @description SMS delivery via Africa's Talking for Nigerian phone numbers.
 *
 * Falls back to console.log when AFRICAS_TALKING_API_KEY is unset.
 * AfricasTalking is require()'d at runtime (not import) because it uses
 * CommonJS and causes ESM resolution issues with the NestJS build when
 * imported statically.
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly at: any;

  constructor() {
    const apiKey = process.env.AFRICAS_TALKING_API_KEY;
    const username = process.env.AFRICAS_TALKING_USERNAME || 'sandbox';

    if (apiKey) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AfricasTalking = require('africastalking');
      this.at = AfricasTalking({ username, apiKey });
    }
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    const message = `Your Sarva OTP is: ${otp}. Valid for 10 minutes.`;
    await this.sendSms(phone, message);
  }

  async sendSms(phone: string, message: string): Promise<void> {
    if (!this.at) {
      const match = message.match(/\b\d{6}\b/);
      if (match) {
        process.stdout.write(`\x1b[33m[SMS DEV] OTP for ${phone}: ${match[0]}\x1b[0m\n`);
      } else {
        process.stdout.write(`\x1b[33m[SMS DEV] ${phone}: ${message}\x1b[0m\n`);
      }
      return;
    }
    await this.at.SMS.send({ to: phone, message });
  }
}
