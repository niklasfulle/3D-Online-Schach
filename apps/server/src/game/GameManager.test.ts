import { afterEach, describe, expect, it } from 'vitest';

import { GameManager, GameTimeoutError, type GamePersistence } from './GameManager.js';

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

  it('serializes concurrent move requests per game', async () => {
    manager = new GameManager();
    const created = manager.createGame('player-a');
    manager.joinGame(created.code, 'player-b');

    const first = manager.requestMoveQueued(created.code, 'player-a', { from: 'e2', to: 'e4' });
    const second = manager.requestMoveQueued(created.code, 'player-a', { from: 'd2', to: 'd4' });

    await expect(first).resolves.toMatchObject({ move: { san: 'e4' } });
    await expect(second).rejects.toThrow("It is not this player's turn");
  });

  it('keeps the clock authoritative and applies the increment on a move', () => {
    let now = 1_000;
    manager = new GameManager(() => now);
    const created = manager.createGame('player-a', { initialMs: 5_000, incrementMs: 1_000 });
    manager.joinGame(created.code, 'player-b');

    now += 1_200;
    const accepted = manager.requestMove(created.code, 'player-a', { from: 'e2', to: 'e4' });

    expect(accepted.game.whiteRemainingMs).toBe(4_800);
    expect(accepted.game.blackRemainingMs).toBe(5_000);
    expect(accepted.game.turnStartedAt).toBe(2_200);
  });

  it('finishes a game when the active clock reaches zero', () => {
    let now = 1_000;
    manager = new GameManager(() => now);
    const created = manager.createGame('player-a', { initialMs: 5_000, incrementMs: 0 });
    manager.joinGame(created.code, 'player-b');

    now += 5_001;
    try {
      manager.requestMove(created.code, 'player-a', { from: 'e2', to: 'e4' });
      throw new Error('Expected timeout');
    } catch (error) {
      expect(error).toBeInstanceOf(GameTimeoutError);
      expect((error as GameTimeoutError).result).toBe('black');
    }
    expect(manager.getGame(created.code)).toMatchObject({
      status: 'finished',
      whiteRemainingMs: 0,
    });
  });

  it('returns a complete authorized sync snapshot', () => {
    manager = new GameManager(() => 1_000);
    const created = manager.createGame('player-a');
    manager.joinGame(created.code, 'player-b');
    manager.requestMove(created.code, 'player-a', { from: 'e2', to: 'e4' });

    const sync = manager.getGameSync(created.code, 'player-b');

    expect(sync.fen).toContain(' b ');
    expect(sync.moves[0].san).toBe('e4');
    expect(sync.game.blackPlayerId).toBe('player-b');
    expect(() => manager.getGameSync(created.code, 'intruder')).toThrow('not part');
  });

  it('allows a non-participant to sync an active game as a spectator', () => {
    const manager = new GameManager();
    const created = manager.createGame('player-a');
    manager.joinGame(created.code, 'player-b');

    const sync = manager.getGameSyncForViewer(created.code, 'viewer', true);

    expect(sync.game.status).toBe('active');
    expect(sync.game.whitePlayerId).toBe('player-a');
    expect(() => manager.getGameSyncForViewer(created.code, 'viewer')).toThrow('not part');
  });

  it('flushes game, move and FEN persistence after state changes', async () => {
    const savedGames: Array<{ status: string; fen: string }> = [];
    const savedMoves: Array<{ moveNumber: number; san: string; fen: string }> = [];
    const persistence: GamePersistence = {
      saveGame: async (game, fen) => {
        savedGames.push({ status: game.status, fen });
      },
      saveMove: async (_game, move, fen, moveNumber) => {
        savedMoves.push({ moveNumber, san: move.san, fen });
      },
    };

    manager = new GameManager(() => 1_000, persistence);
    const created = manager.createGame('player-a');
    manager.joinGame(created.code, 'player-b');
    manager.requestMove(created.code, 'player-a', { from: 'e2', to: 'e4' });

    await manager.flushPersistence();

    expect(savedGames).toHaveLength(3);
    expect(savedGames.at(-1)).toMatchObject({
      status: 'active',
      fen: expect.stringContaining(' b '),
    });
    expect(savedMoves).toEqual([
      expect.objectContaining({ moveNumber: 1, san: 'e4', fen: expect.stringContaining(' b ') }),
    ]);
  });
});
