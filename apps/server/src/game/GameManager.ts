import { randomInt, randomUUID } from 'node:crypto';

import {
  ChessGame,
  STARTING_FEN,
  type Move,
  type MoveRecord,
  type PgnHeaders,
} from '@chess3d/chess-core';
import type { GameMode, GameSummary, TimeControl, TimedMove } from '@chess3d/shared';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const DEFAULT_TIME_CONTROL: TimeControl = { initialMs: 15 * 60 * 1000, incrementMs: 0 };
const CORRESPONDENCE_TIME_CONTROL: TimeControl = {
  initialMs: 0,
  incrementMs: 0,
  unlimited: true,
};
export const WAITING_GAME_TTL_MS = 30 * 60 * 1000;

interface ManagedGame {
  chess: ChessGame;
  summary: GameSummary;
  moves: TimedMove[];
}

export interface GamePersistence {
  saveGame(summary: GameSummary, fen: string): Promise<void>;
  saveMove(
    summary: GameSummary,
    move: MoveRecord & { elapsedMs?: number },
    fenAfterMove: string,
    moveNumber: number,
  ): Promise<void>;
  deleteGame?: (summary: GameSummary) => Promise<void>;
  loadHistory?: (code: string) => Promise<GameHistory | undefined>;
}

const NOOP_PERSISTENCE: GamePersistence = {
  saveGame: async () => undefined,
  saveMove: async () => undefined,
};

export interface AcceptedMove {
  fen: string;
  game: GameSummary;
  move: TimedMove;
  result?: 'white' | 'black' | 'draw';
}

export interface GameSync {
  fen: string;
  game: GameSummary;
  moves: TimedMove[];
}

export type GameUpdateListener = (game: GameSummary) => void;
export type GameRemovalListener = (game: GameSummary) => void;
export type GameEndListener = (game: GameSummary, result: 'white' | 'black' | 'draw') => void;
export type AcceptedMoveListener = (move: AcceptedMove) => void;

export interface GameHistory {
  game: GameSummary;
  initialFen: string;
  currentFen: string;
  moves: TimedMove[];
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
    Black:
      summary.opponentType === 'stockfish'
        ? `Stockfish${summary.engineLevel === undefined ? '' : ` (Level ${summary.engineLevel})`}`
        : (summary.blackPlayerId ?? 'Black'),
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
  private readonly persistenceQueues = new Map<string, Promise<void>>();
  private readonly gameUpdateListeners = new Set<GameUpdateListener>();
  private readonly gameRemovalListeners = new Set<GameRemovalListener>();
  private readonly gameEndListeners = new Set<GameEndListener>();
  private readonly acceptedMoveListeners = new Set<AcceptedMoveListener>();
  private readonly clockTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private persistenceError: unknown;

  constructor(
    private readonly now: () => number = () => Date.now(),
    private readonly persistence: GamePersistence = NOOP_PERSISTENCE,
  ) {}

  createGame(
    whitePlayerId: string,
    timeControl = DEFAULT_TIME_CONTROL,
    mode: GameMode = 'casual',
  ): GameSummary {
    const normalizedTimeControl =
      mode === 'correspondence' ? CORRESPONDENCE_TIME_CONTROL : timeControl;
    if (
      normalizedTimeControl.initialMs < 0 ||
      (!normalizedTimeControl.unlimited && normalizedTimeControl.initialMs === 0) ||
      normalizedTimeControl.incrementMs < 0
    ) {
      throw new Error('Invalid time control');
    }

    let code = this.createCode();
    while (this.games.has(code)) code = this.createCode();

    const game: ManagedGame = {
      chess: new ChessGame(),
      moves: [],
      summary: {
        id: randomUUID(),
        code,
        mode,
        status: 'waiting',
        whitePlayerId,
        timeControl: normalizedTimeControl,
        whiteRemainingMs: normalizedTimeControl.initialMs,
        blackRemainingMs: normalizedTimeControl.initialMs,
        ...(mode === 'correspondence' ? {} : { expiresAt: this.now() + WAITING_GAME_TTL_MS }),
      },
    };
    this.games.set(code, game);
    this.enqueuePersistence(game.summary.id, () =>
      this.persistence.saveGame(game.summary, STARTING_FEN),
    );
    return this.snapshot(game);
  }

