import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';

import type { Move } from '@chess3d/chess-core';

import { GameTimeoutError, type GameManager } from './game/GameManager.js';
import type { AuthProvider } from './auth/AuthService.js';
import { readSessionToken } from './auth/sessionCookie.js';
import { PrismaChatProvider, type ChatProvider } from './chat/ChatService.js';
import { prisma } from './db/client.js';

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
): Server {
  const io = new Server(app.server, { cors: { origin: true, credentials: true } });
  gameManager.onGameUpdate((game) => {
    io.to(game.code).emit('game:updated', game);
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
        io.to(room).emit('move:accepted', accepted);
        if (accepted.result) {
          io.to(room).emit('game:ended', { gameId: accepted.game.id, result: accepted.result });
        }
      } catch (error) {
        if (error instanceof GameTimeoutError) {
          io.to(payload.code.toUpperCase()).emit('game:ended', {
            gameId: error.game.id,
            result: error.result,
          });
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
