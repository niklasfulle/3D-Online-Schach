import { STARTING_FEN, type MoveRecord } from '@chess3d/chess-core';
import type { GameSummary } from '@chess3d/shared';
import type { PrismaClient } from '@prisma/client';

import type { GamePersistence } from '../game/GameManager.js';

export class PrismaGamePersistence implements GamePersistence {
  constructor(private readonly client: PrismaClient) {}

  async saveGame(summary: GameSummary, fen: string): Promise<void> {
    const whitePlayerId = await this.ensureUser(summary.whitePlayerId);
    const blackPlayerId = await this.ensureUser(summary.blackPlayerId);
    const winnerId = await this.ensureUser(
      summary.result === 'white'
        ? summary.whitePlayerId
        : summary.result === 'black'
          ? summary.blackPlayerId
          : undefined,
    );

    await this.client.game.upsert({
      where: { id: summary.id },
      create: {
        id: summary.id,
        code: summary.code,
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
