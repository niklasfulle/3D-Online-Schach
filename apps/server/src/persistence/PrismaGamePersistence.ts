import { ChessGame, STARTING_FEN, type MoveRecord } from '@chess3d/chess-core';
import type { GameMode, GameStatus, GameSummary } from '@chess3d/shared';
import type { PrismaClient } from '@prisma/client';

import { pgnHeaders, type GameHistory, type GamePersistence } from '../game/GameManager.js';

export class PrismaGamePersistence implements GamePersistence {
  constructor(private readonly client: PrismaClient) {}

  async saveGame(summary: GameSummary, fen: string): Promise<void> {
    const whitePlayerId = await this.ensureUser(summary.whitePlayerId);
    const blackPlayerId = await this.ensureUser(summary.blackPlayerId);
    const winnerId = await this.ensureUser(winnerPlayerId(summary));

    await this.client.game.upsert({
      where: { id: summary.id },
      create: {
        id: summary.id,
        code: summary.code,
        mode: summary.mode ?? 'casual',
        status: summary.status,
        initialFen: STARTING_FEN,
        currentFen: fen,
        whiteTimeMs: summary.whiteRemainingMs,
        blackTimeMs: summary.blackRemainingMs,
        incrementMs: summary.timeControl.incrementMs,
        result: summary.result,
        whitePlayerId,
        blackPlayerId,
        winnerId,
        startedAt: summary.turnStartedAt ? new Date(summary.turnStartedAt) : undefined,
        finishedAt: summary.status === 'finished' ? new Date() : undefined,
      },
      update: {
        code: summary.code,
        mode: summary.mode ?? 'casual',
        status: summary.status,
        currentFen: fen,
        whiteTimeMs: summary.whiteRemainingMs,
        blackTimeMs: summary.blackRemainingMs,
        incrementMs: summary.timeControl.incrementMs,
        result: summary.result,
        whitePlayerId,
        blackPlayerId,
        winnerId,
        startedAt: summary.turnStartedAt ? new Date(summary.turnStartedAt) : undefined,
        finishedAt: summary.status === 'finished' ? new Date() : undefined,
      },
    });
  }

  async saveMove(
    summary: GameSummary,
    move: MoveRecord,
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
        playerId,
      },
    });
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
      status: toGameStatus(record.status),
      whitePlayerId: record.whitePlayer?.username,
      blackPlayerId: record.blackPlayer?.username,
      timeControl: {
        initialMs: record.whiteTimeMs,
        incrementMs: record.incrementMs,
      },
      whiteRemainingMs: record.whiteTimeMs,
      blackRemainingMs: record.blackTimeMs,
      turnStartedAt: record.startedAt?.getTime(),
      result: toResult(record.result),
    };
    const chess = new ChessGame(record.initialFen);
    for (const move of record.moves) {
      chess.move({
        from: move.from as MoveRecord['from'],
        to: move.to as MoveRecord['to'],
        promotion: move.promotion as MoveRecord['promotion'],
      });
    }

    return {
      game,
      initialFen: record.initialFen,
      currentFen: record.currentFen,
      moves: chess.history(),
      pgn: chess.toPgn(pgnHeaders(game)),
    };
  }

  private async ensureUser(playerId: string | undefined): Promise<string | undefined> {
    if (!playerId) return undefined;

    const user = await this.client.user.upsert({
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
  return mode === 'ranked' ? 'ranked' : 'casual';
}

function toResult(result: string | null): GameSummary['result'] {
  if (result === 'white' || result === 'black' || result === 'draw') return result;
  return undefined;
}
