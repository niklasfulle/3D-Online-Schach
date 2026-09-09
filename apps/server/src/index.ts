import { pathToFileURL } from 'node:url';

import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import type { Move } from '@chess3d/chess-core';

import { GameManager } from './game/GameManager.js';

export function buildApp(gameManager = new GameManager()): FastifyInstance {
  const app = Fastify({ logger: true });

  void app.register(cors, { origin: true });

  app.get('/health', async () => ({ status: 'ok', service: 'chess3d-server' }));

  app.post<{ Body: { playerId?: string } }>('/games', async (request, reply) => {
    const playerId = request.body?.playerId;
    if (!playerId) return reply.code(400).send({ error: 'playerId is required' });

    return reply.code(201).send(gameManager.createGame(playerId));
  });

  app.post<{ Params: { code: string }; Body: { playerId?: string } }>(
    '/games/:code/join',
    async (request, reply) => {
      const playerId = request.body?.playerId;
      if (!playerId) return reply.code(400).send({ error: 'playerId is required' });

      try {
        return reply.send(gameManager.joinGame(request.params.code, playerId));
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
    return reply.send(game);
  });

  app.post<{
    Params: { code: string };
    Body: Move & { playerId?: string };
  }>('/games/:code/moves', async (request, reply) => {
    const { playerId, from, to, promotion } = request.body ?? {};
    if (!playerId || !from || !to)
      return reply.code(400).send({ error: 'playerId, from and to are required' });

    try {
      return reply.send(
        gameManager.requestMove(request.params.code, playerId, { from, to, promotion }),
      );
    } catch (error) {
      return reply
        .code(400)
        .send({ error: error instanceof Error ? error.message : 'Unable to play move' });
    }
  });

  return app;
}

async function start() {
  const app = buildApp();
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '127.0.0.1';

  try {
    await app.listen({ host, port });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await start();
}
