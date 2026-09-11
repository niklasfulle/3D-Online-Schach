import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthError, type AuthProvider, type AuthResult } from './auth/AuthService.js';
import { GameManager, type GamePersistence } from './game/GameManager.js';
import { buildApp } from './index.js';
import type { NotificationProvider } from './notifications/NotificationService.js';
import {
  SocialError,
  type FriendRequestView,
  type FriendsOverview,
  type SocialProvider,
  type SocialUser,
} from './social/SocialService.js';

const user = { id: 'user-1', username: 'alice', rating: 1200 };
const bob: SocialUser = { id: 'user-2', username: 'bob', rating: 1300, online: true };
const request: FriendRequestView = {
  id: 'request-1',
  status: 'pending',
  createdAt: '2026-09-11T12:00:00.000Z',
  sender: { ...user, online: true },
  receiver: bob,
};
const overview: FriendsOverview = {
  friends: [bob],
  incomingRequests: [],
  outgoingRequests: [request],
};

describe('server HTTP routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('serves authentication, health, and social routes', async () => {
    const authResult: AuthResult = { user, sessionToken: 'session-token' };
    const authProvider = createAuthProvider(user, authResult);
    const socialProvider = createSocialProvider();
    app = buildApp(new GameManager(), authProvider, socialProvider, createNotificationProvider());

    const register = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: 'alice', password: 'password123' },
    });
    expect(register.statusCode).toBe(200);
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice', password: 'password123' },
    });
    expect(login.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/auth/me' })).statusCode).toBe(200);

    const logout = await app.inject({ method: 'POST', url: '/auth/logout' });
    expect(logout.statusCode).toBe(200);
    expect(logout.headers['set-cookie']).toContain('Max-Age=0');

    expect((await app.inject({ method: 'GET', url: '/health' })).json()).toEqual({
      status: 'ok',
      service: 'chess3d-server',
    });
    expect((await app.inject({ method: 'GET', url: '/users/search?q=bo' })).json()).toEqual({
      users: [bob],
    });
    expect((await app.inject({ method: 'GET', url: '/friends' })).json()).toEqual(overview);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/friends/requests',
          payload: { username: 'bob' },
        })
      ).statusCode,
    ).toBe(201);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/friends/requests/request-1/accept',
        })
      ).statusCode,
    ).toBe(200);
    expect(authProvider.logout).toHaveBeenCalledWith(undefined);
  });

  it('maps authentication and social failures to API responses', async () => {
    const failingAuth = createAuthProvider(user, { user, sessionToken: 'session-token' });
    failingAuth.register = vi.fn(async () => {
      throw new AuthError('Registration rejected', 409);
    });
    failingAuth.login = vi.fn(async () => {
      throw new Error('database offline');
    });
    const socialProvider = createSocialProvider();
    socialProvider.searchUsers = vi.fn(async () => {
      throw new SocialError('Search failed', 422);
    });
    socialProvider.getFriendsOverview = vi.fn(async () => {
      throw new Error('social database offline');
    });
    socialProvider.sendRequest = vi.fn(async () => {
      throw new SocialError('Already friends', 409);
    });
    socialProvider.respondToRequest = vi.fn(async () => {
      throw new Error('request service offline');
    });
    app = buildApp(new GameManager(), failingAuth, socialProvider, createNotificationProvider());

    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/auth/register',
          payload: { username: 'alice', password: 'password123' },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/auth/login',
          payload: { username: 'alice', password: 'password123' },
        })
      ).statusCode,
    ).toBe(503);
    expect((await app.inject({ method: 'GET', url: '/users/search?q=bo' })).statusCode).toBe(422);
    expect((await app.inject({ method: 'GET', url: '/friends' })).statusCode).toBe(503);
    expect(
      (await app.inject({ method: 'POST', url: '/friends/requests', payload: {} })).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/friends/requests',
          payload: { username: 'bob' },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/friends/requests/request-1/reject',
        })
      ).statusCode,
    ).toBe(503);
  });

  it('handles lobby and legacy game endpoints', async () => {
    const manager = new GameManager();
    const authProvider = createAuthProvider(user);
    app = buildApp(manager, authProvider, createSocialProvider(), createNotificationProvider());

    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/lobby/games',
          payload: { mode: 'blitz' },
        })
      ).statusCode,
    ).toBe(400);
    const lobbyGame = await app.inject({
      method: 'POST',
      url: '/lobby/games',
      payload: { mode: 'casual', initialMs: 60_000, incrementMs: 500 },
    });
    expect(lobbyGame.statusCode).toBe(201);
    const game = lobbyGame.json() as { code: string };
    expect(lobbyGame.json().expiresAt).toEqual(expect.any(Number));
    expect((await app.inject({ method: 'GET', url: '/lobby' })).statusCode).toBe(200);
    authProvider.authenticate = vi.fn(async () => bob);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/lobby/games/${game.code}/join`,
          payload: {},
        })
      ).statusCode,
    ).toBe(200);

    expect((await app.inject({ method: 'POST', url: '/games', payload: {} })).statusCode).toBe(400);
    const legacyCreate = await app.inject({
      method: 'POST',
      url: '/games',
      payload: { playerId: 'alice' },
    });
    expect(legacyCreate.statusCode).toBe(201);
    const legacyGame = legacyCreate.json() as { code: string };
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/games/${legacyGame.code}/join`,
          payload: { playerId: 'bob' },
        })
      ).statusCode,
    ).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/games/${legacyGame.code}` })).statusCode).toBe(
      200,
    );
    expect((await app.inject({ method: 'GET', url: '/games/missing' })).statusCode).toBe(404);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/games/${legacyGame.code}/moves`,
          payload: {},
        })
      ).statusCode,
    ).toBe(400);
    const move = await app.inject({
      method: 'POST',
      url: `/games/${legacyGame.code}/moves`,
      payload: { playerId: 'alice', from: 'e2', to: 'e4' },
    });
    expect(move.statusCode).toBe(200);
    expect(move.json().move.san).toBe('e4');
  });

  it('returns history errors and persistence failures', async () => {
    const persistence: GamePersistence = {
      saveGame: vi.fn(async () => undefined),
      saveMove: vi.fn(async () => undefined),
      loadHistory: vi.fn(async () => {
        throw new Error('history store offline');
      }),
    };
    app = buildApp(
      new GameManager(undefined, persistence),
      createAuthProvider(user),
      createSocialProvider(),
      createNotificationProvider(),
    );

    expect((await app.inject({ method: 'GET', url: '/games/missing/history' })).statusCode).toBe(
      503,
    );
    expect((await app.inject({ method: 'GET', url: '/games/missing/pgn' })).statusCode).toBe(503);
  });

  it('serves an active game snapshot to authenticated spectators', async () => {
    const manager = new GameManager();
    const created = manager.createGame('player-a');
    manager.joinGame(created.code, 'player-b');
    const authProvider = createAuthProvider({ id: 'viewer', username: 'viewer', rating: 1200 });
    app = buildApp(manager, authProvider, createSocialProvider(), createNotificationProvider());

    const response = await app.inject({ method: 'GET', url: `/games/${created.code}/spectate` });

    expect(response.statusCode).toBe(200);
    expect(response.json().game.status).toBe('active');
    expect(response.json().moves).toEqual([]);

    const waiting = manager.createGame('player-c');
    expect(
      (await app.inject({ method: 'GET', url: `/games/${waiting.code}/spectate` })).statusCode,
    ).toBe(409);
  });
});

