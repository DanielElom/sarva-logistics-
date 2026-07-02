/**
 * @module ChatService
 * @description In-app messaging between customer and rider for an active order.
 *
 * Chat is only permitted while an order is in an ACTIVE_ORDER_STATUSES state.
 * Once the order is DELIVERED_CONFIRMED or CANCELLED, the chat is locked.
 * This prevents post-delivery contact that could bypass the platform.
 *
 * logCall() records call metadata (not audio) — used by admin dispute resolution
 * to verify that contact was attempted and the call duration.
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CallType, MessageType, OrderStatus } from '../../generated/prisma';

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.ASSIGNED,
  OrderStatus.EN_ROUTE_TO_PICKUP,
  OrderStatus.ARRIVED_AT_PICKUP,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_TRANSIT,
  OrderStatus.ARRIVED_AT_DELIVERY,
  OrderStatus.DELIVERED_REQUESTED,
  OrderStatus.DELIVERED_CONFIRMED,
];

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private prisma: PrismaService) {}

  private get db() {
    return this.prisma as any;
  }

  private async resolveOrderParties(orderId: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: {
        rider: { select: { userId: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async sendMessage(
    senderId: string,
    orderId: string,
    content: string,
    messageType: MessageType,
  ) {
    const order = await this.resolveOrderParties(orderId);

    if (!ACTIVE_ORDER_STATUSES.includes(order.status as OrderStatus)) {
      throw new BadRequestException(
        `Chat is only available for active orders (current status: ${order.status})`,
      );
    }

    const isUser = order.userId === senderId;
    const isRider = order.rider?.userId === senderId;
    if (!isUser && !isRider) {
      throw new ForbiddenException('You are not a party to this order');
    }

    const receiverId = isUser ? order.rider!.userId : order.userId;

    const message = await this.db.chatMessage.create({
      data: {
        orderId,
        senderId,
        receiverId,
        content,
        messageType,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
      },
    });

    this.logger.log(`Message sent in order ${orderId} by ${senderId}`);
    return message;
  }

  async getChatHistory(orderId: string, requesterId: string, requesterRole: string) {
    const order = await this.resolveOrderParties(orderId);

    const isUser = order.userId === requesterId;
    const isRider = order.rider?.userId === requesterId;
    const isAdmin = requesterRole === 'ADMIN';

    if (!isUser && !isRider && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    return this.db.chatMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async logCall(
    callerId: string,
    orderId: string,
    callType: CallType,
    durationSeconds: number,
  ) {
    const order = await this.resolveOrderParties(orderId);

    const isUser = order.userId === callerId;
    const isRider = order.rider?.userId === callerId;
    if (!isUser && !isRider) {
      throw new ForbiddenException('You are not a party to this order');
    }

    const receiverId = isUser ? order.rider!.userId : order.userId;

    const callLog = await this.db.callLog.create({
      data: {
        orderId,
        callerId,
        receiverId,
        callType,
        durationSeconds,
      },
      include: {
        caller: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
      },
    });

    this.logger.log(
      `Call logged in order ${orderId}: type=${callType} duration=${durationSeconds}s`,
    );
    return callLog;
  }

  async getCallHistory(orderId: string, requesterId: string, requesterRole: string) {
    const order = await this.resolveOrderParties(orderId);

    const isUser = order.userId === requesterId;
    const isRider = order.rider?.userId === requesterId;
    const isAdmin = requesterRole === 'ADMIN';

    if (!isUser && !isRider && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    return this.db.callLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      include: {
        caller: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async getAdminChatHistory(orderId: string) {
    return this.db.chatMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async getAdminCallHistory(orderId: string) {
    return this.db.callLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      include: {
        caller: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
      },
    });
  }
}
