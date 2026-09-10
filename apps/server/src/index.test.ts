import { afterEach, describe, expect, it } from 'vitest';

import { ChessGame } from '@chess3d/chess-core';

import { GameManager } from './game/GameManager.js';
import { buildApp } from './index.js';

describe('game history API', () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('loads history and exports a readable PGN file', async () => {
    const gameManager = new GameManager();
    const game = gameManager.createGame('alice');
    gameManager.joinGame(game.code, 'bob');
    gameManager.requestMove(game.code, 'alice', { from: 'e2', to: 'e4' });
    app = buildApp(gameManager);

    const historyResponse = await app.inject({
      method: 'GET',
      url: `/games/${game.code}/history`,
    });
    expect(historyResponse.statusCode).toBe(200);
    const history = historyResponse.json() as {
      currentFen: string;
      moves: Array<{ san: string }>;
      pgn: string;
    };

    expect(history.currentFen).toContain(' b ');
    expect(history.moves.map((move) => move.san)).toEqual(['e4']);
    expect(history.pgn).toContain('1. e4');
    expect(
      ChessGame.fromPgn(history.pgn)
        .history()
        .map((move) => move.san),
    ).toEqual(['e4']);

    const pgnResponse = await app.inject({
      method: 'GET',
      url: `/games/${game.code}/pgn`,
    });
    expect(pgnResponse.statusCode).toBe(200);
    expect(pgnResponse.headers['content-type']).toContain('application/x-chess-pgn');
    expect(pgnResponse.headers['content-disposition']).toContain(`game-${game.code}.pgn`);
    expect(pgnResponse.body).toBe(history.pgn);
  });
});
