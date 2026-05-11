/**
 * @module ChatModule
 * @description In-app messaging between customers and riders for an active order.
 *
 * ChatGateway — Socket.io gateway on the 'chat' namespace.
 *   Clients join room `order:{orderId}` on connect.
 *   'send_message' event writes to DB + broadcasts to the room.
 *
 * ChatController — REST fallback for message history polling.
 * AdminChatController — read-only admin access to any order's chat log.
 *
 * Exports ChatGateway so MatchingModule can push system messages
 * (e.g. "Rider assigned", "Rider is arriving") into order chat rooms.
 */
import { Module } from '@nestjs/common';
import { ChatController, AdminChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

@Module({
  controllers: [ChatController, AdminChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
