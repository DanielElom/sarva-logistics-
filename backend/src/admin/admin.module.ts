/**
 * @module AdminModule
 * @description Back-office management for Fair-Ride operators.
 *
 * Covers: dashboard metrics, user management, rider KYC verification,
 * order oversight (view/override/reassign), dispute resolution,
 * finance reports + manual payouts, dynamic pricing (Redis), promo codes.
 *
 * All AdminController endpoints are guarded with RolesGuard('ADMIN').
 * AdminService is exported so AppModule can call seedDefaultPricing() at boot.
 */
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
