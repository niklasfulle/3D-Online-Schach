import { randomInt, randomUUID } from 'node:crypto';

import { ChessGame, type Move, type MoveRecord } from '@chess3d/chess-core';
import type { GameSummary } from '@chess3d/shared';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

interface ManagedGame {
  chess: ChessGame;
  summary: GameSummary;
}

export interface AcceptedMove {
  fen: string;
  game: GameSummary;
  move: MoveRecord;
  result?: 'white' | 'black' | 'draw';
}

export class GameManager {
  private readonly games = new Map<string, ManagedGame>();

  createGame(whitePlayerId: string): GameSummary {
    let code = this.createCode();
    while (this.games.has(code)) code = this.createCode();

    const game: ManagedGame = {
      chess: new ChessGame(),
      summary: {
        id: randomUUID(),
        code,
        status: 'waiting',
        whitePlayerId,
      },
    };
    this.games.set(code, game);
    return game.summary;
  }

  joinGame(code: string, blackPlayerId: string): GameSummary {
    const game = this.getManagedGame(code);
    if (!game) throw new Error('Game not found');
    if (game.summary.status !== 'waiting') throw new Error('Game is not waiting for a player');
    if (game.summary.whitePlayerId === blackPlayerId)
      throw new Error('Player is already in this game');

    game.summary = {
      ...game.summary,
      blackPlayerId,
      status: 'active',
    };
    return game.summary;
  }

  requestMove(code: string, playerId: string, move: Move): AcceptedMove {
    const game = this.getManagedGame(code);
    if (!game) throw new Error('Game not found');
    if (game.summary.status !== 'active') throw new Error('Game is not active');

    const state = game.chess.getState();
    const expectedPlayerId =
      state.activeColor === 'white' ? game.summary.whitePlayerId : game.summary.blackPlayerId;
    if (expectedPlayerId !== playerId) throw new Error("It is not this player's turn");

    const legalMove = game.chess
      .legalMoves(move.from)
      .find((candidate) => candidate.to === move.to);
    if (!legalMove || (legalMove.promotion && move.promotion !== legalMove.promotion)) {
      throw new Error('Illegal move');
    }

    const playedMove = game.chess.move(move);
    const nextState = game.chess.getState();
    const result = game.chess.isGameOver()
      ? nextState.status === 'checkmate'
        ? nextState.activeColor === 'white'
          ? 'black'
          : 'white'
        : 'draw'
      : undefined;
    if (game.chess.isGameOver()) {
      game.summary = { ...game.summary, status: 'finished' };
    }

    return {
      fen: game.chess.getState().fen,
      game: game.summary,
      move: playedMove,
      result,
    };
  }

  getGame(code: string): GameSummary | undefined {
    return this.getManagedGame(code)?.summary;
  }

  private getManagedGame(code: string): ManagedGame | undefined {
    return this.games.get(code.toUpperCase());
  }

  private createCode(): string {
    return Array.from(
      { length: CODE_LENGTH },
      () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
    ).join('');
  }
}
