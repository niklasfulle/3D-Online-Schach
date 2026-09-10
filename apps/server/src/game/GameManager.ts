import { randomInt, randomUUID } from 'node:crypto';

import {
  ChessGame,
  STARTING_FEN,
  type Move,
  type MoveRecord,
  type PgnHeaders,
} from '@chess3d/chess-core';
import type { GameSummary, TimeControl } from '@chess3d/shared';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const DEFAULT_TIME_CONTROL: TimeControl = { initialMs: 5 * 60 * 1000, incrementMs: 0 };

interface ManagedGame {
  chess: ChessGame;
  summary: GameSummary;
}

export interface GamePersistence {
  saveGame(summary: GameSummary, fen: string): Promise<void>;
  saveMove(
    summary: GameSummary,
    move: MoveRecord,
    fenAfterMove: string,
    moveNumber: number,
  ): Promise<void>;
  loadHistory?: (code: string) => Promise<GameHistory | undefined>;
}

const NOOP_PERSISTENCE: GamePersistence = {
  saveGame: async () => undefined,
  saveMove: async () => undefined,
};

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

export interface GameHistory {
  game: GameSummary;
  initialFen: string;
  currentFen: string;
  moves: MoveRecord[];
  pgn: string;
}

export function resultToPgn(result: GameSummary['result']): string {
  if (result === 'white') return '1-0';
  if (result === 'black') return '0-1';
  if (result === 'draw') return '1/2-1/2';
  return '*';
}

export function pgnHeaders(summary: GameSummary): PgnHeaders {
  return {
    Event: '3D Online-Schach',
    Site: '3D Online-Schach',
    White: summary.whitePlayerId ?? 'White',
    Black: summary.blackPlayerId ?? 'Black',
    Result: resultToPgn(summary.result),
  };
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
  private readonly pendingPersistence = new Set<Promise<void>>();
  private persistenceError: unknown;

  constructor(
    private readonly now: () => number = () => Date.now(),
    private readonly persistence: GamePersistence = NOOP_PERSISTENCE,
  ) {}

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
    this.enqueuePersistence(() => this.persistence.saveGame(game.summary, STARTING_FEN));
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
    this.enqueuePersistence(() =>
      this.persistence.saveGame(game.summary, game.chess.getState().fen),
    );
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
      result: result ?? game.summary.result,
    };

    const summary = this.snapshot(game);
    this.enqueuePersistence(() => this.persistence.saveGame(summary, nextState.fen));
    this.enqueuePersistence(() =>
      this.persistence.saveMove(summary, playedMove, nextState.fen, game.chess.history().length),
    );

    return {
      fen: nextState.fen,
      game: summary,
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

  async getGameHistory(code: string): Promise<GameHistory | undefined> {
    const game = this.getManagedGame(code);
    if (game) return this.createHistory(game);
    return this.persistence.loadHistory?.(code);
  }

  async flushPersistence(): Promise<void> {
    await Promise.all(this.pendingPersistence);
    if (this.persistenceError) {
      const error = this.persistenceError;
      this.persistenceError = undefined;
      throw error;
    }
  }

  private expireIfNeeded(game: ManagedGame): GameTimeoutError | undefined {
    if (game.summary.status !== 'active') return undefined;

    const clock = this.clockSnapshot(game);
    const activeColor = game.chess.getState().activeColor;
    const remainingMs = activeColor === 'white' ? clock.whiteRemainingMs : clock.blackRemainingMs;
    if (remainingMs > 0) return undefined;

    game.summary = { ...game.summary, ...clock, status: 'finished', turnStartedAt: undefined };
    this.enqueuePersistence(() =>
      this.persistence.saveGame(this.snapshot(game), game.chess.getState().fen),
    );
    return new GameTimeoutError(this.snapshot(game), activeColor === 'white' ? 'black' : 'white');
  }

  private enqueuePersistence(operation: () => Promise<void>): void {
    const pending = Promise.resolve()
      .then(operation)
      .catch((error: unknown) => {
        this.persistenceError ??= error;
      });
    this.pendingPersistence.add(pending);
    void pending.finally(() => this.pendingPersistence.delete(pending)).catch(() => undefined);
  }

  private snapshot(game: ManagedGame): GameSummary {
    return { ...game.summary, ...this.clockSnapshot(game) };
  }

  private createHistory(game: ManagedGame): GameHistory {
    const summary = this.snapshot(game);
    const currentFen = game.chess.getState().fen;
    const moves = game.chess.history();
    return {
      game: summary,
      initialFen: STARTING_FEN,
      currentFen,
      moves,
      pgn: game.chess.toPgn(pgnHeaders(summary)),
    };
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
