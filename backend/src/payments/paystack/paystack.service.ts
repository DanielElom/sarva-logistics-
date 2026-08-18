/**
 * @module PaystackService
 * @description Paystack payment gateway integration for Sarva.
 *
 * initializeTransaction() — creates a Paystack checkout session, returns
 *   authorizationUrl (redirect user here) and reference (store on order).
 *
 * verifyTransaction() — confirms payment status via Paystack verify endpoint.
 *   Called after redirect from Paystack checkout page.
 *
 * verifyWebhookSignature() — validates HMAC-SHA512 signature on incoming
 *   Paystack webhooks. Returns true in dev (no secret key set) for local testing.
 *
 * All methods fall back to mock values when PAYSTACK_SECRET_KEY is not set
 * so the payment flow can be tested end-to-end in development.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createHmac } from 'crypto';

const BASE_URL = 'https://api.paystack.co';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);

  constructor(private config: ConfigService) {}

  private get secretKey(): string {
    return this.config.get<string>('PAYSTACK_SECRET_KEY') || '';
  }

  private get headers() {
    return { Authorization: `Bearer ${this.secretKey}` };
  }

  async initializeTransaction(
    email: string,
    amountKobo: number,
    reference: string,
    callbackUrl: string,
  ): Promise<{ authorizationUrl: string; reference: string }> {
    if (!this.secretKey) {
      this.logger.warn('[DEV] PAYSTACK_SECRET_KEY not set — returning mock checkout URL');
      return {
        authorizationUrl: `https://checkout.paystack.com/mock/${reference}`,
        reference,
      };
    }

    const { data } = await axios.post(
      `${BASE_URL}/transaction/initialize`,
      { email, amount: amountKobo, reference, callback_url: callbackUrl },
      { headers: this.headers },
    );
    return {
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    };
  }

  async verifyTransaction(reference: string): Promise<{
    status: string;
    amount: number;
    reference: string;
  }> {
    if (!this.secretKey) {
      this.logger.warn('[DEV] PAYSTACK_SECRET_KEY not set — returning mock verify success');
      return { status: 'success', amount: 0, reference };
    }

    const { data } = await axios.get(
      `${BASE_URL}/transaction/verify/${reference}`,
      { headers: this.headers },
    );
    return {
      status: data.data.status,
      amount: data.data.amount,
      reference: data.data.reference,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.secretKey) return true; // dev passthrough
    const hash = createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  }
}
