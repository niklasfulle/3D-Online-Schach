import { describe, expect, it, vi } from 'vitest';

import type { Move } from '@chess3d/chess-core';

import { GameManager } from '../game/GameManager.js';
import { ComputerGameService, type ChessEngine } from './ComputerGameService.js';

describe('ComputerGameService', () => {
  it('asks the engine for the selected level and applies its move as black', async () => {
    const manager = new GameManager();
    const game = manager.createAiGame('player-a', 13);
    manager.requestMove(game.code, 'player-a', { from: 'e2', to: 'e4' });
    const engine: ChessEngine = {
      getBestMove: vi.fn(async (): Promise<Move> => ({ from: 'e7', to: 'e5' })),
    };
    const service = new ComputerGameService(manager, engine);

    const accepted = await service.playEngineTurn(game.code);

    expect(engine.getBestMove).toHaveBeenCalledWith(expect.stringContaining(' b '), 13);
    expect(accepted?.move).toMatchObject({ san: 'e5', color: 'black' });
  });

  it('coalesces simultaneous requests for the same engine turn', async () => {
    const manager = new GameManager();
    const game = manager.createAiGame('player-a', 5);
    manager.requestMove(game.code, 'player-a', { from: 'e2', to: 'e4' });
    let resolveMove: ((move: Move) => void) | undefined;
    const engine: ChessEngine = {
      getBestMove: vi.fn(
        () =>
          new Promise<Move>((resolve) => {
            resolveMove = resolve;
          }),
      ),
    };
    const service = new ComputerGameService(manager, engine);

    const firstRequest = service.playEngineTurn(game.code);
    const secondRequest = service.playEngineTurn(game.code);
    resolveMove?.({ from: 'e7', to: 'e5' });
    const [first, second] = await Promise.all([firstRequest, secondRequest]);

    expect(engine.getBestMove).toHaveBeenCalledTimes(1);
    expect(first?.move.san).toBe('e5');
    expect(second?.move.san).toBe('e5');
  });

  it('does nothing when the player still has the move', async () => {
    const manager = new GameManager();
    const game = manager.createAiGame('player-a', 5);
    const engine: ChessEngine = {
      getBestMove: vi.fn(async (): Promise<Move> => ({ from: 'e7', to: 'e5' })),
    };
    const service = new ComputerGameService(manager, engine);

    await expect(service.playEngineTurn(game.code)).resolves.toBeUndefined();
    expect(engine.getBestMove).not.toHaveBeenCalled();
  });

  it('finishes an unranked game when the engine delivers checkmate', async () => {
    const manager = new GameManager();
    const game = manager.createAiGame('player-a', 8);
    const engineMoves: Move[] = [
      { from: 'e7', to: 'e5' },
      { from: 'd8', to: 'h4' },
    ];
    const engine: ChessEngine = {
      getBestMove: vi.fn(async (): Promise<Move> => {
        const move = engineMoves.shift();
        if (!move) throw new Error('No test move remains');
        return move;
      }),
    };
    const onGameEnded = vi.fn();
    manager.onGameEnded(onGameEnded);
    const service = new ComputerGameService(manager, engine);

    manager.requestMove(game.code, 'player-a', { from: 'f2', to: 'f3' });
    await service.playEngineTurn(game.code);
    manager.requestMove(game.code, 'player-a', { from: 'g2', to: 'g4' });
    const matingMove = await service.playEngineTurn(game.code);

    expect(matingMove).toMatchObject({
      move: { san: 'Qh4#', color: 'black' },
      game: { status: 'finished', mode: 'casual', result: 'black' },
    });
    expect(onGameEnded).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ status: 'finished', opponentType: 'stockfish' }),
      'black',
    );
    expect(manager.getGameSync(game.code, 'player-a').moves.map(({ san }) => san)).toEqual([
      'f3',
      'e5',
      'g4',
      'Qh4#',
    ]);
  });
});
