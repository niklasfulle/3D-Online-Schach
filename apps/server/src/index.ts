import { pathToFileURL } from 'node:url';

import cors from '@fastify/cors';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';

import type { Move } from '@chess3d/chess-core';
import type { GameMode } from '@chess3d/shared';

import {
  AuthError,
  PrismaAuthProvider,
  type AuthUser,
  type AuthProvider,
  type LoginInput,
  type RegisterInput,
} from './auth/AuthService.js';
import { readSessionToken, SESSION_COOKIE } from './auth/sessionCookie.js';
import { GameManager, GameTimeoutError } from './game/GameManager.js';
import { ChatError, PrismaChatProvider, type ChatProvider } from './chat/ChatService.js';
import { prisma } from './db/client.js';
import { PrismaGamePersistence } from './persistence/PrismaGamePersistence.js';
import { registerRealtime } from './realtime.js';
import {
  NotificationError,
  PrismaNotificationProvider,
  type NotificationProvider,
} from './notifications/NotificationService.js';
import { PrismaSocialProvider, SocialError, type SocialProvider } from './social/SocialService.js';

export function buildApp(
  gameManager = new GameManager(),
  authProvider: AuthProvider = new PrismaAuthProvider(prisma),
  socialProvider: SocialProvider = new PrismaSocialProvider(prisma),
  notificationProvider: NotificationProvider = new PrismaNotificationProvider(prisma),
  chatProvider: ChatProvider = new PrismaChatProvider(prisma),
): FastifyInstance {
  const app = Fastify({ logger: true });

  void app.register(cors, { origin: true, credentials: true });

  app.post<{ Body: RegisterInput }>('/auth/register', async (request, reply) => {
    try {
      const result = await authProvider.register(request.body ?? {});
      return sendSession(reply, result.sessionToken, result.user);
    } catch (error) {
      return sendAuthError(reply, error);
    }
  });

  app.post<{ Body: LoginInput }>('/auth/login', async (request, reply) => {
    try {
      const result = await authProvider.login(request.body ?? {});
      return sendSession(reply, result.sessionToken, result.user);
    } catch (error) {
      return sendAuthError(reply, error);
    }
  });

  app.post('/auth/logout', async (request, reply) => {
    await authProvider.logout(readSessionToken(request.headers.cookie));
    return reply.header('Set-Cookie', clearSessionCookie()).send({ ok: true });
  });

  app.get('/auth/me', async (request, reply) => {
    const user = await authProvider.authenticate(readSessionToken(request.headers.cookie));
    if (!user) return reply.code(401).send({ error: 'Authentication required' });
    return reply.send({ user });
  });

  app.get<{ Querystring: { q?: string } }>('/users/search', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;

    try {
      return reply.send({
        users: await socialProvider.searchUsers(user.id, request.query.q ?? ''),
      });
    } catch (error) {
      return sendSocialError(reply, error);
    }
  });

  app.get('/friends', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;

    try {
      return reply.send(await socialProvider.getFriendsOverview(user.id));
    } catch (error) {
      return sendSocialError(reply, error);
    }
  });

  app.post<{ Body: { username?: string } }>('/friends/requests', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;
    const username = request.body?.username?.trim();
    if (!username) return reply.code(400).send({ error: 'username is required' });

    try {
      const requestView = await socialProvider.sendRequest(user.id, username);
      await notificationProvider.createFriendRequestNotification(requestView);
      return reply.code(201).send(requestView);
    } catch (error) {
      return error instanceof NotificationError
        ? sendNotificationError(reply, error)
        : sendSocialError(reply, error);
    }
  });

  for (const [action, path] of [
    ['accept', '/friends/requests/:id/accept'],
    ['reject', '/friends/requests/:id/reject'],
    ['cancel', '/friends/requests/:id/cancel'],
  ] as const) {
    app.post<{ Params: { id: string } }>(path, async (request, reply) => {
      const user = await requireUser(request, reply, authProvider);
      if (!user) return;

      try {
        return reply.send(
          await socialProvider.respondToRequest(user.id, request.params.id, action),
        );
      } catch (error) {
        return sendSocialError(reply, error);
      }
    });
  }

  app.get('/notifications', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;

    try {
      return reply.send({ notifications: await notificationProvider.list(user.id) });
    } catch (error) {
      return sendNotificationError(reply, error);
    }
  });

  app.post<{ Params: { id: string } }>('/notifications/:id/read', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;

    try {
      return reply.send(await notificationProvider.markRead(user.id, request.params.id));
    } catch (error) {
      return sendNotificationError(reply, error);
    }
  });

  app.get('/lobby', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;
    return reply.send({
      games: gameManager.listWaitingGames().map((game) => toLobbyGame(game, user.id)),
    });
  });

  app.post<{
    Body: { initialMs?: number; incrementMs?: number; mode?: GameMode };
  }>('/lobby/games', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;
    const mode = request.body?.mode ?? 'casual';
    if (!isGameMode(mode)) return reply.code(400).send({ error: 'mode must be casual or ranked' });

    try {
      const game = gameManager.createGame(
        user.id,
        {
          initialMs: request.body?.initialMs ?? 5 * 60 * 1000,
          incrementMs: request.body?.incrementMs ?? 0,
        },
        mode,
      );
      await gameManager.flushPersistence();
      return reply.code(201).send(game);
    } catch (error) {
      return reply.code(503).send({
        error: error instanceof Error ? error.message : 'Unable to persist game',
      });
    }
  });

  app.post<{ Params: { code: string } }>('/lobby/games/:code/join', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;

    try {
      const game = gameManager.joinGame(request.params.code, user.id);
      await gameManager.flushPersistence();
      return reply.send(game);
    } catch (error) {
      return reply
        .code(400)
        .send({ error: error instanceof Error ? error.message : 'Unable to join game' });
    }
  });

  app.post<{ Params: { code: string }; Body: { username?: string } }>(
    '/games/:code/invitations',
    async (request, reply) => {
      const user = await requireUser(request, reply, authProvider);
      if (!user) return;
      const username = request.body?.username?.trim();
      if (!username) return reply.code(400).send({ error: 'username is required' });

      const game = gameManager.getGame(request.params.code);
      if (!game) return reply.code(404).send({ error: 'Game not found' });
      if (game.status !== 'waiting') return reply.code(409).send({ error: 'Game is not waiting' });
      if (game.whitePlayerId !== user.id)
        return reply.code(403).send({ error: 'Only the owner can invite players' });

      try {
        return reply
          .code(201)
          .send(await notificationProvider.createGameInvitation(user.id, username, game.code));
      } catch (error) {
        return sendNotificationError(reply, error);
      }
    },
  );

  app.get<{ Params: { code: string } }>('/games/:code/chat', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;
    const game = gameManager.getGame(request.params.code);
    if (!game) return reply.code(404).send({ error: 'Game not found' });
    if (game.whitePlayerId !== user.id && game.blackPlayerId !== user.id) {
      return reply.code(403).send({ error: 'Only game participants can read the chat' });
    }

    try {
      return reply.send({ messages: await chatProvider.list(game.id) });
    } catch (error) {
      return sendChatError(reply, error);
    }
  });

  app.post<{ Params: { code: string }; Body: { message?: string } }>(
    '/games/:code/chat',
    async (request, reply) => {
      const user = await requireUser(request, reply, authProvider);
      if (!user) return;
      const game = gameManager.getGame(request.params.code);
      if (!game) return reply.code(404).send({ error: 'Game not found' });
      if (game.whitePlayerId !== user.id && game.blackPlayerId !== user.id) {
        return reply.code(403).send({ error: 'Only game participants can write in the chat' });
      }

      try {
        return reply
          .code(201)
          .send(await chatProvider.send(game.id, user.id, request.body?.message ?? ''));
      } catch (error) {
        return sendChatError(reply, error);
      }
    },
  );

  app.get<{ Params: { code: string } }>('/games/:code/spectate', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;
    const game = gameManager.getGame(request.params.code);
    if (!game) return reply.code(404).send({ error: 'Game not found' });

    try {
      return reply.send(gameManager.getGameSyncForViewer(request.params.code, user.id, true));
    } catch (error) {
      return reply.code(409).send({
        error: error instanceof Error ? error.message : 'Game is not ready for spectators',
      });
    }
  });

  app.get('/health', async () => ({ status: 'ok', service: 'chess3d-server' }));

  app.post<{
    Body: { playerId?: string; initialMs?: number; incrementMs?: number };
  }>('/games', async (request, reply) => {
    const playerId = request.body?.playerId;
    if (!playerId) return reply.code(400).send({ error: 'playerId is required' });

    try {
      const game = gameManager.createGame(playerId, {
        initialMs: request.body.initialMs ?? 5 * 60 * 1000,
        incrementMs: request.body.incrementMs ?? 0,
      });
      await gameManager.flushPersistence();
      return reply.code(201).send(game);
    } catch (error) {
      return reply.code(503).send({
        error: error instanceof Error ? error.message : 'Unable to persist game',
      });
    }
  });

  app.post<{ Params: { code: string }; Body: { playerId?: string } }>(
    '/games/:code/join',
    async (request, reply) => {
      const playerId = request.body?.playerId;
      if (!playerId) return reply.code(400).send({ error: 'playerId is required' });

      try {
        const game = gameManager.joinGame(request.params.code, playerId);
        await gameManager.flushPersistence();
        return reply.send(game);
      } catch (error) {
        return reply
          .code(400)
          .send({ error: error instanceof Error ? error.message : 'Unable to join game' });
      }
    },
  );

  app.get<{ Params: { code: string } }>('/games/:code', async (request, reply) => {
    const game = gameManager.getGame(request.params.code);
    if (!game) return reply.code(404).send({ error: 'Game not found' });
    await gameManager.flushPersistence();
    return reply.send(game);
  });

  app.get<{ Params: { code: string } }>('/games/:code/history', async (request, reply) => {
    try {
      const history = await gameManager.getGameHistory(request.params.code);
      if (!history) return reply.code(404).send({ error: 'Game history not found' });
      return reply.send(history);
    } catch (error) {
      return reply.code(503).send({
        error: error instanceof Error ? error.message : 'Unable to load game history',
      });
    }
  });

  app.get<{ Params: { code: string } }>('/games/:code/pgn', async (request, reply) => {
    try {
      const history = await gameManager.getGameHistory(request.params.code);
      if (!history) return reply.code(404).send({ error: 'Game history not found' });
      return reply
        .type('application/x-chess-pgn')
        .header('Content-Disposition', `attachment; filename="game-${history.game.code}.pgn"`)
        .send(history.pgn);
    } catch (error) {
      return reply.code(503).send({
        error: error instanceof Error ? error.message : 'Unable to export PGN',
      });
    }
  });

  app.post<{
    Params: { code: string };
    Body: Move & { playerId?: string };
  }>('/games/:code/moves', async (request, reply) => {
    const { playerId, from, to, promotion } = request.body ?? {};
    if (!playerId || !from || !to)
      return reply.code(400).send({ error: 'playerId, from and to are required' });

    try {
      const accepted = await gameManager.requestMoveQueued(request.params.code, playerId, {
        from,
        to,
        promotion,
      });
      await gameManager.flushPersistence();
      return reply.send(accepted);
    } catch (error) {
      if (error instanceof GameTimeoutError) {
        return reply
          .code(409)
          .send({ error: error.message, game: error.game, result: error.result });
      }
      return reply
        .code(400)
        .send({ error: error instanceof Error ? error.message : 'Unable to play move' });
    }
  });

  return app;
}

