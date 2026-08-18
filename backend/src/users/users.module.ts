/**
 * @module UsersModule
 * @description Customer profile management for Sarva users.
 *
 * Covers: profile completion (name, email, avatar), saved addresses,
 * business account registration, and account deletion.
 * PATCH /users/me is the primary endpoint called after OTP verification
 * to complete new-user onboarding (name, email, optional business setup).
 */
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  providers: [UsersService],
  controllers: [UsersController]
})
export class UsersModule {}