  createAiGame(whitePlayerId: string, engineLevel: number): GameSummary {
    if (!Number.isInteger(engineLevel) || engineLevel < 0 || engineLevel > 20) {
      throw new Error('Engine level must be between 0 and 20');
    }

    const waitingGame = this.createGame(whitePlayerId);
    const game = this.games.get(waitingGame.code)!;
    const startedAt = this.now();
    game.summary = {
      ...game.summary,
      status: 'active',
      opponentType: 'stockfish',
      engineLevel,
      expiresAt: undefined,
      startedAt,
      turnStartedAt: startedAt,
    };
    this.scheduleClockTimeout(game);
    this.enqueuePersistence(game.summary.id, () =>
      this.persistence.saveGame(game.summary, game.chess.getState().fen),
    );
    const snapshot = this.snapshot(game);
    this.publishGameUpdate(snapshot);
    return snapshot;
  }

  joinGame(code: string, blackPlayerId: string): GameSummary {
    const game = this.getManagedGame(code);
    if (!game) throw new Error('Game not found');
    if (game.summary.status !== 'waiting') throw new Error('Game is not waiting for a player');
    if (this.isExpired(game.summary)) throw new Error('Game has expired');
    if (game.summary.whitePlayerId === blackPlayerId)
      throw new Error('Player is already in this game');

    const startedAt = this.now();
    game.summary = {
      ...game.summary,
      blackPlayerId,
      status: 'active',
      expiresAt: undefined,
      startedAt,
      turnStartedAt: startedAt,
    };
    this.scheduleClockTimeout(game);
    this.enqueuePersistence(game.summary.id, () =>
      this.persistence.saveGame(game.summary, game.chess.getState().fen),
    );
    const snapshot = this.snapshot(game);
    this.publishGameUpdate(snapshot);
    return snapshot;
  }

  onGameUpdate(listener: GameUpdateListener): () => void {
    this.gameUpdateListeners.add(listener);
    return () => this.gameUpdateListeners.delete(listener);
  }

  onGameRemoved(listener: GameRemovalListener): () => void {
    this.gameRemovalListeners.add(listener);
    return () => this.gameRemovalListeners.delete(listener);
  }

  onGameEnded(listener: GameEndListener): () => void {
    this.gameEndListeners.add(listener);
    return () => this.gameEndListeners.delete(listener);
  }

  onMoveAccepted(listener: AcceptedMoveListener): () => void {
    this.acceptedMoveListeners.add(listener);
    return () => this.acceptedMoveListeners.delete(listener);
  }

  publishMoveAccepted(move: AcceptedMove): void {
    for (const listener of this.acceptedMoveListeners) listener(move);
  }

  resignGame(code: string, playerId: string): GameSummary {
    const game = this.getManagedGame(code);
    if (!game) throw new Error('Game not found');
    if (game.summary.status !== 'active') throw new Error('Game is not active');
    if (game.summary.whitePlayerId !== playerId && game.summary.blackPlayerId !== playerId) {
      throw new Error('Player is not part of this game');
    }

    const result = game.summary.whitePlayerId === playerId ? 'black' : 'white';
    game.summary = {
      ...game.summary,
      status: 'finished',
      result,
      finishedAt: this.now(),
      turnStartedAt: undefined,
    };
    this.scheduleClockTimeout(game);
    const snapshot = this.snapshot(game);
    this.enqueuePersistence(snapshot.id, () =>
      this.persistence.saveGame(snapshot, game.chess.getState().fen),
    );
    this.publishGameUpdate(snapshot);
    this.publishGameEnd(snapshot, result);
    return snapshot;
  }

  requestMove(code: string, playerId: string, move: Move): AcceptedMove {
    const game = this.getManagedGame(code);
    if (!game) throw new Error('Game not found');
    const timeout = this.expireIfNeeded(game);
    if (timeout) throw timeout;
    if (game.summary.status !== 'active') throw new Error('Game is not active');

    const movingColor = game.chess.getState().activeColor;
    const expectedPlayerId =
      movingColor === 'white' ? game.summary.whitePlayerId : game.summary.blackPlayerId;
    if (expectedPlayerId !== playerId) throw new Error("It is not this player's turn");

    return this.acceptMove(game, move);
  }

  requestEngineMove(code: string, move: Move): AcceptedMove {
    const game = this.getManagedGame(code);
    if (!game) throw new Error('Game not found');
    const timeout = this.expireIfNeeded(game);
    if (timeout) throw timeout;
    if (game.summary.opponentType !== 'stockfish') throw new Error('Game is not a Stockfish game');
    if (game.summary.status !== 'active') throw new Error('Game is not active');
    if (game.chess.getState().activeColor !== 'black') throw new Error('It is not the engine turn');

    return this.acceptMove(game, move);
  }

