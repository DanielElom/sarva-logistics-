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

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class MatchingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(MatchingGateway.name);

  // userId → socket — used to join sockets to order rooms server-side
  private readonly socketMap = new Map<string, Socket>();

  constructor(
    @Inject(forwardRef(() => MatchingService))
    private matching: MatchingService,
    private tracking: TrackingService,
  ) {}

  handleConnection(client: Socket) {
    const userId = (client.handshake.auth.userId ||
      client.handshake.query['userId']) as string;
    if (userId) {
      client.join(`user:${userId}`);
      this.socketMap.set(userId, client);
      this.logger.log(`Client connected: ${client.id} → room user:${userId}`);
    } else {
      this.logger.warn(`Client ${client.id} connected without userId`);
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
  handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (data?.orderId) {
      client.join(`order:${data.orderId}`);
      this.logger.log(`${client.id} joined order:${data.orderId}`);
    }
  }

  @SubscribeMessage('location_update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { latitude: number; longitude: number; orderId?: string },
  ) {
    const userId = (client.handshake.auth.userId ||
      client.handshake.query['userId']) as string;
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
    this.server.to(`user:${riderUserId}`).emit('job_request', order);
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
