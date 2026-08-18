/**
 * @module AuthService
 * @description Handles all authentication flows for Sarva.
 *
 * TOKEN STRATEGY
 * ==============
 * Sarva uses a dual-token system for seamless UX:
 *
 * Access Token (JWT, 30 days):
 *   Used for all API calls via Authorization: Bearer header.
 *   Contains: { sub: userId, phone, role }
 *
 * Refresh Token (JWT, 1 year):
 *   Stored in User.refreshToken column in DB.
 *   Frontend calls POST /auth/refresh on 401 to get a new access token.
 *   If refresh also fails → user must log in again.
 *
 * Design rationale: Long expiry ensures users of a delivery app
 * (who book frequently) are never interrupted by auth prompts mid-flow.
 * Session only ends on explicit logout or 1 year of inactivity.
 *
 * OTP Redis keys:
 *   otp:{phone}     → 6-digit code, 10-minute TTL  (registration/login)
 *   forgot:{phone}  → 6-digit code, 10-minute TTL  (password reset)
 */
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '../../generated/prisma';
import { User } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SmsService } from '../sms/sms.service';
import { EmailService } from '../email/email.service';

const OTP_TTL = 600;
const OTP_PREFIX = 'otp:';
const FORGOT_PREFIX = 'forgot:';
const BCRYPT_ROUNDS = 10;

