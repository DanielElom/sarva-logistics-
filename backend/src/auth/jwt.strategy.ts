/**
 * @module JwtStrategy
 * @description Passport JWT strategy that validates every bearer-token request.
 *
 * Flow: Authorization: Bearer <token> → ExtractJwt → verify signature →
 *   validate(payload) → DB lookup → attaches user to req.user
 *
 * The DB lookup on every request ensures deactivated users are rejected
 * immediately without waiting for token expiry. Trade-off: one extra DB query
 * per protected request. Acceptable for current scale.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) throw new UnauthorizedException();
    return user;
  }
}
