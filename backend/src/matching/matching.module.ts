/**
 * @module MatchingModule
 * @description Real-time rider-order matching engine for Sarva.
 *
 * MatchingService   — 5-step geo+EMA matching algorithm (see matching.service.ts)
 * MatchingGateway   — Socket.io gateway: riders connect, go online, accept/reject
 * MatchingProcessor — BullMQ worker processing 'rider-timeout' jobs (30s TTL)
 * MatchingController — REST endpoints for admin visibility into live matches
 *
 * Circular dependency: MatchingModule ↔ OrdersModule (forwardRef on both sides).
 *   MatchingService needs OrdersService to update order status after match.
 *   OrdersService needs MatchingService to kick off findMatch() after order creation.
 */
import { Module, forwardRef } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchingGateway } from './matching.gateway';
import { MatchingProcessor } from './matching.processor';
import { MatchingController } from './matching.controller';
import { OrdersModule } from '../orders/orders.module';
import { TrackingModule } from '../tracking/tracking.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => OrdersModule), TrackingModule, NotificationsModule],
  controllers: [MatchingController],
  providers: [MatchingService, MatchingGateway, MatchingProcessor],
  exports: [MatchingService],
})
export class MatchingModule {}
