/**
 * @module ChatGateway
 * @description Socket.io gateway on the '/chat' namespace for in-order messaging.
 *
 * AUTHENTICATION
 * Requires a valid JWT in handshake.auth.token (or query.token).
 * Clients that connect without a token are immediately disconnected.
 * userId and userRole are extracted from the JWT payload and stored on the socket.
 *
 * SOCKET ROOMS
 *   chat:{orderId}  — per-order chat room; joined via 'join_order_chat' event
 *   admin:chat      — admin room; admins auto-join on connect to monitor all chats
 *
 * EVENTS (client → server):
 *   join_order_chat  — join room + receive chat_history (past messages)
 *   send_message     — persist message, broadcast to chat room + admin room
 *   leave_order_chat — leave order chat room
 *
 * EVENTS (server → client):
 *   chat_history     — sent on room join (full message history)
 *   new_message      — broadcast on each new message
 *   call_logged      — emitted to admin room when a call is recorded
 */
import { Logger } from '@nestjs/common';
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
import * as jwt from 'jsonwebtoken';
import { ChatService } from './chat.service';
import { getAllowedOrigins } from '../config/cors.config';
import { MessageType } from '../../generated/prisma';

interface AuthSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private chatService: ChatService) {}

  handleConnection(client: AuthSocket) {
    const token =
      (client.handshake.auth.token as string) ||
      (client.handshake.query['token'] as string);

    if (!token) {
      this.logger.warn(`Chat client ${client.id} connected without token — disconnecting`);
      client.disconnect();
      return;
    }

    try {
      const secret = process.env['JWT_SECRET'] || 'fallback-secret';
      const payload = jwt.verify(token, secret) as {
        sub: string;
        role: string;
      };
      client.userId = payload.sub;
      client.userRole = payload.role;

      if (payload.role === 'ADMIN') {
        client.join('admin:chat');
        this.logger.log(`Admin ${payload.sub} joined admin:chat room`);
      }

      this.logger.log(
        `Chat client connected: ${client.id} userId=${payload.sub} role=${payload.role}`,
      );
    } catch {
      this.logger.warn(`Chat client ${client.id} invalid token — disconnecting`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket) {
    this.logger.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_order_chat')
  async handleJoinOrderChat(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { orderId: string },
  ) {
    if (!client.userId || !data?.orderId) return;

    try {
      const history = await this.chatService.getChatHistory(
        data.orderId,
        client.userId,
        client.userRole ?? '',
      );
      client.join(`chat:${data.orderId}`);
      this.logger.log(`${client.userId} joined chat:${data.orderId}`);
      client.emit('chat_history', history);
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: { orderId: string; content: string; messageType: MessageType },
  ) {
    if (!client.userId || !data?.orderId) return;

    try {
      const message = await this.chatService.sendMessage(
        client.userId,
        data.orderId,
        data.content,
        data.messageType ?? MessageType.TEXT,
      );

      this.server.to(`chat:${data.orderId}`).emit('new_message', message);
      this.server.to('admin:chat').emit('new_message', { ...message, orderId: data.orderId });
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }

  @SubscribeMessage('leave_order_chat')
  handleLeaveOrderChat(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { orderId: string },
  ) {
    if (data?.orderId) {
      client.leave(`chat:${data.orderId}`);
      this.logger.log(`${client.userId} left chat:${data.orderId}`);
    }
  }

  emitCallLogged(orderId: string, callLog: any) {
    this.server.to('admin:chat').emit('call_logged', { ...callLog, orderId });
  }
}
