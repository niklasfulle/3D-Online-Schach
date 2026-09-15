import type { Move } from '@chess3d/chess-core';

import type { AcceptedMove, GameManager } from '../game/GameManager.js';

export interface ChessEngine {
  getBestMove(fen: string, level: number): Promise<Move>;
  close?: () => Promise<void> | void;
}

export class ComputerGameService {
  private readonly turnsInProgress = new Map<string, Promise<AcceptedMove | undefined>>();

  constructor(
    private readonly gameManager: GameManager,
    private readonly engine: ChessEngine,
  ) {}

  playEngineTurn(code: string): Promise<AcceptedMove | undefined> {
    const normalizedCode = code.toUpperCase();
    const existingTurn = this.turnsInProgress.get(normalizedCode);
    if (existingTurn) return existingTurn;

    const turn = this.runEngineTurn(normalizedCode).finally(() => {
      if (this.turnsInProgress.get(normalizedCode) === turn) {
        this.turnsInProgress.delete(normalizedCode);
      }
    });
    this.turnsInProgress.set(normalizedCode, turn);
    return turn;
  }

  async close(): Promise<void> {
    await this.engine.close?.();
  }

  private async runEngineTurn(code: string): Promise<AcceptedMove | undefined> {
    const game = this.gameManager.getGame(code);
    if (
      game?.opponentType !== 'stockfish' ||
      game.status !== 'active' ||
      game.engineLevel === undefined ||
      !game.whitePlayerId
    ) {
      return undefined;
    }

    const sync = this.gameManager.getGameSync(code, game.whitePlayerId);
    if (sync.fen.split(' ')[1] !== 'b') return undefined;

    const move = await this.engine.getBestMove(sync.fen, game.engineLevel);
    const accepted = await this.gameManager.requestEngineMoveQueued(code, move);
    await this.gameManager.flushPersistence();
    this.gameManager.publishMoveAccepted(accepted);
    return accepted;
  }
}
