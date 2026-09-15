import { describe, expect, it, vi } from 'vitest';

import { GameManager } from './GameManager.js';

describe('GameManager Stockfish games', () => {
  it.each([0, 20])('starts an active unranked game at engine level %i', async (engineLevel) => {
    const persistence = {
      saveGame: vi.fn(async () => undefined),
      saveMove: vi.fn(async () => undefined),
    };
    const manager = new GameManager(undefined, persistence);

    const game = manager.createAiGame('player-a', engineLevel);
    await manager.flushPersistence();

    expect(game).toMatchObject({
      mode: 'casual',
      opponentType: 'stockfish',
      engineLevel,
      status: 'active',
      whitePlayerId: 'player-a',
      timeControl: { initialMs: 15 * 60_000, incrementMs: 0 },
    });
    expect(game.blackPlayerId).toBeUndefined();
    expect(game.startedAt).toEqual(expect.any(Number));
    expect(persistence.saveGame).toHaveBeenCalledWith(
      expect.objectContaining({ opponentType: 'stockfish', engineLevel }),
      expect.any(String),
    );
  });

  it('only accepts a legal engine move for the black side of a Stockfish game', async () => {
    const manager = new GameManager();
    const game = manager.createAiGame('player-a', 8);

    await expect(
      manager.requestEngineMoveQueued(game.code, { from: 'e7', to: 'e5' }),
    ).rejects.toThrow('It is not the engine turn');

    manager.requestMove(game.code, 'player-a', { from: 'e2', to: 'e4' });
    const engineMove = await manager.requestEngineMoveQueued(game.code, {
      from: 'e7',
      to: 'e5',
    });

    expect(engineMove.move).toMatchObject({ san: 'e5', color: 'black' });
  });

  it.each(['q', 'r', 'b', 'n'] as const)(
    'accepts the selected %s when Stockfish promotes by capturing',
    async (promotion) => {
      const manager = new GameManager();
      const game = await prepareEnginePromotion(manager);

      const accepted = await manager.requestEngineMoveQueued(game.code, {
        from: 'a2',
        to: 'b1',
        promotion,
      });

      expect(accepted.move).toMatchObject({ from: 'a2', to: 'b1', promotion });
      expect(accepted.move.san).toBe(`axb1=${promotion.toUpperCase()}`);
    },
  );

  it('rejects missing or unsupported Stockfish promotion choices without consuming the turn', async () => {
    const manager = new GameManager();
    const game = await prepareEnginePromotion(manager);

    await expect(
      manager.requestEngineMoveQueued(game.code, { from: 'a2', to: 'b1' }),
    ).rejects.toThrow('Illegal move');
    await expect(
      manager.requestEngineMoveQueued(game.code, {
        from: 'a2',
        to: 'b1',
        promotion: 'k' as never,
      }),
    ).rejects.toThrow('Illegal move');

    await expect(
      manager.requestEngineMoveQueued(game.code, {
        from: 'a2',
        to: 'b1',
        promotion: 'q',
      }),
    ).resolves.toMatchObject({ move: { promotion: 'q' } });
  });

  it('rejects levels outside the complete Stockfish range', () => {
    const manager = new GameManager();

    expect(() => manager.createAiGame('player-a', -1)).toThrow(
      'Engine level must be between 0 and 20',
    );
    expect(() => manager.createAiGame('player-a', 21)).toThrow(
      'Engine level must be between 0 and 20',
    );
  });
});

async function prepareEnginePromotion(manager: GameManager) {
  const game = manager.createAiGame('player-a', 8);
  const prefixMoves = [
    ['player', 'a2', 'a4'],
    ['engine', 'b7', 'b5'],
    ['player', 'h2', 'h3'],
    ['engine', 'b5', 'a4'],
    ['player', 'h3', 'h4'],
    ['engine', 'a4', 'a3'],
    ['player', 'g2', 'g3'],
    ['engine', 'a3', 'a2'],
    ['player', 'g3', 'g4'],
  ] as const;
  for (const [side, from, to] of prefixMoves) {
    if (side === 'player') {
      manager.requestMove(game.code, 'player-a', { from, to });
    } else {
      await manager.requestEngineMoveQueued(game.code, { from, to });
    }
  }
  return game;
}
