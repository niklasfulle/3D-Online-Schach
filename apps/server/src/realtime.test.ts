import { afterEach, describe, expect, it } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';

import { buildApp } from './index.js';
import { GameManager } from './game/GameManager.js';
import { registerRealtime } from './realtime.js';

function waitForEvent<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });
}

describe('realtime game rooms', () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;
  let realtime: ReturnType<typeof registerRealtime> | undefined;
  let clients: Socket[] = [];

  afterEach(async () => {
    clients.forEach((client) => client.close());
    clients = [];
    realtime?.close();
    await app?.close();
    app = undefined;
    realtime = undefined;
  });

  it('broadcasts accepted moves to both players', async () => {
    const gameManager = new GameManager();
    app = buildApp(gameManager);
    realtime = registerRealtime(app, gameManager);
    await app.listen({ host: '127.0.0.1', port: 0 });

    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('Server address unavailable');
    const url = `http://127.0.0.1:${address.port}`;
    const white = connect(url, { auth: { playerId: 'player-a' }, transports: ['websocket'] });
    const black = connect(url, { auth: { playerId: 'player-b' }, transports: ['websocket'] });
    clients = [white, black];

    await Promise.all([waitForEvent(white, 'connect'), waitForEvent(black, 'connect')]);
    const createdPromise = waitForEvent<{ code: string }>(white, 'game:created');
    white.emit('game:create');
    const created = await createdPromise;

    const startedPromise = waitForEvent(black, 'game:started');
    black.emit('game:join', { code: created.code });
    await startedPromise;

    const whiteMovePromise = waitForEvent<{ move: { san: string } }>(white, 'move:accepted');
    const blackMovePromise = waitForEvent<{ move: { san: string } }>(black, 'move:accepted');
    white.emit('move:request', { code: created.code, from: 'e2', to: 'e4' });

    expect((await whiteMovePromise).move.san).toBe('e4');
    expect((await blackMovePromise).move.san).toBe('e4');
  });
});