type TokenPair = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private sms: SmsService,
    private email: EmailService,
    private jwt: JwtService,
  ) {}

  // ── OTP ─────────────────────────────────────────────────────────────────

  /**
   * Generates a 6-digit OTP, stores it in Redis (TTL 10 min), and sends it via SMS.
   * Also emails it via Resend if the user's email is known or emailOverride is provided.
   *
   * We use Redis (not DB) so expired OTPs are cleaned up automatically with no cron job.
   * Redis key format: otp:{phone} → "123456"
   *
   * @param phone - E.164 Nigerian phone number (+234XXXXXXXXXX)
   * @param emailOverride - Email for users not yet in DB (collected during registration)
   */
  async requestOtp(phone: string, emailOverride?: string): Promise<{ message: string }> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redis.set(`${OTP_PREFIX}${phone}`, otp, OTP_TTL);
    await this.sms.sendOtp(phone, otp);

    process.stdout.write(
      `\x1b[32m\n╔════════════════════════════════╗\n║           SARVA OTP            ║\n╠════════════════════════════════╣\n║ Phone: ${phone.padEnd(23)}║\n║ OTP:   ${otp.padEnd(23)}║\n╚════════════════════════════════╝\x1b[0m\n\n`,
    );

    const db = this.prisma as any;
    const user: User | null = await db.user.findUnique({ where: { phone } });
    const emailTarget = user?.email ?? emailOverride;
    if (emailTarget) {
      await this.email.sendOtpEmail(emailTarget, otp, user?.name).catch(() => null);
    }

    return { message: 'OTP sent' };
  }

  /**
   * Validates OTP against Redis value. On success:
   * - Creates a new User record if none exists (isNewUser=true)
   * - Issues access + refresh token pair
   *
   * New users are created with status=PENDING_VERIFICATION.
   * They complete their profile on the next screen and call PATCH /users/me.
   *
   * @param role - Required only for new users. Ignored for returning users.
   */
  async verifyOtp(
    phone: string,
    otp: string,
    role?: UserRole,
  ): Promise<TokenPair & { user: User; isNewUser: boolean }> {
    const stored = await this.redis.get(`${OTP_PREFIX}${phone}`);
    if (!stored || stored !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    await this.redis.del(`${OTP_PREFIX}${phone}`);

    const db = this.prisma as any;
    let user: User = await db.user.findUnique({ where: { phone } });
    const isNewUser = !user;

    if (!user) {
      if (!role) throw new BadRequestException('role is required for new users');
      // V1: block business roles — only INDIVIDUAL and RIDER allowed at launch
      const V2_BUSINESS_ROLES: UserRole[] = ['VENDOR' as UserRole, 'RESTAURANT' as UserRole, 'CORPORATE' as UserRole];
      if (V2_BUSINESS_ROLES.includes(role)) {
        throw new BadRequestException('Business accounts are not available yet. Please register as Individual or Rider.');
      }
      user = await db.user.create({
        data: { phone, role, status: UserStatus.PENDING_VERIFICATION },
      });
    } else if (role && user.role !== role) {
      // Phone is already registered with a different role — prevent silent mismatch
      throw new BadRequestException(
        `This phone number is already registered as ${user.role.charAt(0) + user.role.slice(1).toLowerCase()}. ` +
        `Please log in instead, or use a different number to register as ${role.charAt(0) + role.slice(1).toLowerCase()}.`,
      );
    }

    const tokens = await this.generateTokens(user);
    return { ...tokens, user, isNewUser };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const db = this.prisma as any;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user?.password) {
      throw new BadRequestException('No password set. Use "Set Password" instead.');
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await db.user.update({ where: { id: userId }, data: { password: hashed } });
    return { message: 'Password changed successfully' };
  }

  // ── Password ─────────────────────────────────────────────────────────────

  async setPassword(
    userId: string,
    password: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const db = this.prisma as any;
    await db.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    return { message: 'Password set successfully' };
  }

  /**
   * Password-based login for returning users. Accepts phone or email as identifier.
   * Detection: starts with '+' or digit → try phone first, then email fallback.
   *
   * @param identifier - Phone number (+234...) or email address
   * @param password - Plaintext password (compared via bcrypt)
   */
  async loginWithPassword(
    identifier: string,
    password: string,
  ): Promise<TokenPair & { user: User; isNewUser: boolean }> {
    const db = this.prisma as any;

    let user: User | null = null;
    const looksLikePhone = identifier.startsWith('+') || /^\d/.test(identifier);
    if (looksLikePhone) {
      user = await db.user.findUnique({ where: { phone: identifier } });
    }
    if (!user) {
      user = await db.user.findUnique({ where: { email: identifier } });
    }

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.password) throw new UnauthorizedException('Please complete registration first');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user);
    return { ...tokens, user, isNewUser: false };
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    let payload: { sub: string };
    try {
      payload = this.jwt.verify(refreshToken, { secret: process.env.JWT_SECRET });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const db = this.prisma as any;
    const user: User | null = await db.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const accessToken = this.jwt.sign(
      { sub: user.id, phone: user.phone, role: user.role },
      { expiresIn: '30d' },
    );
    return { accessToken };
  }

  // ── Forgot / Reset Password ───────────────────────────────────────────────

  async forgotPassword(phone: string): Promise<{ message: string }> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redis.set(`${FORGOT_PREFIX}${phone}`, otp, OTP_TTL);
    await this.sms.sendOtp(phone, otp);

    process.stdout.write(
      `\x1b[33m\n╔════════════════════════════════╗\n║        SARVA RESET OTP         ║\n╠════════════════════════════════╣\n║ Phone: ${phone.padEnd(23)}║\n║ OTP:   ${otp.padEnd(23)}║\n╚════════════════════════════════╝\x1b[0m\n\n`,
    );

    const db = this.prisma as any;
    const user: User | null = await db.user.findUnique({ where: { phone } });
    if (user?.email) {
      await this.email.sendOtpEmail(user.email, otp, user.name).catch(() => null);
    }

    return { message: 'OTP sent' };
  }

  async resetPassword(
    phone: string,
    otp: string,
    password: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
    const stored = await this.redis.get(`${FORGOT_PREFIX}${phone}`);
    if (!stored || stored !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    await this.redis.del(`${FORGOT_PREFIX}${phone}`);
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const db = this.prisma as any;
    await db.user.update({ where: { phone }, data: { password: hashed } });
    return { message: 'Password reset successfully' };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Signs a fresh access + refresh token pair and persists the refresh token to DB.
   * Access: 30-day expiry. Refresh: 1-year expiry.
   * The refresh token stored in DB is used to detect revocation (logout clears it).
   */
  async generateTokens(user: User): Promise<TokenPair> {
    const accessToken = this.jwt.sign(
      { sub: user.id, phone: user.phone, role: user.role },
      { expiresIn: '30d' },
    );
    const refreshToken = this.jwt.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '1y' },
    );
    await (this.prisma as any).user.update({
      where: { id: user.id },
      data: { refreshToken },
    });
    return { accessToken, refreshToken };
  }

  async validateUser(userId: string): Promise<User | null> {
    return (this.prisma as any).user.findUnique({ where: { id: userId } });
  }
}
