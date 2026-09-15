import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';

import type { Move } from '@chess3d/chess-core';

import { GameTimeoutError, type GameManager } from './game/GameManager.js';
import type { AuthProvider } from './auth/AuthService.js';
import { readSessionToken } from './auth/sessionCookie.js';
import { PrismaChatProvider, type ChatProvider } from './chat/ChatService.js';
import { prisma } from './db/client.js';
import type { NotificationProvider } from './notifications/NotificationService.js';
import type { ComputerGameService } from './engine/ComputerGameService.js';

interface JoinPayload {
  code?: string;
}

interface SyncPayload {
  code?: string;
}

interface MovePayload extends Move {
  code?: string;
}

interface ChatPayload {
  code?: string;
  message?: string;
}

interface SpectatePayload {
  code?: string;
}

export function registerRealtime(
  app: FastifyInstance,
  gameManager: GameManager,
  authProvider?: AuthProvider,
  chatProvider: ChatProvider = new PrismaChatProvider(prisma),
  notificationProvider?: NotificationProvider,
  computerGameService?: ComputerGameService,
): Server {
  const io = new Server(app.server, { cors: { origin: true, credentials: true } });
  const unsubscribeMoveAccepted = gameManager.onMoveAccepted((accepted) => {
    io.to(accepted.game.code).emit('move:accepted', accepted);
  });
  app.addHook('onClose', async () => {
    unsubscribeMoveAccepted();
  });
  gameManager.onGameUpdate((game) => {
    io.to(game.code).emit('game:updated', game);
  });
  gameManager.onGameEnded((game, result) => {
    io.to(game.code).emit('game:ended', { gameId: game.id, result });
  });
  gameManager.onGameRemoved((game) => {
    io.emit('game:removed', { code: game.code });
  });

  io.use(async (socket, next) => {
    const legacyPlayerId =
      typeof socket.handshake.auth.playerId === 'string'
        ? socket.handshake.auth.playerId
        : undefined;
    const user = authProvider
      ? await authProvider.authenticate(readSessionToken(socket.handshake.headers.cookie))
      : undefined;
    const playerId = user?.id ?? legacyPlayerId;
    const guestSpectator = socket.handshake.auth.spectator === true;
    if (!playerId && !guestSpectator) {
      next(new Error('Authentication required'));
      return;
    }
    socket.data.playerId = playerId;
    socket.data.guestSpectator = guestSpectator;
    next();
  });

  io.on('connection', (socket) => {
    const playerId = socket.data.playerId as string;
    const guestSpectator = socket.data.guestSpectator === true;

    socket.on('game:create', async () => {
      if (guestSpectator) {
        socket.emit('game:error', { error: 'Authentication required' });
        return;
      }
      try {
        const game = gameManager.createGame(playerId);
        await gameManager.flushPersistence();
        await socket.join(game.code);
        socket.emit('game:created', game);
      } catch (error) {
        socket.emit('game:error', {
          error: error instanceof Error ? error.message : 'Unable to create game',
        });
      }
    });

    socket.on('game:join', async (payload: JoinPayload) => {
      if (guestSpectator) {
        socket.emit('game:error', { error: 'Authentication required' });
        return;
      }
      if (!payload.code) {
        socket.emit('game:error', { error: 'code is required' });
        return;
      }

      try {
        const game = gameManager.joinGame(payload.code, playerId);
        await gameManager.flushPersistence();
        await socket.join(game.code);
        io.to(game.code).emit('game:started', game);
      } catch (error) {
        socket.emit('game:error', {
          error: error instanceof Error ? error.message : 'Unable to join game',
        });
      }
    });

    socket.on('game:sync', async (payload: SyncPayload) => {
      if (guestSpectator) {
        socket.emit('game:error', { error: 'Authentication required' });
        return;
      }
      if (!payload.code) {
        socket.emit('game:error', { error: 'code is required' });
        return;
      }

      try {
        const sync = gameManager.getGameSync(payload.code, playerId);
        await gameManager.flushPersistence();
        await socket.join(payload.code.toUpperCase());
        socket.emit('game:state', sync);
        if (computerGameService && sync.game.opponentType === 'stockfish') {
          await playPendingEngineTurn(computerGameService, payload.code, socket);
        }
      } catch (error) {
        socket.emit('game:error', {
          error: error instanceof Error ? error.message : 'Unable to sync game',
        });
      }
    });

    socket.on('game:spectate', async (payload: SpectatePayload) => {
      if (!payload.code) {
        socket.emit('game:error', { error: 'code is required' });
        return;
      }

      try {
        const sync = gameManager.getGameSyncForViewer(payload.code, playerId, true);
        await socket.join(payload.code.toUpperCase());
        socket.emit('game:state', sync);
      } catch (error) {
        socket.emit('game:error', {
          error: error instanceof Error ? error.message : 'Unable to spectate game',
        });
      }
    });

    socket.on('move:request', async (payload: MovePayload) => {
      if (guestSpectator) {
        socket.emit('move:rejected', { reason: 'Authentication required' });
        return;
      }
      if (!payload.code || !payload.from || !payload.to) {
        socket.emit('move:rejected', { reason: 'code, from and to are required' });
        return;
      }

      try {
        const accepted = await gameManager.requestMoveQueued(payload.code, playerId, {
          from: payload.from,
          to: payload.to,
          promotion: payload.promotion,
        });
        await gameManager.flushPersistence();
        const room = payload.code.toUpperCase();
        gameManager.publishMoveAccepted(accepted);
        if (computerGameService && accepted.game.opponentType === 'stockfish') {
          await playPendingEngineTurn(computerGameService, room, socket);
        }
        if (notificationProvider && accepted.game.mode === 'correspondence') {
          await notifyInactiveCorrespondenceOpponent(
            io,
            notificationProvider,
            accepted,
            playerId,
            room,
          );
        }
      } catch (error) {
        if (error instanceof GameTimeoutError) {
          return;
        }
        socket.emit('move:rejected', {
          reason: error instanceof Error ? error.message : 'Unable to play move',
        });
      }
    });

    socket.on('chat:send', async (payload: ChatPayload) => {
      if (guestSpectator) {
        socket.emit('chat:error', { error: 'Only game participants can use the chat' });
        return;
      }
      if (!payload.code || payload.message === undefined) {
        socket.emit('chat:error', { error: 'code and message are required' });
        return;
      }

      const game = gameManager.getGame(payload.code);
      if (!game || (game.whitePlayerId !== playerId && game.blackPlayerId !== playerId)) {
        socket.emit('chat:error', { error: 'Only game participants can use the chat' });
        return;
      }

      try {
        const message = await chatProvider.send(game.id, playerId, payload.message);
        io.to(game.code).emit('chat:message', message);
      } catch (error) {
        socket.emit('chat:error', {
          error: error instanceof Error ? error.message : 'Unable to send chat message',
        });
      }
    });
  });

  return io;
}

