/**
 * @module SmsService
 * @description SMS delivery via Africa's Talking for Nigerian phone numbers.
 *
 * Falls back to console.log when AFRICAS_TALKING_API_KEY is unset.
 * AfricasTalking is require()'d at runtime (not import) because it uses
 * CommonJS and causes ESM resolution issues with the NestJS build when
 * imported statically.
 */
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
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
    const message = `Your Fair-Ride OTP is: ${otp}. Valid for 10 minutes.`;
    await this.sendSms(phone, message);
  }

  async sendSms(phone: string, message: string): Promise<void> {
    if (!this.at) {
      // Extract and print the OTP prominently so it's easy to spot in the terminal.
      const match = message.match(/\b\d{6}\b/);
      if (match) {
        console.log('\n' + '='.repeat(40));
        console.log(`  OTP for ${phone}: ${match[0]}`);
        console.log('='.repeat(40) + '\n');
      } else {
        this.logger.log(`[DEV SMS] ${phone}: ${message}`);
      }
      return;
    }
    await this.at.SMS.send({ to: phone, message });
  }
}
