/**
 * @module NotificationsService
 * @description Multi-channel notification dispatch: FCM push + DB + SMS.
 *
 * send() writes a Notification row to DB (for in-app notification center),
 * then sends an FCM push if the user has a registered fcmToken.
 *
 * sendOrderNotification() is the primary entry point — called by other services
 * with a typed OrderEvent string. It resolves all notification targets from the
 * order record (customer + rider depending on event type) and fans out sends.
 *
 * Promise.allSettled() is used for fan-out so one failed FCM send doesn't
 * prevent the other party from receiving their notification.
 *
 * FCM uses the HTTP v1 API (not the legacy server-key API). FCM_SERVER_KEY
 * must be an OAuth2 access token, not a legacy server key.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { NotificationType } from '../../generated/prisma';

type OrderEvent =
  | 'PENDING'
  | 'ASSIGNED'
  | 'ARRIVED_AT_PICKUP'
  | 'PICKED_UP'
  | 'ARRIVED_AT_DELIVERY'
  | 'DELIVERED_REQUESTED'
  | 'DELIVERED_CONFIRMED'
  | 'CANCELLED'
  | 'PAYMENT_CAPTURED'
  | 'NO_RIDERS';


@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private sms: SmsService,
  ) {}

  private get db() {
    return this.prisma as any;
  }

  async send(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, string>,
    orderId?: string,
  ) {
    const notification = await this.db.notification.create({
      data: { userId, type, title, body, orderId: orderId ?? null },
    });

    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (user?.fcmToken) {
      await this.sendFcm(user.fcmToken, title, body, data);
    }

    return notification;
  }

  async sendSms(phone: string, message: string) {
    try {
      await this.sms.sendSms(phone, message);
    } catch (err: any) {
      this.logger.warn(`SMS failed for ${phone}: ${err.message}`);
    }
  }

  async sendOrderNotification(orderId: string, event: OrderEvent) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, phone: true, name: true } },
        rider: {
          include: {
            user: { select: { id: true, phone: true, name: true } },
          },
        },
      },
    });

    if (!order) {
      this.logger.warn(`sendOrderNotification: order ${orderId} not found`);
      return;
    }

    const riderName = order.rider?.user?.name ?? 'Your rider';
    const amount = order.finalPrice
      ? `₦${parseFloat(order.finalPrice.toString()).toLocaleString()}`
      : '';

    const sends: Promise<any>[] = [];

    switch (event) {
      case 'PENDING':
        sends.push(
          this.send(
            order.user.id,
            NotificationType.ORDER_UPDATE,
            'Looking for a Rider',
            'We are finding a rider for your delivery',
            {},
            orderId,
          ),
        );
        break;

      case 'ASSIGNED':
        sends.push(
          this.send(
            order.user.id,
            NotificationType.ORDER_UPDATE,
            'Rider Found!',
            `${riderName} is on the way to pick up your package`,
            {},
            orderId,
          ),
        );
        if (order.rider?.user) {
          sends.push(
            this.send(
              order.rider.user.id,
              NotificationType.ORDER_UPDATE,
              'New Job Assigned',
              'Head to pickup location',
              {},
              orderId,
            ),
          );
        }
        break;

      case 'ARRIVED_AT_PICKUP':
        sends.push(
          this.send(
            order.user.id,
            NotificationType.ORDER_UPDATE,
            'Rider at Pickup',
            'Your rider has arrived at the pickup location',
            {},
            orderId,
          ),
        );
        break;

      case 'PICKED_UP':
        sends.push(
          this.send(
            order.user.id,
            NotificationType.ORDER_UPDATE,
            'Package Picked Up',
            'Your package is on the way',
            {},
            orderId,
          ),
        );
        break;

      case 'ARRIVED_AT_DELIVERY':
        sends.push(
          this.send(
            order.user.id,
            NotificationType.ORDER_UPDATE,
            'Rider at Delivery',
            'Your rider has arrived at the delivery location',
            {},
            orderId,
          ),
        );
        break;

      case 'DELIVERED_REQUESTED':
        sends.push(
          this.send(
            order.user.id,
            NotificationType.ORDER_UPDATE,
            'Confirm Delivery',
            'Please confirm that your delivery was received',
            {},
            orderId,
          ),
        );
        break;

      case 'DELIVERED_CONFIRMED':
        if (order.rider?.user) {
          sends.push(
            this.send(
              order.rider.user.id,
              NotificationType.ORDER_UPDATE,
              'Delivery Confirmed',
              'Delivery confirmed — payment has been processed',
              {},
              orderId,
            ),
          );
        }
        break;

      case 'CANCELLED':
        if (order.rider?.user) {
          sends.push(
            this.send(
              order.rider.user.id,
              NotificationType.ORDER_UPDATE,
              'Order Cancelled',
              'The order was cancelled by the user',
              {},
              orderId,
            ),
          );
        }
        break;

      case 'PAYMENT_CAPTURED':
        sends.push(
          this.send(
            order.user.id,
            NotificationType.PAYMENT,
            'Payment Confirmed',
            `Payment of ${amount} confirmed`,
            {},
            orderId,
          ),
        );
        if (order.rider?.user) {
          sends.push(
            this.send(
              order.rider.user.id,
              NotificationType.PAYMENT,
              'Payment Received',
              `${amount} has been credited to your wallet`,
              {},
              orderId,
            ),
          );
        }
        break;

      case 'NO_RIDERS':
        sends.push(
          this.send(
            order.user.id,
            NotificationType.ORDER_UPDATE,
            'No Riders Available',
            'No riders are available right now. Please try again shortly.',
            {},
            orderId,
          ),
        );
        break;
    }

    await Promise.allSettled(sends);
  }

  async getNotifications(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      this.db.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.notification.count({ where: { userId } }),
    ]);
    return { data: notifications, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.db.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  private async sendFcm(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const serverKey = process.env['FCM_SERVER_KEY'];

    if (!serverKey) {
      this.logger.log(
        `[FCM DEV] token=${fcmToken.slice(0, 20)}… title="${title}" body="${body}"`,
      );
      return;
    }

    try {
      const payload = {
        message: {
          token: fcmToken,
          notification: { title, body },
          data: data ?? {},
        },
      };

      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${process.env['FCM_PROJECT_ID']}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serverKey}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`FCM send failed (${res.status}): ${text}`);
      }
    } catch (err: any) {
      this.logger.warn(`FCM error: ${err.message}`);
    }
  }
}
