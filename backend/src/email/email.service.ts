/**
 * @module EmailService
 * @description Transactional email via Resend with branded HTML template.
 *
 * Falls back to console.log when RESEND_API_KEY is unset (dev/test environments).
 * sendOtpEmail uses an inline HTML email with Sarva branding — no external
 * stylesheet dependencies so email clients render it correctly.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null = null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will log to console only');
    }
  }

  async sendOtpEmail(to: string, otp: string, name?: string | null): Promise<void> {
    const displayName = name ?? 'there';
    const subject = 'Your Sarva Logistics OTP Code';
    const html = this.buildOtpHtml(displayName, otp);

    if (!this.resend) {
      this.logger.log(`[DEV EMAIL] To: ${to} | Subject: ${subject} | OTP: ${otp}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: 'Sarva Logistics <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    if (error) {
      this.logger.error(`Failed to send OTP email to ${to}: ${error.message}`);
    } else {
      this.logger.log(`OTP email sent to ${to}`);
    }
  }

  private buildOtpHtml(name: string, otp: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Sarva Logistics OTP</title>
</head>
<body style="margin:0;padding:0;background-color:#f8faf4;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8faf4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,52,24,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#003418 0%,#004d26 100%);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-flex;align-items:center;gap:10px;">
                      <div style="width:40px;height:40px;background:rgba(255,255,255,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🚚</div>
                      <span style="font-family:'Manrope',Arial,sans-serif;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Sarva Logistics</span>
                    </div>
                    <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:8px 0 0;letter-spacing:1px;text-transform:uppercase;">Secure Verification</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="color:#404941;font-size:15px;margin:0 0 8px;">Hi ${name},</p>
              <p style="color:#191d19;font-size:15px;margin:0 0 32px;line-height:1.6;">
                Use the code below to verify your identity on Sarva. It's valid for <strong>10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background:#f2f4ee;border-radius:12px;padding:28px;text-align:center;margin-bottom:32px;">
                <p style="color:#404941;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Your verification code</p>
                <div style="font-family:'Manrope',Arial,sans-serif;font-size:48px;font-weight:800;letter-spacing:12px;color:#003418;line-height:1;">${otp}</div>
              </div>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f8;border-left:4px solid #ba1a1a;border-radius:0 8px 8px 0;padding:0;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="color:#93000a;font-size:13px;font-weight:600;margin:0 0 4px;">⚠ Security Warning</p>
                    <p style="color:#ba1a1a;font-size:13px;margin:0;line-height:1.5;">
                      Never share this code with anyone. Sarva staff will never ask for your OTP.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color:#707970;font-size:13px;margin:0;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email. Your account remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f2f4ee;padding:24px 40px;border-top:1px solid #e0e3dd;">
              <p style="color:#707970;font-size:12px;margin:0;text-align:center;line-height:1.6;">
                © 2026 Sarva Logistics · We Grow When You Grow<br/>
                <span style="color:#c0c9be;">This is an automated message — please do not reply.</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
