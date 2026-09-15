import { afterEach, describe, expect, it, vi } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';

import type { Move } from '@chess3d/chess-core';

import { buildApp } from './index.js';
import { ComputerGameService, type ChessEngine } from './engine/ComputerGameService.js';
import { GameManager } from './game/GameManager.js';
import { registerRealtime } from './realtime.js';

function waitForEvent<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, (payload: T) => resolve(payload)));
}

describe('Stockfish realtime turns', () => {
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

  it('plays and broadcasts the Stockfish reply after the human move', async () => {
    const gameManager = new GameManager();
    const game = gameManager.createAiGame('player-a', 7);
    const engine: ChessEngine = {
      getBestMove: vi.fn(async (): Promise<Move> => ({ from: 'e7', to: 'e5' })),
    };
    const computerGameService = new ComputerGameService(gameManager, engine);
    app = buildApp(gameManager);
    realtime = registerRealtime(app, gameManager, undefined, undefined, undefined, computerGameService);
    await app.listen({ host: '127.0.0.1', port: 0 });

    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('Server address unavailable');
    const white = connect(`http://127.0.0.1:${address.port}`, {
      auth: { playerId: 'player-a' },
      transports: ['websocket'],
    });
    clients = [white];
    await waitForEvent(white, 'connect');

    const syncPromise = waitForEvent(white, 'game:state');
    white.emit('game:sync', { code: game.code });
    await syncPromise;

    const acceptedMoves = new Promise<Array<{ move: { san: string }; game: { status: string } }>>(
      (resolve) => {
        const moves: Array<{ move: { san: string }; game: { status: string } }> = [];
        white.on('move:accepted', (accepted) => {
          moves.push(accepted);
          if (moves.length === 2) resolve(moves);
        });
      },
    );
    white.emit('move:request', { code: game.code, from: 'e2', to: 'e4' });

    const moves = await acceptedMoves;
    expect(moves.map(({ move }) => move.san)).toEqual(['e4', 'e5']);
    expect(moves[1].game.status).toBe('active');
    expect(engine.getBestMove).toHaveBeenCalledWith(expect.stringContaining(' b '), 7);
    expect(gameManager.getGameSync(game.code, 'player-a').moves.map(({ san }) => san)).toEqual([
      'e4',
      'e5',
    ]);
  });

  it('resumes a pending engine reply after the player reconnects', async () => {
    const gameManager = new GameManager();
    const game = gameManager.createAiGame('player-a', 7);
    let resolveEngineMove: ((move: Move) => void) | undefined;
    const engine: ChessEngine = {
      getBestMove: vi.fn(
        () =>
          new Promise<Move>((resolve) => {
            resolveEngineMove = resolve;
          }),
      ),
    };
    const computerGameService = new ComputerGameService(gameManager, engine);
    app = buildApp(gameManager);
    realtime = registerRealtime(app, gameManager, undefined, undefined, undefined, computerGameService);
    await app.listen({ host: '127.0.0.1', port: 0 });

    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('Server address unavailable');
    const url = `http://127.0.0.1:${address.port}`;
    const firstConnection = connect(url, {
      auth: { playerId: 'player-a' },
      transports: ['websocket'],
    });
    clients = [firstConnection];
    await waitForEvent(firstConnection, 'connect');

    const initialSync = waitForEvent(firstConnection, 'game:state');
    firstConnection.emit('game:sync', { code: game.code });
    await initialSync;
    const playerMove = waitForEvent<{ move: { san: string } }>(firstConnection, 'move:accepted');
    firstConnection.emit('move:request', { code: game.code, from: 'e2', to: 'e4' });
    await expect(playerMove).resolves.toMatchObject({ move: { san: 'e4' } });
    await vi.waitFor(() => expect(engine.getBestMove).toHaveBeenCalledOnce());

    firstConnection.disconnect();
    const reconnected = connect(url, {
      auth: { playerId: 'player-a' },
      transports: ['websocket'],
    });
    clients.push(reconnected);
    await waitForEvent(reconnected, 'connect');

    const restoredState = waitForEvent(reconnected, 'game:state');
    reconnected.emit('game:sync', { code: game.code });
    await restoredState;
    const engineMove = waitForEvent<{ move: { san: string } }>(reconnected, 'move:accepted');
    resolveEngineMove?.({ from: 'e7', to: 'e5' });

    await expect(engineMove).resolves.toMatchObject({ move: { san: 'e5' } });
    expect(engine.getBestMove).toHaveBeenCalledOnce();
    expect(gameManager.getGameSync(game.code, 'player-a').moves.map(({ san }) => san)).toEqual([
      'e4',
      'e5',
    ]);
  });
});