async function playPendingEngineTurn(
  computerGameService: ComputerGameService,
  code: string,
  socket: { emit: (event: string, payload: unknown) => void },
): Promise<void> {
  try {
    await computerGameService.playEngineTurn(code);
  } catch (error) {
    socket.emit('game:error', {
      error: error instanceof Error ? error.message : 'Stockfish could not make a move',
    });
  }
}

async function notifyInactiveCorrespondenceOpponent(
  io: Server,
  notificationProvider: NotificationProvider,
  accepted: Awaited<ReturnType<GameManager['requestMoveQueued']>>,
  playerId: string,
  room: string,
): Promise<void> {
  const recipientId = getOpponentId(accepted.game.whitePlayerId, accepted.game.blackPlayerId, playerId);
  if (!recipientId) return;
  const roomSockets = await io.in(room).fetchSockets();
  const opponentIsActive = roomSockets.some((roomSocket) => roomSocket.data.playerId === recipientId);
  if (opponentIsActive) return;
  await notificationProvider.createMoveTurnNotification(recipientId, playerId, accepted.game.code);
}

function getOpponentId(
  whitePlayerId: string | undefined,
  blackPlayerId: string | undefined,
  playerId: string,
): string | undefined {
  return whitePlayerId === playerId ? blackPlayerId : whitePlayerId;
}
