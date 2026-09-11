import { describe, expect, it, vi } from 'vitest';

import { PrismaNotificationProvider, NotificationError } from './NotificationService.js';

const now = new Date('2026-09-11T12:00:00.000Z');
const alice = { id: 'user-1', username: 'alice', rating: 1200, lastOnline: now, online: true };
const bob = { id: 'user-2', username: 'bob', rating: 1300, lastOnline: now, online: true };

function createClient(): any {
  return {
    user: { findUnique: vi.fn() },
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('PrismaNotificationProvider', () => {
  it('lists unread and read notifications for the recipient', async () => {
    const client = createClient();
    client.notification.findMany = vi.fn(async () => [
      {
        id: 'notification-1',
        type: 'game_invitation',
        title: 'Partie-Einladung',
        message: 'alice lädt dich zu einer Partie ein.',
        gameCode: 'ABC123',
        friendRequestId: null,
        readAt: null,
        createdAt: now,
        actor: alice,
      },
    ]);
    const provider = new PrismaNotificationProvider(client, () => now);

    await expect(provider.list(bob.id)).resolves.toEqual([
      expect.objectContaining({
        id: 'notification-1',
        type: 'game_invitation',
        gameCode: 'ABC123',
        read: false,
        actor: expect.objectContaining({ username: 'alice' }),
      }),
    ]);
    expect(client.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { recipientId: bob.id } }),
    );
  });

  it('creates friend and game invitation notifications', async () => {
    const client = createClient();
    client.user.findUnique = vi.fn(async () => bob);
    client.notification.create = vi.fn(async ({ data }: { data: any }) => ({
      id: 'notification-2',
      ...data,
      readAt: null,
      createdAt: now,
      actor: alice,
    }));
    const provider = new PrismaNotificationProvider(client, () => now);

    await provider.createFriendRequestNotification({
      id: 'request-1',
      status: 'pending',
      createdAt: now.toISOString(),
      sender: alice,
      receiver: bob,
    });
    await provider.createGameInvitation(alice.id, 'bob', 'ABC123');

    expect(client.notification.create).toHaveBeenCalledTimes(2);
    expect(client.notification.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ recipientId: bob.id, gameCode: 'ABC123' }),
      }),
    );
  });

  it('marks a notification as read only for its recipient', async () => {
    const client = createClient();
    client.notification.findFirst = vi
      .fn()
      .mockResolvedValueOnce({ id: 'notification-1' })
      .mockResolvedValueOnce(null);
    client.notification.update = vi.fn(async () => ({
      id: 'notification-1',
      type: 'friend_request',
      title: 'Neue Freundschaftsanfrage',
      message: 'alice möchte dich als Freund hinzufügen.',
      gameCode: null,
      friendRequestId: 'request-1',
      readAt: now,
      createdAt: now,
      actor: alice,
    }));
    const provider = new PrismaNotificationProvider(client, () => now);

    await expect(provider.markRead(bob.id, 'notification-1')).resolves.toMatchObject({
      read: true,
    });
    expect(client.notification.findFirst).toHaveBeenCalledWith({
      where: { id: 'notification-1', recipientId: bob.id },
    });
    await expect(provider.markRead(bob.id, 'missing')).rejects.toMatchObject({ statusCode: 404 });
    expect(new NotificationError('test').statusCode).toBe(404);
  });
});