function createAuthProvider(
  authenticatedUser: typeof user | undefined,
  result: AuthResult = { user, sessionToken: 'session-token' },
): AuthProvider {
  return {
    register: vi.fn(async () => result),
    login: vi.fn(async () => result),
    authenticate: vi.fn(async () => authenticatedUser),
    logout: vi.fn(async () => undefined),
  };
}

function createSocialProvider(): SocialProvider {
  return {
    searchUsers: vi.fn(async () => [bob]),
    getFriendsOverview: vi.fn(async () => overview),
    sendRequest: vi.fn(async () => request),
    respondToRequest: vi.fn(async () => request),
  };
}

function createNotificationProvider(): NotificationProvider {
  return {
    list: vi.fn(async () => []),
    markRead: vi.fn(async () => ({
      id: 'notification-1',
      type: 'friend_request' as const,
      title: 'Neue Freundschaftsanfrage',
      message: 'alice möchte dich als Freund hinzufügen.',
      read: true,
      createdAt: '2026-09-11T12:00:00.000Z',
    })),
    createFriendRequestNotification: vi.fn(async () => undefined),
    createGameInvitation: vi.fn(async () => ({
      id: 'notification-2',
      type: 'game_invitation' as const,
      title: 'Einladung zu einer Partie',
      message: 'Du wurdest zu einer Partie eingeladen.',
      read: false,
      createdAt: '2026-09-11T12:00:00.000Z',
    })),
  };
}
