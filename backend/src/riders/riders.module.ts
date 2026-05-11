/**
 * @module RidersModule
 * @description Rider profile management, onboarding, and earnings.
 *
 * Covers: profile CRUD, vehicle document upload, bank account setup,
 * online/offline toggle, earnings history, payout requests, and
 * subscription status display. All endpoints require RIDER role.
 */
import { Module } from '@nestjs/common';
import { RidersService } from './riders.service';
import { RidersController } from './riders.controller';

@Module({
  providers: [RidersService],
  controllers: [RidersController]
})
export class RidersModule {}
