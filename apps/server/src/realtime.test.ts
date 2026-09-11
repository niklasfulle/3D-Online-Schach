import { afterEach, describe, expect, it } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';

import { buildApp } from './index.js';
import { GameManager } from './game/GameManager.js';
import { registerRealtime } from './realtime.js';
import type { ChatProvider } from './chat/ChatService.js';

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
    const chatProvider: ChatProvider = {
      list: async () => [],
      send: async (_gameId, senderId, message) => ({
        id: 'message-1',
        senderId,
        senderUsername: senderId === 'player-a' ? 'alice' : 'bob',
        message: message.trim(),
        createdAt: '2026-09-11T12:00:00.000Z',
      }),
    };
    realtime = registerRealtime(app, gameManager, undefined, chatProvider);
    await app.listen({ host: '127.0.0.1', port: 0 });

    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('Server address unavailable');
    const url = `http://127.0.0.1:${address.port}`;
    const white = connect(url, { auth: { playerId: 'player-a' }, transports: ['websocket'] });
    const black = connect(url, { auth: { playerId: 'player-b' }, transports: ['websocket'] });
    const spectator = connect(url, { auth: { playerId: 'viewer' }, transports: ['websocket'] });
    clients = [white, black, spectator];

    await Promise.all([
      waitForEvent(white, 'connect'),
      waitForEvent(black, 'connect'),
      waitForEvent(spectator, 'connect'),
    ]);
    const createdPromise = waitForEvent<{ code: string }>(white, 'game:created');
    white.emit('game:create');
    const created = await createdPromise;

    const startedPromise = waitForEvent(black, 'game:started');
    black.emit('game:join', { code: created.code });
    await startedPromise;

    const spectatorStatePromise = waitForEvent<{ game: { status: string } }>(
      spectator,
      'game:state',
    );
    spectator.emit('game:spectate', { code: created.code });
    expect((await spectatorStatePromise).game.status).toBe('active');

    const whiteChatPromise = waitForEvent<{ message: string }>(white, 'chat:message');
    const blackChatPromise = waitForEvent<{ message: string }>(black, 'chat:message');
    white.emit('chat:send', { code: created.code, message: ' Hallo! ' });
    expect((await whiteChatPromise).message).toBe('Hallo!');
    expect((await blackChatPromise).message).toBe('Hallo!');

    const whiteMovePromise = waitForEvent<{ move: { san: string } }>(white, 'move:accepted');
    const blackMovePromise = waitForEvent<{ move: { san: string } }>(black, 'move:accepted');
    const spectatorMovePromise = waitForEvent<{ move: { san: string } }>(
      spectator,
      'move:accepted',
    );
    white.emit('move:request', { code: created.code, from: 'e2', to: 'e4' });

    expect((await whiteMovePromise).move.san).toBe('e4');
    expect((await blackMovePromise).move.san).toBe('e4');
    expect((await spectatorMovePromise).move.san).toBe('e4');

    const syncPromise = waitForEvent<{ fen: string; moves: Array<{ san: string }> }>(
      white,
      'game:state',
    );
    white.emit('game:sync', { code: created.code });
    const sync = await syncPromise;
    expect(sync.fen).toContain(' b ');
    expect(sync.moves[0].san).toBe('e4');
  });

  it('broadcasts game end with the winning color', async () => {
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

    async function play(socket: Socket, from: string, to: string) {
      const accepted = waitForEvent(socket, 'move:accepted');
      socket.emit('move:request', { code: created.code, from, to });
      await accepted;
    }

    await play(white, 'f2', 'f3');
    await play(black, 'e7', 'e5');
    await play(white, 'g2', 'g4');
    const whiteEnded = waitForEvent<{ result: string }>(white, 'game:ended');
    const blackEnded = waitForEvent<{ result: string }>(black, 'game:ended');
    black.emit('move:request', { code: created.code, from: 'd8', to: 'h4' });

    expect((await whiteEnded).result).toBe('black');
    expect((await blackEnded).result).toBe('black');
  });
});
