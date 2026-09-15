import { ChessGame, STARTING_FEN, type MoveRecord } from '@chess3d/chess-core';
import type { GameMode, GameStatus, GameSummary, TimedMove } from '@chess3d/shared';
import type { Prisma, PrismaClient } from '@prisma/client';

import { pgnHeaders, type GameHistory, type GamePersistence } from '../game/GameManager.js';

export interface RatingRecorder {
  recordGame(input: {
    gameId: string;
    finishedAt: Date;
    whitePlayerId: string;
    blackPlayerId: string;
    result: 'white' | 'black' | 'draw';
  }): Promise<void>;
  recordGameInTransaction(
    input: Parameters<RatingRecorder['recordGame']>[0],
    transaction: Prisma.TransactionClient,
  ): Promise<void>;
}

export class PrismaGamePersistence implements GamePersistence {
  constructor(
    private readonly client: PrismaClient,
    private readonly ratingRecorder?: RatingRecorder,
  ) {}

  async saveGame(summary: GameSummary, fen: string): Promise<void> {
    const finishedAt = summary.finishedAt ? new Date(summary.finishedAt) : undefined;

    await this.client.$transaction(async (transaction) => {
      const whitePlayerId = await this.ensureUser(summary.whitePlayerId, transaction);
      const blackPlayerId = await this.ensureUser(summary.blackPlayerId, transaction);
      const winnerId = await this.ensureUser(winnerPlayerId(summary), transaction);
      await transaction.game.upsert({
        where: { id: summary.id },
        create: {
          id: summary.id,
          code: summary.code,
          mode: summary.mode ?? 'casual',
          opponentType: summary.opponentType ?? 'human',
          engineLevel: summary.engineLevel,
          status: summary.status,
          initialFen: STARTING_FEN,
          currentFen: fen,
          whiteTimeMs: summary.whiteRemainingMs,
          blackTimeMs: summary.blackRemainingMs,
          incrementMs: summary.timeControl.incrementMs,
          result: summary.result,
          expiresAt: summary.expiresAt ? new Date(summary.expiresAt) : undefined,
          whitePlayerId,
          blackPlayerId,
          winnerId,
          startedAt: summary.startedAt === undefined ? undefined : new Date(summary.startedAt),
          finishedAt: finishedAt ?? (summary.status === 'finished' ? new Date() : undefined),
        },
        update: {
          code: summary.code,
          mode: summary.mode ?? 'casual',
          opponentType: summary.opponentType ?? 'human',
          engineLevel: summary.engineLevel ?? null,
          status: summary.status,
          currentFen: fen,
          whiteTimeMs: summary.whiteRemainingMs,
          blackTimeMs: summary.blackRemainingMs,
          incrementMs: summary.timeControl.incrementMs,
          result: summary.result,
          expiresAt: summary.expiresAt ? new Date(summary.expiresAt) : null,
          whitePlayerId,
          blackPlayerId,
          winnerId,
          startedAt: summary.startedAt === undefined ? undefined : new Date(summary.startedAt),
          finishedAt,
        },
      });

      if (
        this.ratingRecorder &&
        summary.mode === 'ranked' &&
        summary.status === 'finished' &&
        summary.finishedAt &&
        summary.result &&
        summary.whitePlayerId &&
        summary.blackPlayerId
      ) {
        await this.ratingRecorder.recordGameInTransaction(
          {
            gameId: summary.id,
            finishedAt: new Date(summary.finishedAt),
            whitePlayerId: whitePlayerId!,
            blackPlayerId: blackPlayerId!,
            result: summary.result,
          },
          transaction,
        );
      }
    });
  }

