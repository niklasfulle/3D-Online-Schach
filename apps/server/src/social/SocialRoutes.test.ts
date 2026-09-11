import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../index.js';
import { GameManager } from '../game/GameManager.js';
import type { AuthProvider } from '../auth/AuthService.js';
import type {
  FriendRequestView,
  FriendsOverview,
  SocialProvider,
  SocialUser,
} from './SocialService.js';
import type { NotificationProvider } from '../notifications/NotificationService.js';

const user = { id: 'user-1', username: 'alice', rating: 1200 };
const bob: SocialUser = { id: 'user-2', username: 'bob', rating: 1200, online: true };
const request: FriendRequestView = {
  id: 'request-1',
  status: 'pending',
  createdAt: '2026-09-10T10:00:00.000Z',
  sender: { ...user, online: true },
  receiver: bob,
};
const overview: FriendsOverview = {
  friends: [],
  incomingRequests: [],
  outgoingRequests: [request],
};

describe('social and lobby API', () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('requires an authenticated session for social and lobby routes', async () => {
    const authProvider = createAuthProvider(undefined);
    app = buildApp(new GameManager(), authProvider, createSocialProvider());

    const response = await app.inject({ method: 'GET', url: '/friends' });

    expect(response.statusCode).toBe(401);
  });

  it('connects authenticated users to friends and lobby actions', async () => {
    const socialProvider = createSocialProvider();
    const notificationProvider = createNotificationProvider();
    app = buildApp(
      new GameManager(),
      createAuthProvider(user),
      socialProvider,
      notificationProvider,
    );

    const friends = await app.inject({ method: 'GET', url: '/friends' });
    expect(friends.statusCode).toBe(200);
    expect(friends.json()).toEqual(overview);

    const friendRequest = await app.inject({
      method: 'POST',
      url: '/friends/requests',
      payload: { username: 'bob' },
    });
    expect(friendRequest.statusCode).toBe(201);
    expect(socialProvider.sendRequest).toHaveBeenCalledWith('user-1', 'bob');
    expect(notificationProvider.createFriendRequestNotification).toHaveBeenCalledWith(request);

    const game = await app.inject({
      method: 'POST',
      url: '/lobby/games',
      payload: { mode: 'ranked', initialMs: 60_000, incrementMs: 1_000 },
    });
    expect(game.statusCode).toBe(201);
    expect(game.json().mode).toBe('ranked');

    const lobby = await app.inject({ method: 'GET', url: '/lobby' });
    expect(lobby.statusCode).toBe(200);
    expect(lobby.json().games).toHaveLength(1);
    expect(lobby.json().games[0].whitePlayerId).toBeUndefined();

    const invitation = await app.inject({
      method: 'POST',
      url: `/games/${game.json().code}/invitations`,
      payload: { username: 'bob' },
    });
    expect(invitation.statusCode).toBe(201);
    expect(notificationProvider.createGameInvitation).toHaveBeenCalledWith(
      'user-1',
      'bob',
      game.json().code,
    );

    expect((await app.inject({ method: 'GET', url: '/notifications' })).statusCode).toBe(200);
    expect(
      (await app.inject({ method: 'POST', url: '/notifications/notification-1/read' })).statusCode,
    ).toBe(200);
  });
});

function createAuthProvider(authenticatedUser: typeof user | undefined): AuthProvider {
  return {
    register: vi.fn(),
    login: vi.fn(),
    authenticate: vi.fn(async () => authenticatedUser),
    logout: vi.fn(),
  };
}

function createSocialProvider(): SocialProvider & {
  sendRequest: ReturnType<typeof vi.fn>;
} {
  return {
    searchUsers: vi.fn(async () => [bob]),
    getFriendsOverview: vi.fn(async () => overview),
    sendRequest: vi.fn(async () => request),
    respondToRequest: vi.fn(async () => request),
  };
}

function createNotificationProvider(): NotificationProvider & {
  createFriendRequestNotification: ReturnType<typeof vi.fn>;
  createGameInvitation: ReturnType<typeof vi.fn>;
} {
  return {
    list: vi.fn(async () => []),
    markRead: vi.fn(async () => ({
      id: 'notification-1',
      type: 'friend_request' as const,
      title: 'Neue Freundschaftsanfrage',
      message: 'alice möchte dich als Freund hinzufügen.',
      read: true,
      createdAt: '2026-09-11T10:00:00.000Z',
    })),
    createFriendRequestNotification: vi.fn(async () => undefined),
    createGameInvitation: vi.fn(async () => ({
      id: 'notification-2',
      type: 'game_invitation' as const,
      title: 'Einladung zu einer Partie',
      message: 'Du wurdest zu einer Partie eingeladen.',
      gameCode: 'ABC123',
      read: false,
      createdAt: '2026-09-11T10:00:00.000Z',
    })),
  };
}
