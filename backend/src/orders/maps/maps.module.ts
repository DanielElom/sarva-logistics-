/**
 * @module MapsModule
 * @description Distance calculation for order pricing.
 *
 * MapsService wraps the Google Maps Distance Matrix API.
 * Falls back to Haversine straight-line distance when GOOGLE_MAPS_KEY is absent.
 * Exported by OrdersModule; also used by MatchingService for geo filtering.
 */
import { Module } from '@nestjs/common';
import { MapsService } from './maps.service';

@Module({
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}
