/**
 * @module OrdersModule
 * @description Core order lifecycle management for Sarva.
 *
 * Three controllers:
 *   PublicOrdersController  — unauthenticated: GET /orders/estimate, GET /orders/places
 *   OrdersController        — customer: create, view, cancel, rate, dispute
 *   AdminOrdersController   — admin: paginated listing, status override, reassign
 *
 * MapsModule provides distance calculation (Haversine fallback or Google Maps).
 * forwardRef(MatchingModule) breaks the circular dependency with MatchingModule.
 */
import { Module, forwardRef } from '@nestjs/common';
import { OrdersController, AdminOrdersController, PublicOrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MapsModule } from './maps/maps.module';
import { MatchingModule } from '../matching/matching.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [MapsModule, forwardRef(() => MatchingModule), SubscriptionsModule, NotificationsModule],
  controllers: [PublicOrdersController, OrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
