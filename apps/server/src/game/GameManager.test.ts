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

  it('accepts only legal moves from the player whose turn it is', () => {
    manager = new GameManager();
    const created = manager.createGame('player-a');
    manager.joinGame(created.code, 'player-b');

    const accepted = manager.requestMove(created.code, 'player-a', { from: 'e2', to: 'e4' });

    expect(accepted.move.san).toBe('e4');
    expect(accepted.fen).toContain(' b ');
    expect(() => manager.requestMove(created.code, 'player-a', { from: 'd2', to: 'd4' })).toThrow(
      "It is not this player's turn",
    );
    expect(() =>
      manager.requestMove(created.code, 'player-b', { from: 'e7', to: 'e6' }),
    ).not.toThrow();
    expect(() => manager.requestMove(created.code, 'player-a', { from: 'e2', to: 'e5' })).toThrow(
      'Illegal move',
    );
  });

  it('returns the winning color when a move ends the game', () => {
    manager = new GameManager();
    const created = manager.createGame('player-a');
    manager.joinGame(created.code, 'player-b');

    manager.requestMove(created.code, 'player-a', { from: 'f2', to: 'f3' });
    manager.requestMove(created.code, 'player-b', { from: 'e7', to: 'e5' });
    manager.requestMove(created.code, 'player-a', { from: 'g2', to: 'g4' });
    const accepted = manager.requestMove(created.code, 'player-b', { from: 'd8', to: 'h4' });

    expect(accepted.result).toBe('black');
    expect(accepted.game.status).toBe('finished');
  });
});
