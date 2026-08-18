/**
 * @module AuthModule
 * @description Authentication and authorization for Sarva.
 *
 * Wires together:
 *   - PassportModule — provides the @UseGuards(JwtAuthGuard) infrastructure
 *   - JwtModule.registerAsync — reads JWT_SECRET from env at boot time
 *   - JwtStrategy — validates Bearer tokens on every guarded request
 *   - AuthController — exposes /auth/* endpoints (OTP, login, refresh, etc.)
 *   - AuthService — exported so other modules can call validateUser()
 *
 * Note: JwtModule signOptions.expiresIn is set to '7d' as a module default
 * but AuthService overrides it per-call ('30d' for access, '1y' for refresh).
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'fallback-secret',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
