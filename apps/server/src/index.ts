import { pathToFileURL } from 'node:url';

import cors from '@fastify/cors';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';

import type { Move } from '@chess3d/chess-core';
import { APP_VERSION, type GameMode, type UserRole } from '@chess3d/shared';

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
import { ComputerGameService } from './engine/ComputerGameService.js';
import { StockfishEngine, stockfishEngineOptionsFromEnv } from './engine/StockfishEngine.js';
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
import { AdminError, PrismaAdminProvider, type AdminProvider } from './admin/AdminService.js';
import { ExpiredGamesWorker } from './workers/ExpiredGamesWorker.js';
import {
  DEFAULT_HISTORY_LIMIT,
  HistoryError,
  MAX_HISTORY_LIMIT,
  PrismaHistoryProvider,
  type HistoryProvider,
} from './history/HistoryService.js';
import { PrismaProfileProvider, type ProfileProvider } from './profile/ProfileService.js';
import {
  DEFAULT_LEADERBOARD_PAGE_SIZE,
  MAX_LEADERBOARD_PAGE_SIZE,
  PrismaRatingService,
} from './rating/RatingService.js';

type LeaderboardQuery = { page?: string; pageSize?: string };
type ProfileQuery = { seasonId?: string };

type BuildAppOptions = Partial<{
  authProvider: AuthProvider;
  socialProvider: SocialProvider;
  notificationProvider: NotificationProvider;
  chatProvider: ChatProvider;
  adminProvider: AdminProvider;
  historyProvider: HistoryProvider;
  profileProvider: ProfileProvider;
  ratingProvider: PrismaRatingService;
  computerGameService: ComputerGameService;
}>;

type LegacyProviderArgs = [
  SocialProvider?,
  NotificationProvider?,
  ChatProvider?,
  AdminProvider?,
  HistoryProvider?,
  ProfileProvider?,
];

function isAuthProvider(value: AuthProvider | BuildAppOptions): value is AuthProvider {
  return 'login' in value && 'register' in value;
}

function legacyProviderOptions([
  socialProvider,
  notificationProvider,
  chatProvider,
  adminProvider,
  historyProvider,
  profileProvider,
]: LegacyProviderArgs): BuildAppOptions {
  return {
    socialProvider,
    notificationProvider,
    chatProvider,
    adminProvider,
    historyProvider,
    profileProvider,
  };
}

