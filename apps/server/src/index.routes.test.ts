import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthError, type AuthProvider, type AuthResult } from './auth/AuthService.js';
import type { AdminProvider } from './admin/AdminService.js';
import { GameManager, type GamePersistence } from './game/GameManager.js';
import type { HistoryPage, HistoryProvider } from './history/HistoryService.js';
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

  it('protects and paginates the personal game history route', async () => {
    const historyPage: HistoryPage = {
      games: [
        {
          id: 'game-1',
          code: 'ABC123',
          mode: 'ranked',
          result: 'white',
          createdAt: '2026-09-11T09:00:00.000Z',
          finishedAt: '2026-09-11T12:00:00.000Z',
          whitePlayer: { id: user.id, username: user.username },
          blackPlayer: { id: bob.id, username: bob.username },
          moves: [],
        },
      ],
      nextCursor: 'next-page',
    };
    const historyProvider: HistoryProvider = {
      listForUser: vi.fn(async () => historyPage),
    };
    const authProvider = createAuthProvider(undefined);
    app = buildApp(
      new GameManager(),
      authProvider,
      createSocialProvider(),
      createNotificationProvider(),
      undefined,
      undefined,
      historyProvider,
    );

    expect((await app.inject({ method: 'GET', url: '/games/history' })).statusCode).toBe(401);

    authProvider.authenticate = vi.fn(async () => user);
    const response = await app.inject({
      method: 'GET',
      url: '/games/history?limit=1&cursor=next-page',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(historyPage);
    expect(historyProvider.listForUser).toHaveBeenCalledWith(user.id, {
      limit: 1,
      cursor: 'next-page',
    });

    expect((await app.inject({ method: 'GET', url: '/games/history?limit=0' })).statusCode).toBe(
      400,
    );
  });

  it('protects admin user management and prevents self-demotion', async () => {
    const admin = { ...user, id: 'admin-1', role: 'admin' as const };
    const adminProvider: AdminProvider = {
      listUsers: vi.fn(async () => [
        { id: user.id, username: user.username, rating: user.rating, role: 'user' as const },
      ]),
      updateRole: vi.fn(async (id, role) => ({
        id,
        username: 'bob',
        rating: 1200,
        role,
      })),
    };
    const authProvider = createAuthProvider(user);
    app = buildApp(
      new GameManager(),
      authProvider,
      createSocialProvider(),
      createNotificationProvider(),
      undefined,
      adminProvider,
    );

    expect((await app.inject({ method: 'GET', url: '/admin/users' })).statusCode).toBe(403);

    authProvider.authenticate = vi.fn(async () => admin);
    expect((await app.inject({ method: 'GET', url: '/admin/users' })).json()).toEqual({
      users: [{ id: user.id, username: user.username, rating: user.rating, role: 'user' }],
    });
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/admin/users/${admin.id}/role`,
          payload: { role: 'user' },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/admin/users/user-2/role',
          payload: { role: 'moderator' },
        })
      ).statusCode,
    ).toBe(400);

    const update = await app.inject({
      method: 'PATCH',
      url: '/admin/users/user-2/role',
      payload: { role: 'spectator' },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().user).toMatchObject({ id: 'user-2', role: 'spectator' });
    expect(adminProvider.updateRole).toHaveBeenCalledWith('user-2', 'spectator');
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

  it('allows only the owner to delete a waiting lobby game', async () => {
    const deleteGame = vi.fn(async () => undefined);
    const manager = new GameManager(undefined, {
      saveGame: vi.fn(async () => undefined),
      saveMove: vi.fn(async () => undefined),
      deleteGame,
    });
    const authProvider = createAuthProvider(user);
    app = buildApp(manager, authProvider, createSocialProvider(), createNotificationProvider());
    const created = manager.createGame(user.id);
    await manager.flushPersistence();

    authProvider.authenticate = vi.fn(async () => bob);
    expect(
      (await app.inject({ method: 'DELETE', url: `/lobby/games/${created.code}` })).statusCode,
    ).toBe(403);
    expect(manager.getGame(created.code)).toBeDefined();

    authProvider.authenticate = vi.fn(async () => user);
    const deleted = await app.inject({
      method: 'DELETE',
      url: `/lobby/games/${created.code}`,
    });
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json()).toEqual({ ok: true });
    expect(deleteGame).toHaveBeenCalledWith(expect.objectContaining({ code: created.code }));
    expect(manager.getGame(created.code)).toBeUndefined();
  });

  it('allows only an active participant to resign a game', async () => {
    const manager = new GameManager();
    const created = manager.createGame(user.id);
    manager.joinGame(created.code, bob.id);
    const authProvider = createAuthProvider(bob);
    app = buildApp(manager, authProvider, createSocialProvider(), createNotificationProvider());

    authProvider.authenticate = vi.fn(async () => ({ ...user, id: 'intruder' }));
    expect(
      (await app.inject({ method: 'POST', url: `/games/${created.code}/resign` })).statusCode,
    ).toBe(403);

    authProvider.authenticate = vi.fn(async () => user);
    const response = await app.inject({
      method: 'POST',
      url: `/games/${created.code}/resign`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().game).toMatchObject({ status: 'finished', result: 'black' });
    expect(manager.getGame(created.code)).toMatchObject({ status: 'finished', result: 'black' });
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

  it('serves an active game snapshot to guests without authentication', async () => {
    const manager = new GameManager();
    const created = manager.createGame('player-a');
    manager.joinGame(created.code, 'player-b');
    const authProvider = createAuthProvider(undefined);
    app = buildApp(manager, authProvider, createSocialProvider(), createNotificationProvider());

    const response = await app.inject({ method: 'GET', url: `/games/${created.code}/spectate` });

    expect(response.statusCode).toBe(200);
    expect(response.json().game.status).toBe('active');
  });

  it('lets active game participants invite a user as a spectator', async () => {
    const manager = new GameManager();
    const created = manager.createGame(user.id);
    manager.joinGame(created.code, bob.id);
    const authProvider = createAuthProvider(user);
    const notifications = createNotificationProvider();
    app = buildApp(manager, authProvider, createSocialProvider(), notifications);

    const response = await app.inject({
      method: 'POST',
      url: `/games/${created.code}/spectator-invitations`,
      payload: { username: 'bob' },
    });

    expect(response.statusCode).toBe(201);
    expect(notifications.createSpectatorInvitation).toHaveBeenCalledWith(
      user.id,
      'bob',
      created.code,
    );

    authProvider.authenticate = vi.fn(async () => ({ ...user, id: 'viewer' }));
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/games/${created.code}/spectator-invitations`,
          payload: { username: 'bob' },
        })
      ).statusCode,
    ).toBe(403);
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
    createSpectatorInvitation: vi.fn(async () => ({
      id: 'notification-3',
      type: 'spectator_invitation' as const,
      title: 'Einladung zum Zuschauen',
      message: 'Du wurdest eingeladen, eine Partie zu beobachten.',
      gameCode: 'ABC123',
      read: false,
      createdAt: '2026-09-11T12:00:00.000Z',
    })),
  };
}
