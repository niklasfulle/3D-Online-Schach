import { randomInt, randomUUID } from 'node:crypto';

import { ChessGame, type Move, type MoveRecord } from '@chess3d/chess-core';
import type { GameSummary, TimeControl } from '@chess3d/shared';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const DEFAULT_TIME_CONTROL: TimeControl = { initialMs: 5 * 60 * 1000, incrementMs: 0 };

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

export interface GameSync {
  fen: string;
  game: GameSummary;
  moves: MoveRecord[];
}

export class GameTimeoutError extends Error {
  constructor(
    public readonly game: GameSummary,
    public readonly result: 'white' | 'black',
  ) {
    super('Time expired');
  }
}

export class GameManager {
  private readonly games = new Map<string, ManagedGame>();
  private readonly moveQueues = new Map<string, Promise<void>>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  createGame(whitePlayerId: string, timeControl = DEFAULT_TIME_CONTROL): GameSummary {
    if (timeControl.initialMs <= 0 || timeControl.incrementMs < 0) {
      throw new Error('Invalid time control');
    }

    let code = this.createCode();
    while (this.games.has(code)) code = this.createCode();

    const game: ManagedGame = {
      chess: new ChessGame(),
      summary: {
        id: randomUUID(),
        code,
        status: 'waiting',
        whitePlayerId,
        timeControl,
        whiteRemainingMs: timeControl.initialMs,
        blackRemainingMs: timeControl.initialMs,
      },
    };
    this.games.set(code, game);
    return this.snapshot(game);
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
      turnStartedAt: this.now(),
    };
    return this.snapshot(game);
  }

  requestMove(code: string, playerId: string, move: Move): AcceptedMove {
    const game = this.getManagedGame(code);
    if (!game) throw new Error('Game not found');
    if (game.summary.status !== 'active') throw new Error('Game is not active');

    const timeout = this.expireIfNeeded(game);
    if (timeout) throw timeout;

    const clock = this.clockSnapshot(game);
    const state = game.chess.getState();
    const movingColor = state.activeColor;
    const remainingMs = movingColor === 'white' ? clock.whiteRemainingMs : clock.blackRemainingMs;

    const expectedPlayerId =
      movingColor === 'white' ? game.summary.whitePlayerId : game.summary.blackPlayerId;
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
    const movedRemainingMs = remainingMs + game.summary.timeControl.incrementMs;
    const nextTurnStartedAt = game.chess.isGameOver() ? undefined : this.now();

    game.summary = {
      ...game.summary,
      ...clock,
      status: game.chess.isGameOver() ? 'finished' : 'active',
      whiteRemainingMs: movingColor === 'white' ? movedRemainingMs : clock.whiteRemainingMs,
      blackRemainingMs: movingColor === 'black' ? movedRemainingMs : clock.blackRemainingMs,
      turnStartedAt: nextTurnStartedAt,
    };

    return {
      fen: nextState.fen,
      game: this.snapshot(game),
      move: playedMove,
      result,
    };
  }

  requestMoveQueued(code: string, playerId: string, move: Move): Promise<AcceptedMove> {
    const normalizedCode = code.toUpperCase();
    const previous = this.moveQueues.get(normalizedCode) ?? Promise.resolve();
    const next = previous.then(() => this.requestMove(normalizedCode, playerId, move));
    this.moveQueues.set(
      normalizedCode,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }

  getGame(code: string): GameSummary | undefined {
    const game = this.getManagedGame(code);
    if (game) this.expireIfNeeded(game);
    return game ? this.snapshot(game) : undefined;
  }

  getGameSync(code: string, playerId: string): GameSync {
    const game = this.getManagedGame(code);
    if (!game) throw new Error('Game not found');
    if (game.summary.whitePlayerId !== playerId && game.summary.blackPlayerId !== playerId) {
      throw new Error('Player is not part of this game');
    }

    this.expireIfNeeded(game);
    return {
      fen: game.chess.getState().fen,
      game: this.snapshot(game),
      moves: game.chess.history(),
    };
  }

  private expireIfNeeded(game: ManagedGame): GameTimeoutError | undefined {
    if (game.summary.status !== 'active') return undefined;

    const clock = this.clockSnapshot(game);
    const activeColor = game.chess.getState().activeColor;
    const remainingMs = activeColor === 'white' ? clock.whiteRemainingMs : clock.blackRemainingMs;
    if (remainingMs > 0) return undefined;

    game.summary = { ...game.summary, ...clock, status: 'finished', turnStartedAt: undefined };
    return new GameTimeoutError(this.snapshot(game), activeColor === 'white' ? 'black' : 'white');
  }

  private snapshot(game: ManagedGame): GameSummary {
    return { ...game.summary, ...this.clockSnapshot(game) };
  }

  private clockSnapshot(
    game: ManagedGame,
  ): Pick<GameSummary, 'whiteRemainingMs' | 'blackRemainingMs'> {
    if (game.summary.status !== 'active' || game.summary.turnStartedAt === undefined) {
      return {
        whiteRemainingMs: game.summary.whiteRemainingMs,
        blackRemainingMs: game.summary.blackRemainingMs,
      };
    }

    const elapsed = Math.max(0, this.now() - game.summary.turnStartedAt);
    return {
      whiteRemainingMs:
        game.chess.getState().activeColor === 'white'
          ? Math.max(0, game.summary.whiteRemainingMs - elapsed)
          : game.summary.whiteRemainingMs,
      blackRemainingMs:
        game.chess.getState().activeColor === 'black'
          ? Math.max(0, game.summary.blackRemainingMs - elapsed)
          : game.summary.blackRemainingMs,
    };
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