  private acceptMove(game: ManagedGame, move: Move): AcceptedMove {
    const clock = this.clockSnapshot(game);
    const state = game.chess.getState();
    const movingColor = state.activeColor;
    const remainingMs = movingColor === 'white' ? clock.whiteRemainingMs : clock.blackRemainingMs;

    const legalMove = game.chess
      .legalMoves(move.from)
      .find((candidate) => candidate.to === move.to && candidate.promotion === move.promotion);
    if (!legalMove) throw new Error('Illegal move');

    const playedMove = game.chess.move(move);
    const moveNumber = game.chess.history().length;
    const timedMove: TimedMove = {
      ...playedMove,
      elapsedMs: this.elapsedSinceGameStart(game),
    };
    game.moves.push(timedMove);
    const nextState = game.chess.getState();
    const result = moveResult(game.chess.isGameOver(), nextState.status, nextState.activeColor);
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
      ...(result ? { finishedAt: this.now() } : {}),
    };
    this.scheduleClockTimeout(game);

    const summary = this.snapshot(game);
    this.enqueuePersistence(summary.id, () => this.persistence.saveGame(summary, nextState.fen));
    this.enqueuePersistence(summary.id, () =>
      this.persistence.saveMove(summary, timedMove, nextState.fen, moveNumber),
    );
    if (result) this.publishGameEnd(summary, result);

