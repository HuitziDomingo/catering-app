import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationType } from '../enums/notification-type.enum';

export interface Notification {
  id: number;
  orderId: string | null;
  recipientUserId: string;
  channel: NotificationChannel;
  type: NotificationType;
  status: NotificationStatus;
  payload: Record<string, unknown>;
  sentAt: string | null;
}

export interface CreateNotificationDto {
  orderId?: string | null;
  recipientUserId: string;
  channel: NotificationChannel;
  type: NotificationType;
  status?: NotificationStatus;
  payload?: Record<string, unknown>;
}

export interface UpdateNotificationDto {
  orderId?: string | null;
  recipientUserId?: string;
  channel?: NotificationChannel;
  type?: NotificationType;
  status?: NotificationStatus;
  payload?: Record<string, unknown>;
}