  async saveMove(
    summary: GameSummary,
    move: MoveRecord & { elapsedMs?: number },
    fenAfterMove: string,
    moveNumber: number,
  ): Promise<void> {
    await this.saveGame(summary, fenAfterMove);
    const playerId = await this.ensureUser(
      move.color === 'white' ? summary.whitePlayerId : summary.blackPlayerId,
    );

    await this.client.move.upsert({
      where: { gameId_moveNumber: { gameId: summary.id, moveNumber } },
      create: {
        gameId: summary.id,
        moveNumber,
        from: move.from,
        to: move.to,
        piece: move.piece,
        capturedPiece: move.captured,
        promotion: move.promotion,
        san: move.san,
        fenAfterMove,
        elapsedMs: move.elapsedMs ?? 0,
        playerId,
      },
      update: {
        from: move.from,
        to: move.to,
        piece: move.piece,
        capturedPiece: move.captured,
        promotion: move.promotion,
        san: move.san,
        fenAfterMove,
        elapsedMs: move.elapsedMs ?? 0,
        playerId,
      },
    });
  }

  async deleteGame(summary: GameSummary): Promise<void> {
    await this.client.game.delete({ where: { id: summary.id } });
  }

  async loadHistory(code: string): Promise<GameHistory | undefined> {
    const record = await this.client.game.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        blackPlayer: true,
        moves: { orderBy: { moveNumber: 'asc' } },
        whitePlayer: true,
      },
    });
    if (!record) return undefined;

    const game: GameSummary = {
      id: record.id,
      code: record.code,
      mode: toGameMode(record.mode),
      opponentType: record.opponentType === 'stockfish' ? 'stockfish' : 'human',
      engineLevel: record.engineLevel ?? undefined,
      status: toGameStatus(record.status),
      whitePlayerId: record.whitePlayer?.username,
      blackPlayerId: record.blackPlayer?.username,
      timeControl: {
        initialMs: record.whiteTimeMs,
        incrementMs: record.incrementMs,
        ...(record.mode === 'correspondence' ? { unlimited: true } : {}),
      },
      whiteRemainingMs: record.whiteTimeMs,
      blackRemainingMs: record.blackTimeMs,
      startedAt: record.startedAt?.getTime(),
      turnStartedAt: record.startedAt?.getTime(),
      result: toResult(record.result),
      finishedAt: record.finishedAt?.getTime(),
    };
    const chess = new ChessGame(record.initialFen);
    const moves: TimedMove[] = [];
    for (const move of record.moves) {
      const playedMove = chess.move({
        from: move.from as MoveRecord['from'],
        to: move.to as MoveRecord['to'],
        promotion: move.promotion as MoveRecord['promotion'],
      });
      moves.push({ ...playedMove, elapsedMs: move.elapsedMs ?? 0 });
    }

    return {
      game,
      initialFen: record.initialFen,
      currentFen: record.currentFen,
      moves,
      pgn: chess.toPgn(pgnHeaders(game)),
    };
  }

  private async ensureUser(
    playerId: string | undefined,
    database: Pick<PrismaClient, 'user'> = this.client,
  ): Promise<string | undefined> {
    if (!playerId) return undefined;

    const existingUser = await database.user.findUnique({
      where: { id: playerId },
      select: { id: true },
    });
    if (existingUser) {
      await database.user.update({
        where: { id: existingUser.id },
        data: { lastOnline: new Date() },
      });
      return existingUser.id;
    }

    const user = await database.user.upsert({
      where: { username: playerId },
      update: { lastOnline: new Date() },
      create: { username: playerId, lastOnline: new Date() },
      select: { id: true },
    });
    return user.id;
  }
}

function winnerPlayerId(summary: GameSummary): string | undefined {
  if (summary.result === 'white') return summary.whitePlayerId;
  if (summary.result === 'black') return summary.blackPlayerId;
  return undefined;
}

function toGameStatus(status: string): GameStatus {
  if (status === 'waiting' || status === 'active' || status === 'finished') return status;
  return 'finished';
}

function toGameMode(mode: string): GameMode {
  if (mode === 'correspondence') return 'correspondence';
  return mode === 'ranked' ? 'ranked' : 'casual';
}

function toResult(result: string | null): GameSummary['result'] {
  if (result === 'white' || result === 'black' || result === 'draw') return result;
  return undefined;
}
