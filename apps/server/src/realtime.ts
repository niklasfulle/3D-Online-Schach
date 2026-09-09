import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';

import type { Move } from '@chess3d/chess-core';

import { GameTimeoutError, type GameManager } from './game/GameManager.js';

interface JoinPayload {
  code?: string;
}

interface SyncPayload {
  code?: string;
}

interface MovePayload extends Move {
  code?: string;
}

export function registerRealtime(app: FastifyInstance, gameManager: GameManager): Server {
  const io = new Server(app.server, { cors: { origin: true } });

  io.on('connection', (socket) => {
    const playerId =
      typeof socket.handshake.auth.playerId === 'string' ? socket.handshake.auth.playerId : null;
    if (!playerId) {
      socket.disconnect(true);
      return;
    }

    socket.on('game:create', () => {
      const game = gameManager.createGame(playerId);
      void socket.join(game.code);
      socket.emit('game:created', game);
    });

    socket.on('game:join', (payload: JoinPayload) => {
      if (!payload.code) {
        socket.emit('game:error', { error: 'code is required' });
        return;
      }

      try {
        const game = gameManager.joinGame(payload.code, playerId);
        void socket.join(game.code);
        io.to(game.code).emit('game:started', game);
      } catch (error) {
        socket.emit('game:error', {
          error: error instanceof Error ? error.message : 'Unable to join game',
        });
      }
    });

    socket.on('game:sync', (payload: SyncPayload) => {
      if (!payload.code) {
        socket.emit('game:error', { error: 'code is required' });
        return;
      }

      try {
        const sync = gameManager.getGameSync(payload.code, playerId);
        void socket.join(payload.code.toUpperCase());
        socket.emit('game:state', sync);
      } catch (error) {
        socket.emit('game:error', {
          error: error instanceof Error ? error.message : 'Unable to sync game',
        });
      }
    });

    socket.on('move:request', async (payload: MovePayload) => {
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
  });

  return io;
}
