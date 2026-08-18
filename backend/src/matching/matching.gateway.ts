/**
 * @module MatchingGateway
 * @description Socket.io gateway on the default '/' namespace for rider matching and GPS tracking.
 *
 * SOCKET ROOMS
 *   user:{userId}      — personal room, joined on connect using handshake.auth.userId
 *   order:{orderId}    — order room for tracking; joined via 'join_order' event or
 *                        automatically by emitOrderAssigned() when a match is confirmed
 *
 * EVENTS (client → server):
 *   join_order        — join order tracking room
 *   location_update   — rider sends GPS ping; writes GpsLog, updates RiderProfile,
 *                       broadcasts rider_location to order room with ETA
 *
 * EVENTS (server → client):
 *   job_request       — sent to rider personal room when a new order is dispatched
 *   order_assigned    — sent to customer personal room when a rider accepts
 *   rider_location    — broadcast to order room on every GPS ping
 *   no_riders_available — sent to customer when all candidates are exhausted
 *
 * socketMap (userId → Socket) enables server-side room joins without
 * requiring the client to emit 'join_order' immediately after connection.
 */
import { Logger, Inject, forwardRef } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MatchingService } from './matching.service';
import { TrackingService } from '../tracking/tracking.service';
import { PrismaService } from '../prisma/prisma.service';
import { getAllowedOrigins } from '../config/cors.config';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
  },
  namespace: '/',
})
export class MatchingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(MatchingGateway.name);

  // userId → socket — used to join sockets to order rooms server-side
  private readonly socketMap = new Map<string, Socket>();

  constructor(
    @Inject(forwardRef(() => MatchingService))
    private matching: MatchingService,
    private tracking: TrackingService,
    private db: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    const token = (client.handshake.auth?.['token'] ||
      client.handshake.query['token']) as string;

    if (!token) {
      this.logger.warn(`Client ${client.id} connected without token — disconnecting`);
      client.disconnect();
      return;
    }

    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      // Fail closed: without a secret every token would have to be trusted.
      this.logger.error('JWT_SECRET is not set — refusing socket connection');
      client.disconnect();
      return;
    }

    try {
      const payload = jwt.verify(token, secret) as { sub: string; role: string };
      const userId = payload.sub;

      // Identity comes from the verified token, never from client-supplied
      // handshake fields — those can be forged by any connecting client.
      client.data.userId = userId;
      client.data.role = payload.role;

      client.join(`user:${userId}`);
      this.socketMap.set(userId, client);
      this.logger.log(`Client connected: ${client.id} → room user:${userId}`);
    } catch {
      this.logger.warn(`Client ${client.id} invalid token — disconnecting`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [uid, sock] of this.socketMap) {
      if (sock.id === client.id) {
        this.socketMap.delete(uid);
        break;
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_order')
  async handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !data?.orderId) return;

    // Only the ordering customer, the assigned rider, or an admin may watch
    // an order room — otherwise any authenticated user could subscribe to
    // every rider's live GPS feed by guessing order IDs.
    const order = await this.db.order.findUnique({
      where: { id: data.orderId },
      select: { userId: true, rider: { select: { userId: true } } },
    });

    if (!order) {
      client.emit('error', { message: 'Order not found' });
      return;
    }

    const isUser = order.userId === userId;
    const isRider = order.rider?.userId === userId;
    const isAdmin = client.data.role === 'ADMIN';

    if (!isUser && !isRider && !isAdmin) {
      this.logger.warn(
        `${userId} denied join_order for ${data.orderId} — not a party to the order`,
      );
      client.emit('error', { message: 'Access denied' });
      return;
    }

    client.join(`order:${data.orderId}`);
    this.logger.log(`${client.id} joined order:${data.orderId}`);
  }

  @SubscribeMessage('location_update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { latitude: number; longitude: number; orderId?: string },
  ) {
    // Verified identity only — a spoofed userId here would let anyone
    // rewrite another rider's GPS position and skew the matching engine.
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    try {
      await this.matching.updateRiderLocation(userId, data.latitude, data.longitude);

      if (data.orderId) {
        const { eta, distanceRemaining } = await this.tracking.logLocation(
          userId,
          data.orderId,
          data.latitude,
          data.longitude,
        );

        this.server.to(`order:${data.orderId}`).emit('rider_location', {
          riderId: userId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date().toISOString(),
          eta,
          distanceRemaining,
        });

        this.logger.log(
          `location_update: user ${userId} → order ${data.orderId} ETA ${eta}min`,
        );
      }
    } catch (err: any) {
      this.logger.error(`location_update error: ${err.message}`);
    }
  }

  emitJobRequest(riderUserId: string, order: any) {
    const distanceKm = Number(order.distanceKm ?? 0);
    const payout = Number(order.finalPrice ?? 0);
    this.server.to(`user:${riderUserId}`).emit('job_request', {
      orderId: order.id,
      pickupAddress: order.pickupAddress ?? 'Pickup location',
      dropoffAddress: order.dropoffAddress ?? 'Dropoff location',
      distanceKm,
      estimatedPayout: payout,
      estimatedFare: payout,
      estimatedDistance: `${distanceKm.toFixed(1)} km`,
      estimatedTime: `${Math.max(5, Math.ceil(distanceKm * 3))} min`,
      paymentMethod: order.paymentMethod ?? 'CASH',
      isPremium: order.isPremium ?? false,
    });
  }

  emitOrderAssigned(userUserId: string, order: any) {
    this.server.to(`user:${userUserId}`).emit('order_assigned', order);

    // Join user and rider sockets to the order room for live tracking
    const orderId: string = order.id;
    const riderUserId: string | undefined = order.rider?.user?.id;

    const userSocket = this.socketMap.get(userUserId);
    if (userSocket) userSocket.join(`order:${orderId}`);

    if (riderUserId) {
      const riderSocket = this.socketMap.get(riderUserId);
      if (riderSocket) riderSocket.join(`order:${orderId}`);
    }
  }

  emitNoRidersAvailable(userUserId: string) {
    this.server
      .to(`user:${userUserId}`)
      .emit('no_riders_available', { message: 'No riders available nearby' });
  }
}
