import type { PrismaClient } from '@prisma/client';

import type { FriendRequestView, SocialUser } from '../social/SocialService.js';

export type NotificationType = 'friend_request' | 'game_invitation';

export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  gameCode?: string;
  friendRequestId?: string;
  read: boolean;
  createdAt: string;
  actor?: SocialUser;
}

export interface NotificationProvider {
  list(userId: string): Promise<NotificationView[]>;
  markRead(userId: string, notificationId: string): Promise<NotificationView>;
  createFriendRequestNotification(request: FriendRequestView): Promise<void>;
  createGameInvitation(
    userId: string,
    username: string,
    gameCode: string,
  ): Promise<NotificationView>;
}

export class NotificationError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 404,
  ) {
    super(message);
  }
}

export class PrismaNotificationProvider implements NotificationProvider {
  constructor(
    private readonly client: PrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(userId: string): Promise<NotificationView[]> {
    const notifications = await this.client.notification.findMany({
      where: { recipientId: userId },
      include: { actor: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return notifications.map((notification) => this.toView(notification));
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationView> {
    const notification = await this.client.notification.findFirst({
      where: { id: notificationId, recipientId: userId },
    });
    if (!notification) throw new NotificationError('Notification not found');

    const updated = await this.client.notification.update({
      where: { id: notification.id },
      data: { readAt: notification.readAt ?? this.now() },
      include: { actor: true },
    });
    return this.toView(updated);
  }

  async createFriendRequestNotification(request: FriendRequestView): Promise<void> {
    await this.client.notification.create({
      data: {
        recipientId: request.receiver.id,
        actorId: request.sender.id,
        type: 'friend_request',
        title: 'Neue Freundschaftsanfrage',
        message: `${request.sender.username} möchte dich als Freund hinzufügen.`,
        friendRequestId: request.id,
      },
    });
  }

  async createGameInvitation(
    userId: string,
    username: string,
    gameCode: string,
  ): Promise<NotificationView> {
    const receiver = await this.client.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });
    if (!receiver) throw new NotificationError('User not found');
    if (receiver.id === userId) throw new NotificationError('You cannot invite yourself', 400);

    const notification = await this.client.notification.create({
      data: {
        recipientId: receiver.id,
        actorId: userId,
        type: 'game_invitation',
        title: 'Einladung zu einer Partie',
        message: 'Du wurdest zu einer Partie eingeladen.',
        gameCode: gameCode.toUpperCase(),
      },
      include: { actor: true },
    });
    return this.toView(notification);
  }

  private toView(notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    gameCode: string | null;
    friendRequestId: string | null;
    readAt: Date | null;
    createdAt: Date;
    actor?: { id: string; username: string; rating: number; lastOnline: Date | null } | null;
  }): NotificationView {
    return {
      id: notification.id,
      type: toNotificationType(notification.type),
      title: notification.title,
      message: notification.message,
      ...(notification.gameCode ? { gameCode: notification.gameCode } : {}),
      ...(notification.friendRequestId ? { friendRequestId: notification.friendRequestId } : {}),
      read: notification.readAt !== null,
      createdAt: notification.createdAt.toISOString(),
      ...(notification.actor ? { actor: this.toUser(notification.actor) } : {}),
    };
  }

  private toUser(user: { id: string; username: string; rating: number; lastOnline: Date | null }) {
    return {
      id: user.id,
      username: user.username,
      rating: user.rating,
      online:
        user.lastOnline !== null && this.now().getTime() - user.lastOnline.getTime() <= 90_000,
    } satisfies SocialUser;
  }
}

function toNotificationType(type: string): NotificationType {
  return type === 'game_invitation' ? 'game_invitation' : 'friend_request';
}