function sendSession(reply: FastifyReply, sessionToken: string, user: unknown) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return reply
    .header(
      'Set-Cookie',
      `${SESSION_COOKIE}=${sessionToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000${secure}`,
    )
    .send({ user });
}

function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

function sendAuthError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError)
    return reply.code(error.statusCode).send({ error: error.message });
  return reply.code(503).send({ error: 'Authentication service unavailable' });
}

async function requireUser(
  request: FastifyRequest,
  reply: FastifyReply,
  authProvider: AuthProvider,
): Promise<AuthUser | undefined> {
  const user = await authProvider.authenticate(readSessionToken(request.headers.cookie));
  if (!user) {
    reply.code(401).send({ error: 'Authentication required' });
    return undefined;
  }
  return user;
}

function sendSocialError(reply: FastifyReply, error: unknown) {
  if (error instanceof SocialError)
    return reply.code(error.statusCode).send({ error: error.message });
  return reply.code(503).send({ error: 'Social service unavailable' });
}

function isGameMode(value: string): value is GameMode {
  return value === 'casual' || value === 'ranked';
}

function toLobbyGame(
  game: ReturnType<GameManager['listWaitingGames']>[number],
  currentUserId: string,
) {
  return {
    id: game.id,
    code: game.code,
    mode: game.mode ?? 'casual',
    status: game.status,
    timeControl: game.timeControl,
    whiteRemainingMs: game.whiteRemainingMs,
    isOwner: game.whitePlayerId === currentUserId,
  };
}

async function start() {
  const gameManager = new GameManager(undefined, new PrismaGamePersistence(prisma));
  const authProvider = new PrismaAuthProvider(prisma);
  const app = buildApp(gameManager, authProvider);
  const realtime = registerRealtime(app, gameManager, authProvider);
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '127.0.0.1';

  try {
    await app.listen({ host, port });
  } catch (error) {
    app.log.error(error);
    realtime.close();
    process.exit(1);
  }
}

function sendNotificationError(reply: FastifyReply, error: unknown) {
  if (error instanceof NotificationError)
    return reply.code(error.statusCode).send({ error: error.message });
  return reply.code(503).send({ error: 'Notification service unavailable' });
}

function sendChatError(reply: FastifyReply, error: unknown) {
  if (error instanceof ChatError)
    return reply.code(error.statusCode).send({ error: error.message });
  return reply.code(503).send({ error: 'Chat service unavailable' });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await start();
}
