/**
 * @module AuthController
 * @description REST endpoints for authentication: OTP, password, tokens.
 *
 * PUBLIC endpoints (no guard):
 *   POST /auth/request-otp    — send OTP to phone + optional email
 *   POST /auth/verify-otp     — validate OTP, create user if new, return token pair
 *   POST /auth/login-password — password-based login (phone or email)
 *   POST /auth/forgot-password — send password-reset OTP
 *   POST /auth/reset-password  — reset password after OTP verification
 *   POST /auth/refresh         — exchange refresh token for new access token
 *
 * PROTECTED endpoints (JwtAuthGuard):
 *   GET  /auth/me              — return authenticated user from req.user
 *   POST /auth/set-password    — set initial password (no prior password required)
 *   POST /auth/change-password — change existing password (requires currentPassword)
 */
import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { LoginPasswordDto } from './dto/login-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('request-otp')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.phone, dto.email);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.otp, dto.role);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Post('set-password')
  setPassword(@Request() req: any, @Body() dto: SetPasswordDto) {
    return this.authService.setPassword(req.user.id, dto.password, dto.confirmPassword);
  }

  @Post('login-password')
  loginPassword(@Body() dto: LoginPasswordDto) {
    return this.authService.loginWithPassword(dto.identifier, dto.password);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.phone);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.phone, dto.otp, dto.password, dto.confirmPassword);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Request() req: any,
    @Body() dto: { currentPassword: string; newPassword: string; confirmPassword: string },
  ) {
    return this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
      dto.confirmPassword,
    );
  }
}
