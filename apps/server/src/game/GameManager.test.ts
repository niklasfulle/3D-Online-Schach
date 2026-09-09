import { afterEach, describe, expect, it } from 'vitest';

import { GameManager } from './GameManager.js';

describe('GameManager', () => {
  let manager: GameManager;

  afterEach(() => {
    manager = new GameManager();
  });

  it('creates a waiting game with a readable code', () => {
    manager = new GameManager();
    const game = manager.createGame('player-a');

    expect(game.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(game.status).toBe('waiting');
    expect(game.whitePlayerId).toBe('player-a');
  });

  it('assigns the second player and activates the game', () => {
    manager = new GameManager();
    const created = manager.createGame('player-a');

    const joined = manager.joinGame(created.code.toLowerCase(), 'player-b');

    expect(joined.status).toBe('active');
    expect(joined.whitePlayerId).toBe('player-a');
    expect(joined.blackPlayerId).toBe('player-b');
  });

  it('rejects a third player', () => {
    manager = new GameManager();
    const created = manager.createGame('player-a');
    manager.joinGame(created.code, 'player-b');

    expect(() => manager.joinGame(created.code, 'player-c')).toThrow('Game is not waiting');
  });
});