export function buildApp(
  gameManager = new GameManager(),
  providersOrAuth: AuthProvider | BuildAppOptions = {},
  ...legacyProviders: LegacyProviderArgs
): FastifyInstance {
  const options = isAuthProvider(providersOrAuth)
    ? { authProvider: providersOrAuth, ...legacyProviderOptions(legacyProviders) }
    : providersOrAuth;
  const authProvider = options.authProvider ?? new PrismaAuthProvider(prisma);
  const socialProvider = options.socialProvider ?? new PrismaSocialProvider(prisma);
  const notificationProvider =
    options.notificationProvider ?? new PrismaNotificationProvider(prisma);
  const chatProvider = options.chatProvider ?? new PrismaChatProvider(prisma);
  const adminProvider = options.adminProvider ?? new PrismaAdminProvider(prisma);
  const historyProvider = options.historyProvider ?? new PrismaHistoryProvider(prisma);
  const profileProvider = options.profileProvider ?? new PrismaProfileProvider(prisma);
  const ratingProvider = options.ratingProvider ?? new PrismaRatingService(prisma);
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

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

  app.get('/admin/users', async (request, reply) => {
    const user = await requireAdmin(request, reply, authProvider);
    if (!user) return;

    try {
      return reply.send({ users: await adminProvider.listUsers() });
    } catch (error) {
      return sendAdminError(reply, error);
    }
  });

  app.patch<{ Params: { id: string }; Body: { role?: UserRole } }>(
    '/admin/users/:id/role',
    async (request, reply) => {
      const user = await requireAdmin(request, reply, authProvider);
      if (!user) return;
      if (!isUserRole(request.body?.role)) {
        return reply.code(400).send({ error: 'role must be user, admin or spectator' });
      }
      if (request.params.id === user.id && request.body.role !== 'admin') {
        return reply.code(409).send({ error: 'You cannot remove your own admin role' });
      }

      try {
        const updatedUser = await adminProvider.updateRole(request.params.id, request.body.role);
        if (!updatedUser) return reply.code(404).send({ error: 'User not found' });
        return reply.send({ user: updatedUser });
      } catch (error) {
        return sendAdminError(reply, error);
      }
    },
  );

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

  app.get<{ Params: { id: string } }>('/users/:id/profile', async (request, reply) => {
    try {
      const profile = await profileProvider.getForUser(request.params.id);
      if (!profile) return reply.code(404).send({ error: 'Profile not found' });
      return reply.send(profile);
    } catch (error) {
      return reply.code(503).send({
        error: error instanceof Error ? error.message : 'Unable to load public profile',
      });
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

  app.get('/games/correspondence', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;
    return reply.send({ games: gameManager.listCorrespondenceGames(user.id) });
  });

  app.get<{ Querystring: ProfileQuery }>('/profile', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;

    try {
      const profile = await profileProvider.getForUser(user.id, request.query.seasonId);
      if (!profile) return reply.code(404).send({ error: 'Profile not found' });
      return reply.send(profile);
    } catch (error) {
      return reply.code(503).send({
        error: error instanceof Error ? error.message : 'Unable to load profile',
      });
    }
  });

  app.get<{ Querystring: LeaderboardQuery }>('/leaderboard', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;
    try {
      const query = parseLeaderboardQuery(request.query, reply);
      if (!query) return;
      return reply.send(
        await ratingProvider.getCurrentLeaderboard(undefined, query.page, query.pageSize, user.id),
      );
    } catch (error) {
      return reply.code(503).send({
        error: error instanceof Error ? error.message : 'Unable to load leaderboard',
      });
    }
  });

  app.get('/leaderboard/seasons', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;
    try {
      return reply.send({ seasons: await ratingProvider.listSeasons() });
    } catch (error) {
      return reply.code(503).send({
        error: error instanceof Error ? error.message : 'Unable to load season archive',
      });
    }
  });

  app.get<{ Params: { id: string }; Querystring: LeaderboardQuery }>(
    '/leaderboard/seasons/:id',
    async (request, reply) => {
      const user = await requireUser(request, reply, authProvider);
      if (!user) return;
      try {
        const query = parseLeaderboardQuery(request.query, reply);
        if (!query) return;
        const result = await ratingProvider.getSeasonLeaderboard(
          request.params.id,
          query.page,
          query.pageSize,
          user.id,
        );
        if (!result) return reply.code(404).send({ error: 'Season not found' });
        return reply.send(result);
      } catch (error) {
        return reply.code(503).send({
          error: error instanceof Error ? error.message : 'Unable to load season leaderboard',
        });
      }
    },
  );

  app.delete<{ Params: { code: string } }>('/lobby/games/:code', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;

    const game = gameManager.getGame(request.params.code);
    if (!game) return reply.code(404).send({ error: 'Game not found' });
    if (game.status !== 'waiting') return reply.code(409).send({ error: 'Game is not waiting' });
    if (game.whitePlayerId !== user.id) {
      return reply.code(403).send({ error: 'Only the owner can delete this game' });
    }

    if (!gameManager.deleteWaitingGame(request.params.code)) {
      return reply.code(404).send({ error: 'Game not found' });
    }

    try {
      await gameManager.flushPersistence();
      return reply.send({ ok: true });
    } catch (error) {
      return reply.code(503).send({
        error: error instanceof Error ? error.message : 'Unable to delete game',
      });
    }
  });

  app.post<{
    Body: { initialMs?: number; incrementMs?: number; mode?: GameMode };
  }>('/lobby/games', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;
    const mode = request.body?.mode ?? 'casual';
    if (!isGameMode(mode)) {
      return reply.code(400).send({ error: 'mode must be casual, ranked or correspondence' });
    }

    try {
      const game = gameManager.createGame(
        user.id,
        {
          initialMs: request.body?.initialMs ?? 15 * 60 * 1000,
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

  app.post<{ Body: { engineLevel?: number } }>('/games/ai', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;
    const engineLevel = request.body?.engineLevel;
    if (!Number.isInteger(engineLevel) || engineLevel === undefined || engineLevel < 0 || engineLevel > 20) {
      return reply.code(400).send({ error: 'engineLevel must be an integer between 0 and 20' });
    }

    try {
      const game = gameManager.createAiGame(user.id, engineLevel);
      await gameManager.flushPersistence();
      return reply.code(201).send(game);
    } catch (error) {
      return reply.code(503).send({
        error: error instanceof Error ? error.message : 'Unable to create Stockfish game',
      });
    }
  });

  app.post<{ Params: { code: string } }>('/lobby/games/:code/join', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;

    const waitingGame = gameManager.getGame(request.params.code);
    if (!waitingGame) return reply.code(404).send({ error: 'Game not found' });
    if (waitingGame.mode === 'correspondence' && waitingGame.whitePlayerId !== user.id) {
      const invitations = await notificationProvider.list(user.id);
      const hasInvitation = invitations.some(
        (notification) =>
          notification.type === 'game_invitation' && notification.gameCode === waitingGame.code,
      );
      if (!hasInvitation) {
        return reply.code(403).send({ error: 'Fernpartien sind nur per Einladung zugänglich' });
      }
    }

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

      if (game.mode === 'correspondence') {
        const friends = await socialProvider.getFriendsOverview(user.id);
        const invitedFriend = friends.friends.some(
          (friend) => friend.username.toLowerCase() === username.toLowerCase(),
        );
        if (!invitedFriend) {
          return reply.code(403).send({ error: 'Fernpartien können nur an Freunde gehen' });
        }
      }

      try {
        return reply
          .code(201)
          .send(await notificationProvider.createGameInvitation(user.id, username, game.code));
      } catch (error) {
        return sendNotificationError(reply, error);
      }
    },
  );

  app.post<{ Params: { code: string }; Body: { username?: string } }>(
    '/games/:code/spectator-invitations',
    async (request, reply) => {
      const user = await requireUser(request, reply, authProvider);
      if (!user) return;
      const username = request.body?.username?.trim();
      if (!username) return reply.code(400).send({ error: 'username is required' });

      const game = gameManager.getGame(request.params.code);
      if (!game) return reply.code(404).send({ error: 'Game not found' });
      if (game.status !== 'active') {
        return reply.code(409).send({ error: 'Only active games can invite spectators' });
      }
      if (game.whitePlayerId !== user.id && game.blackPlayerId !== user.id) {
        return reply.code(403).send({ error: 'Only game participants can invite spectators' });
      }

      try {
        return reply
          .code(201)
          .send(await notificationProvider.createSpectatorInvitation(user.id, username, game.code));
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
    const user = await authProvider.authenticate(readSessionToken(request.headers.cookie));
    const game = gameManager.getGame(request.params.code);
    if (!game) return reply.code(404).send({ error: 'Game not found' });

    try {
      return reply.send(
        gameManager.getGameSyncForViewer(request.params.code, user?.id ?? 'guest-spectator', true),
      );
    } catch (error) {
      return reply.code(409).send({
        error: error instanceof Error ? error.message : 'Game is not ready for spectators',
      });
    }
  });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'chess3d-server',
    version: APP_VERSION,
  }));

  app.post<{
    Body: { playerId?: string; initialMs?: number; incrementMs?: number };
  }>('/games', async (request, reply) => {
    const playerId = request.body?.playerId;
    if (!playerId) return reply.code(400).send({ error: 'playerId is required' });

    try {
      const game = gameManager.createGame(playerId, {
        initialMs: request.body.initialMs ?? 15 * 60 * 1000,
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

  app.get<{ Querystring: { limit?: string; cursor?: string } }>(
    '/games/history',
    async (request, reply) => {
      const user = await requireUser(request, reply, authProvider);
      if (!user) return;

      const limit = parseHistoryLimit(request.query.limit);
      if (limit === undefined) {
        return reply
          .code(400)
          .send({ error: `limit must be an integer between 1 and ${MAX_HISTORY_LIMIT}` });
      }

      try {
        return reply.send(
          await historyProvider.listForUser(user.id, {
            limit,
            cursor: request.query.cursor,
          }),
        );
      } catch (error) {
        if (error instanceof HistoryError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        return reply.code(503).send({ error: 'History service unavailable' });
      }
    },
  );

  app.get<{ Params: { code: string } }>('/games/:code/replay', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;
    if (!historyProvider.getReplayForUser) {
      return reply.code(503).send({ error: 'Replay service unavailable' });
    }

    try {
      const replay = await historyProvider.getReplayForUser(user.id, request.params.code);
      if (!replay) return reply.code(404).send({ error: 'Replay not found' });
      return reply.send(replay);
    } catch {
      return reply.code(503).send({ error: 'Replay service unavailable' });
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

  app.post<{ Params: { code: string } }>('/games/:code/resign', async (request, reply) => {
    const user = await requireUser(request, reply, authProvider);
    if (!user) return;

    const game = gameManager.getGame(request.params.code);
    if (!game) return reply.code(404).send({ error: 'Game not found' });
    if (game.whitePlayerId !== user.id && game.blackPlayerId !== user.id) {
      return reply.code(403).send({ error: 'Only game participants can resign' });
    }

    try {
      const resigned = gameManager.resignGame(request.params.code, user.id);
      await gameManager.flushPersistence();
      return reply.send({ game: resigned });
    } catch (error) {
      return reply
        .code(error instanceof Error && error.message === 'Game is not active' ? 409 : 400)
        .send({ error: error instanceof Error ? error.message : 'Unable to resign game' });
    }
  });

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
      gameManager.publishMoveAccepted(accepted);
      if (options.computerGameService && accepted.game.opponentType === 'stockfish') {
        try {
          await options.computerGameService.playEngineTurn(accepted.game.code);
        } catch (error) {
          request.log.error(
            { err: error, gameCode: accepted.game.code },
            'Stockfish turn failed after the player move was accepted',
          );
        }
      }
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

async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  authProvider: AuthProvider,
): Promise<AuthUser | undefined> {
  const user = await requireUser(request, reply, authProvider);
  if (!user) return undefined;
  if (user.role !== 'admin') {
    reply.code(403).send({ error: 'Admin role required' });
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
  return value === 'casual' || value === 'ranked' || value === 'correspondence';
}

function parseHistoryLimit(value: string | undefined): number | undefined {
  if (value === undefined) return DEFAULT_HISTORY_LIMIT;
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= 1 && limit <= MAX_HISTORY_LIMIT ? limit : undefined;
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
    expiresAt: game.expiresAt,
    isOwner: game.whitePlayerId === currentUserId,
  };
}

function parseLeaderboardQuery(
  query: LeaderboardQuery,
  reply: FastifyReply,
): { page: number; pageSize: number } | undefined {
  const page = query.page === undefined ? 1 : Number(query.page);
  const pageSize =
    query.pageSize === undefined ? DEFAULT_LEADERBOARD_PAGE_SIZE : Number(query.pageSize);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > MAX_LEADERBOARD_PAGE_SIZE
  ) {
    void reply.code(400).send({ error: 'Invalid leaderboard pagination' });
    return undefined;
  }
  return { page, pageSize };
}

async function start() {
  const ratingProvider = new PrismaRatingService(prisma);
  const gameManager = new GameManager(undefined, new PrismaGamePersistence(prisma, ratingProvider));
  const computerGameService = new ComputerGameService(
    gameManager,
    new StockfishEngine(stockfishEngineOptionsFromEnv(process.env)),
  );
  const authProvider = new PrismaAuthProvider(prisma);
  const app = buildApp(gameManager, { authProvider, ratingProvider, computerGameService });
  const realtime = registerRealtime(
    app,
    gameManager,
    authProvider,
    undefined,
    new PrismaNotificationProvider(prisma),
    computerGameService,
  );
  const expiredGamesWorker = new ExpiredGamesWorker(gameManager, {
    onError: (error) => app.log.error(error, 'Expired game cleanup failed'),
  });
  app.addHook('onClose', async () => {
    expiredGamesWorker.stop();
    await computerGameService.close();
  });
  expiredGamesWorker.start();
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '127.0.0.1';

  try {
    await app.listen({ host, port });
  } catch (error) {
    app.log.error(error);
    expiredGamesWorker.stop();
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

function sendAdminError(reply: FastifyReply, error: unknown) {
  if (error instanceof AdminError)
    return reply.code(error.statusCode).send({ error: error.message });
  return reply.code(503).send({ error: 'Admin service unavailable' });
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'user' || value === 'admin' || value === 'spectator';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await start();
}