    return {
      fen: nextState.fen,
      game: summary,
      move: timedMove,
      result,
    };
  }

  requestMoveQueued(code: string, playerId: string, move: Move): Promise<AcceptedMove> {
    return this.queueMove(code, () => this.requestMove(code, playerId, move));
  }

  requestEngineMoveQueued(code: string, move: Move): Promise<AcceptedMove> {
    return this.queueMove(code, () => this.requestEngineMove(code, move));
  }

  private queueMove(code: string, operation: () => AcceptedMove): Promise<AcceptedMove> {
    const normalizedCode = code.toUpperCase();
    const previous = this.moveQueues.get(normalizedCode) ?? Promise.resolve();
    const next = previous.then(operation);
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

  listWaitingGames(): GameSummary[] {
    return [...this.games.values()]
      .filter(
        ({ summary }) =>
          summary.status === 'waiting' &&
          summary.mode !== 'correspondence' &&
          !this.isExpired(summary),
      )
      .map((game) => this.snapshot(game));
  }

  listCorrespondenceGames(playerId: string): GameSummary[] {
    return [...this.games.values()]
      .filter(
        ({ summary }) =>
          summary.mode === 'correspondence' &&
          (summary.whitePlayerId === playerId || summary.blackPlayerId === playerId),
      )
      .map((game) => this.snapshot(game));
  }

  getExpiredWaitingGames(): GameSummary[] {
    return [...this.games.values()]
      .filter(({ summary }) => summary.status === 'waiting' && this.isExpired(summary))
      .map((game) => this.snapshot(game));
  }

  removeExpiredGame(code: string): boolean {
    const game = this.getManagedGame(code);
    if (game?.summary.status !== 'waiting' || !this.isExpired(game.summary)) return false;

    this.removeWaitingGame(game);
    return true;
  }

  deleteWaitingGame(code: string): boolean {
    const game = this.getManagedGame(code);
    if (game?.summary.status !== 'waiting') return false;

    this.removeWaitingGame(game);
    return true;
  }

  getGameSync(code: string, playerId: string): GameSync {
    return this.getGameSyncForViewer(code, playerId, false);
  }

  getGameSyncForViewer(code: string, viewerId: string, spectator = false): GameSync {
    const game = this.getManagedGame(code);
    if (!game) throw new Error('Game not found');
    if (
      !spectator &&
      game.summary.whitePlayerId !== viewerId &&
      game.summary.blackPlayerId !== viewerId
    ) {
      throw new Error('Player is not part of this game');
    }
    if (spectator && game.summary.status === 'waiting') {
      throw new Error('Game is not ready for spectators');
    }

    this.expireIfNeeded(game);
    return {
      fen: game.chess.getState().fen,
      game: this.snapshot(game),
      moves: [...game.moves],
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
    if (game.summary.status !== 'active' || isUnlimitedGame(game.summary)) return undefined;

    const clock = this.clockSnapshot(game);
    const activeColor = game.chess.getState().activeColor;
    const remainingMs = activeColor === 'white' ? clock.whiteRemainingMs : clock.blackRemainingMs;
    if (remainingMs > 0) return undefined;

    const result = activeColor === 'white' ? 'black' : 'white';
    game.summary = {
      ...game.summary,
      ...clock,
      status: 'finished',
      finishedAt: this.now(),
      result,
      turnStartedAt: undefined,
    };
    this.scheduleClockTimeout(game);
    const snapshot = this.snapshot(game);
    this.enqueuePersistence(snapshot.id, () =>
      this.persistence.saveGame(snapshot, game.chess.getState().fen),
    );
    this.publishGameUpdate(snapshot);
    this.publishGameEnd(snapshot, result);
    return new GameTimeoutError(snapshot, result);
  }

  private enqueuePersistence(gameId: string, operation: () => Promise<void>): void {
    const previous = this.persistenceQueues.get(gameId) ?? Promise.resolve();
    const pending = previous.then(operation).catch((error: unknown) => {
      this.persistenceError ??= error;
    });
    this.persistenceQueues.set(gameId, pending);
    this.pendingPersistence.add(pending);
    void pending
      .finally(() => {
        this.pendingPersistence.delete(pending);
        if (this.persistenceQueues.get(gameId) === pending) {
          this.persistenceQueues.delete(gameId);
        }
      })
      .catch(() => undefined);
  }

  private publishGameUpdate(game: GameSummary): void {
    for (const listener of this.gameUpdateListeners) listener(game);
  }

  private publishGameEnd(game: GameSummary, result: 'white' | 'black' | 'draw'): void {
    for (const listener of this.gameEndListeners) listener(game, result);
  }

  private publishGameRemoval(game: GameSummary): void {
    for (const listener of this.gameRemovalListeners) listener(game);
  }

  private removeWaitingGame(game: ManagedGame): void {
    const summary = this.snapshot(game);
    this.games.delete(summary.code);
    this.moveQueues.delete(summary.code);
    if (this.persistence.deleteGame) {
      this.enqueuePersistence(summary.id, () => this.persistence.deleteGame!(summary));
    }
    this.publishGameRemoval(summary);
  }

  private isExpired(summary: GameSummary): boolean {
    return summary.expiresAt !== undefined && summary.expiresAt <= this.now();
  }

  private snapshot(game: ManagedGame): GameSummary {
    return { ...game.summary, ...this.clockSnapshot(game) };
  }

  private createHistory(game: ManagedGame): GameHistory {
    const summary = this.snapshot(game);
    const currentFen = game.chess.getState().fen;
    const moves = [...game.moves];
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
    if (isUnlimitedGame(game.summary)) {
      return {
        whiteRemainingMs: game.summary.whiteRemainingMs,
        blackRemainingMs: game.summary.blackRemainingMs,
      };
    }
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

  private scheduleClockTimeout(game: ManagedGame): void {
    const previous = this.clockTimers.get(game.summary.code);
    if (previous) clearTimeout(previous);
    this.clockTimers.delete(game.summary.code);
    if (
      game.summary.status !== 'active' ||
      game.summary.turnStartedAt === undefined ||
      isUnlimitedGame(game.summary)
    )
      return;

    const clock = this.clockSnapshot(game);
    const remainingMs =
      game.chess.getState().activeColor === 'white'
        ? clock.whiteRemainingMs
        : clock.blackRemainingMs;
    const timer = setTimeout(
      () => {
        this.clockTimers.delete(game.summary.code);
        this.expireIfNeeded(game);
      },
      Math.max(1, Math.ceil(remainingMs)),
    );
    timer.unref?.();
    this.clockTimers.set(game.summary.code, timer);
  }

  private getManagedGame(code: string): ManagedGame | undefined {
    return this.games.get(code.toUpperCase());
  }

  private elapsedSinceGameStart(game: ManagedGame): number {
    if (game.summary.startedAt === undefined) return 0;
    return Math.max(0, this.now() - game.summary.startedAt);
  }

  private createCode(): string {
    return Array.from(
      { length: CODE_LENGTH },
      () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
    ).join('');
  }
}

function isUnlimitedGame(summary: GameSummary): boolean {
  return summary.mode === 'correspondence' || summary.timeControl.unlimited === true;
}

function moveResult(
  isGameOver: boolean,
  status: ReturnType<ChessGame['getState']>['status'],
  activeColor: ReturnType<ChessGame['getState']>['activeColor'],
): AcceptedMove['result'] {
  if (!isGameOver) return undefined;
  if (status !== 'checkmate') return 'draw';
  return activeColor === 'white' ? 'black' : 'white';
}
