/**
 * @module TrackingModule
 * @description GPS location tracking and ETA calculation for active deliveries.
 *
 * TrackingService    — GPS log persistence, rider location update, ETA calc
 * TrackingController — REST endpoint to fetch GPS trail for a completed order
 *
 * The live tracking flow uses Socket.io (MatchingGateway location_update event)
 * which calls TrackingService.logLocation() on every rider ping (throttled 5s).
 * TrackingModule is exported so MatchingModule can inject TrackingService.
 */
import { Module } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';

@Module({
  providers: [TrackingService],
  controllers: [TrackingController],
  exports: [TrackingService],
})
export class TrackingModule {}
