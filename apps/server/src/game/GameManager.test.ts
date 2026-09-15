import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  GameManager,
  GameTimeoutError,
  WAITING_GAME_TTL_MS,
  type GamePersistence,
} from './GameManager.js';

describe('GameManager', () => {
  let manager: GameManager;

  afterEach(() => {
    vi.useRealTimers();
    manager = new GameManager();
  });

  it('starts new games with fifteen minutes and ends an idle turn on time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    manager = new GameManager();
    const onGameEnd = vi.fn();
    manager.onGameEnded(onGameEnd);
    const created = manager.createGame('player-a');

    expect(created.timeControl.initialMs).toBe(15 * 60_000);
    manager.joinGame(created.code, 'player-b');
    vi.advanceTimersByTime(15 * 60_000);

    expect(onGameEnd).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ status: 'finished', whiteRemainingMs: 0 }),
      'black',
    );
  });

  it('creates Fernpartien without a clock or waiting expiration', () => {
    let now = 1_000;
    manager = new GameManager(() => now);

    const created = manager.createGame(
      'player-a',
      { initialMs: 0, incrementMs: 0 },
      'correspondence',
    );

    expect(created).toMatchObject({
      mode: 'correspondence',
      timeControl: { initialMs: 0, incrementMs: 0, unlimited: true },
    });
    expect(created.expiresAt).toBeUndefined();
    expect(manager.listWaitingGames()).toEqual([]);

    manager.joinGame(created.code, 'player-b');
    const onGameEnd = vi.fn();
    manager.onGameEnded(onGameEnd);
    now += 365 * 24 * 60 * 60 * 1_000;

    expect(() =>
      manager.requestMove(created.code, 'player-a', { from: 'e2', to: 'e4' }),
    ).not.toThrow();
    expect(onGameEnd).not.toHaveBeenCalled();
  });

  it('moves the timeout to the next player after a move', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    manager = new GameManager();
    const onGameEnd = vi.fn();
    manager.onGameEnded(onGameEnd);
    const created = manager.createGame('player-a', { initialMs: 3_000, incrementMs: 0 });
    manager.joinGame(created.code, 'player-b');

    vi.advanceTimersByTime(1_000);
    manager.requestMove(created.code, 'player-a', { from: 'e2', to: 'e4' });
    vi.advanceTimersByTime(2_000);
    expect(onGameEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);

    expect(onGameEnd).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ status: 'finished', blackRemainingMs: 0 }),
      'white',
    );
  });

  it('creates a waiting game with a readable code', () => {
    manager = new GameManager();
    const game = manager.createGame('player-a');

    expect(game.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(game.status).toBe('waiting');
    expect(game.whitePlayerId).toBe('player-a');
  });

  it('assigns a 30 minute expiration to waiting games', () => {
    const now = 1_000;
    manager = new GameManager(() => now);

    const game = manager.createGame('player-a');

    expect(game.expiresAt).toBe(now + WAITING_GAME_TTL_MS);
  });

  it('assigns the second player and activates the game', () => {
    manager = new GameManager();
    const created = manager.createGame('player-a');

    const joined = manager.joinGame(created.code.toLowerCase(), 'player-b');

    expect(joined.status).toBe('active');
    expect(joined.whitePlayerId).toBe('player-a');
    expect(joined.blackPlayerId).toBe('player-b');
    expect(joined.expiresAt).toBeUndefined();
  });

  it('rejects and exposes expired waiting games for cleanup', () => {
    let now = 1_000;
    manager = new GameManager(() => now);
    const created = manager.createGame('player-a');
    now += WAITING_GAME_TTL_MS;

    expect(manager.listWaitingGames()).toEqual([]);
    expect(manager.getExpiredWaitingGames()).toHaveLength(1);
    expect(() => manager.joinGame(created.code, 'player-b')).toThrow('Game has expired');
    expect(manager.removeExpiredGame(created.code)).toBe(true);
    expect(manager.getGame(created.code)).toBeUndefined();
  });

  it('publishes a game update when a second player joins', () => {
    manager = new GameManager();
    const updates: Array<{ code: string; status: string; blackPlayerId?: string }> = [];
    manager.onGameUpdate((game) => updates.push(game));
    const created = manager.createGame('player-a');

    manager.joinGame(created.code, 'player-b');

    expect(updates).toEqual([
      expect.objectContaining({ code: created.code, status: 'active', blackPlayerId: 'player-b' }),
    ]);
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

  it.each(['q', 'r', 'b', 'n'] as const)(
    'accepts the selected %s when a player promotes by capturing',
    (promotion) => {
      manager = new GameManager();
      const created = preparePlayerPromotion(manager);

      const accepted = manager.requestMove(created.code, 'player-a', {
        from: 'a7',
        to: 'b8',
        promotion,
      });

      expect(accepted.move).toMatchObject({ from: 'a7', to: 'b8', promotion });
      expect(accepted.move.san).toBe(`axb8=${promotion.toUpperCase()}`);
    },
  );

  it('rejects missing or unsupported player promotion choices without consuming the turn', () => {
    manager = new GameManager();
    const created = preparePlayerPromotion(manager);

    expect(() => manager.requestMove(created.code, 'player-a', { from: 'a7', to: 'b8' })).toThrow(
      'Illegal move',
    );
    expect(() =>
      manager.requestMove(created.code, 'player-a', {
        from: 'a7',
        to: 'b8',
        promotion: 'k' as never,
      }),
    ).toThrow('Illegal move');

    expect(
      manager.requestMove(created.code, 'player-a', {
        from: 'a7',
        to: 'b8',
        promotion: 'q',
      }).move.promotion,
    ).toBe('q');
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

  it('allows an active participant to resign and awards the game to the opponent', async () => {
    const savedGames: Array<{ status: string; result?: string }> = [];
    manager = new GameManager(undefined, {
      saveGame: async (game) => {
        savedGames.push({ status: game.status, result: game.result });
      },
      saveMove: async () => undefined,
    });
    const created = manager.createGame('player-a');
    manager.joinGame(created.code, 'player-b');

    const resigned = manager.resignGame(created.code, 'player-a');
    await manager.flushPersistence();

    expect(resigned).toMatchObject({
      code: created.code,
      status: 'finished',
      result: 'black',
      turnStartedAt: undefined,
    });
    expect(savedGames.at(-1)).toEqual({ status: 'finished', result: 'black' });
    expect(() => manager.resignGame(created.code, 'player-b')).toThrow('Game is not active');
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
    expect(accepted.game.startedAt).toBe(1_000);
    expect(accepted.game.turnStartedAt).toBe(2_200);
    expect(accepted.move.elapsedMs).toBe(1_200);
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

  it('keeps the finished status when older game saves finish late', async () => {
    let persistedGame: { status: string; result?: string } | undefined;
    const persistence: GamePersistence = {
      saveGame: async (game) => {
        if (game.status === 'active') await new Promise((resolve) => setTimeout(resolve, 0));
        persistedGame = { status: game.status, result: game.result };
      },
      saveMove: async () => undefined,
    };
    manager = new GameManager(undefined, persistence);
    const created = manager.createGame('player-a');
    manager.joinGame(created.code, 'player-b');

    manager.requestMove(created.code, 'player-a', { from: 'f2', to: 'f3' });
    manager.requestMove(created.code, 'player-b', { from: 'e7', to: 'e5' });
    manager.requestMove(created.code, 'player-a', { from: 'g2', to: 'g4' });
    manager.requestMove(created.code, 'player-b', { from: 'd8', to: 'h4' });
    await manager.flushPersistence();

    expect(persistedGame).toEqual({ status: 'finished', result: 'black' });
  });

  it('persists the move number from the time each move was made', async () => {
    const persistedMoveNumbers: number[] = [];
    const persistence: GamePersistence = {
      saveGame: async () => undefined,
      saveMove: async (_game, _move, _fen, moveNumber) => {
        persistedMoveNumbers.push(moveNumber);
      },
    };
    manager = new GameManager(undefined, persistence);
    const created = manager.createGame('player-a');
    manager.joinGame(created.code, 'player-b');

    manager.requestMove(created.code, 'player-a', { from: 'f2', to: 'f3' });
    manager.requestMove(created.code, 'player-b', { from: 'e7', to: 'e5' });
    manager.requestMove(created.code, 'player-a', { from: 'g2', to: 'g4' });
    manager.requestMove(created.code, 'player-b', { from: 'd8', to: 'h4' });
    await manager.flushPersistence();

    expect(persistedMoveNumbers).toEqual([1, 2, 3, 4]);
  });
});

function preparePlayerPromotion(manager: GameManager) {
  const created = manager.createGame('player-a');
  manager.joinGame(created.code, 'player-b');
  const prefixMoves = [
    ['player-a', 'b2', 'b4'],
    ['player-b', 'a7', 'a5'],
    ['player-a', 'b4', 'a5'],
    ['player-b', 'h7', 'h6'],
    ['player-a', 'a5', 'a6'],
    ['player-b', 'h6', 'h5'],
    ['player-a', 'a6', 'a7'],
    ['player-b', 'g7', 'g6'],
  ] as const;
  for (const [playerId, from, to] of prefixMoves) {
    manager.requestMove(created.code, playerId, { from, to });
  }
  return created;
}
