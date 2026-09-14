import type { GameMode } from '@chess3d/shared';
import type { PrismaClient } from '@prisma/client';

export const DEFAULT_HISTORY_LIMIT = 20;
export const MAX_HISTORY_LIMIT = 50;

export interface HistoryListOptions {
  limit: number;
  cursor?: string;
}

export interface HistoryPlayer {
  id: string;
  username: string;
}

export interface HistoryMove {
  moveNumber: number;
  from: string;
  to: string;
  promotion: string | null;
  san: string;
  fenAfterMove: string;
  elapsedMs: number;
}

export interface HistoryGame {
  id: string;
  code: string;
  mode: GameMode;
  result: 'white' | 'black' | 'draw' | null;
  createdAt: string;
  finishedAt: string;
  ratingBefore?: number;
  ratingAfter?: number;
  ratingDelta?: number;
  whitePlayer: HistoryPlayer | null;
  blackPlayer: HistoryPlayer | null;
  moves: HistoryMove[];
}

export interface ReplayGame extends HistoryGame {
  initialFen: string;
}

export interface HistoryPage {
  games: HistoryGame[];
  nextCursor?: string;
}

export interface HistoryProvider {
  listForUser(userId: string, options: HistoryListOptions): Promise<HistoryPage>;
  getReplayForUser?(userId: string, code: string): Promise<ReplayGame | null>;
}

export class HistoryError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}

interface HistoryCursor {
  finishedAt: string;
  id: string;
}

export class PrismaHistoryProvider implements HistoryProvider {
  constructor(private readonly client: PrismaClient) {}

  async listForUser(userId: string, options: HistoryListOptions): Promise<HistoryPage> {
    const limit = validateLimit(options.limit);
    const cursor = options.cursor ? decodeCursor(options.cursor) : undefined;
    const records = await this.client.game.findMany({
      where: {
        status: 'finished',
        finishedAt: { not: null },
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
        ...(cursor
          ? {
              AND: [
                {
                  OR: [
                    { finishedAt: { lt: new Date(cursor.finishedAt) } },
                    {
                      finishedAt: new Date(cursor.finishedAt),
                      id: { lt: cursor.id },
                    },
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: [{ finishedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        whitePlayer: { select: { id: true, username: true } },
        blackPlayer: { select: { id: true, username: true } },
        moves: {
          orderBy: { moveNumber: 'asc' },
          select: {
            moveNumber: true,
            from: true,
            to: true,
            promotion: true,
            san: true,
            fenAfterMove: true,
            elapsedMs: true,
          },
        },
        ratingEvents: {
          where: { userId },
          select: { ratingBefore: true, ratingAfter: true },
        },
      },
    });

    const hasMore = records.length > limit;
    const games = records.slice(0, limit).map((record) => toHistoryGame(record));
    const lastRecord = records[limit - 1];

    return {
      games,
      ...(hasMore && lastRecord.finishedAt
        ? {
            nextCursor: encodeCursor({
              finishedAt: lastRecord.finishedAt.toISOString(),
              id: lastRecord.id,
            }),
          }
        : {}),
    };
  }

  async getReplayForUser(userId: string, code: string): Promise<ReplayGame | null> {
    const record = await this.client.game.findFirst({
      where: {
        code: code.toUpperCase(),
        status: 'finished',
        finishedAt: { not: null },
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      },
      include: {
        whitePlayer: { select: { id: true, username: true } },
        blackPlayer: { select: { id: true, username: true } },
        moves: {
          orderBy: { moveNumber: 'asc' },
          select: {
            moveNumber: true,
            from: true,
            to: true,
            promotion: true,
            san: true,
            fenAfterMove: true,
            elapsedMs: true,
          },
        },
        ratingEvents: {
          where: { userId },
          select: { ratingBefore: true, ratingAfter: true },
        },
      },
    });

    return record ? { ...toHistoryGame(record), initialFen: record.initialFen } : null;
  }
}

function validateLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_HISTORY_LIMIT) {
    throw new HistoryError(`limit must be an integer between 1 and ${MAX_HISTORY_LIMIT}`);
  }
  return limit;
}

function encodeCursor(cursor: HistoryCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor(value: string): HistoryCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Partial<HistoryCursor>;
    if (
      typeof parsed.finishedAt !== 'string' ||
      Number.isNaN(new Date(parsed.finishedAt).getTime()) ||
      typeof parsed.id !== 'string' ||
      parsed.id.length === 0
    ) {
      throw new Error('invalid cursor');
    }
    return { finishedAt: parsed.finishedAt, id: parsed.id };
  } catch {
    throw new HistoryError('cursor is invalid');
  }
}

function toHistoryGame(record: {
  id: string;
  code: string;
  mode: string;
  result: string | null;
  createdAt: Date;
  finishedAt: Date | null;
  whitePlayer: HistoryPlayer | null;
  blackPlayer: HistoryPlayer | null;
  moves: HistoryMove[];
  ratingEvents?: Array<{ ratingBefore: number; ratingAfter: number }>;
}): HistoryGame {
  const ratingEvent = record.ratingEvents?.[0];
  const mode = toHistoryMode(record.mode);
  return {
    id: record.id,
    code: record.code,
    mode,
    result: toResult(record.result),
    createdAt: record.createdAt.toISOString(),
    finishedAt: record.finishedAt!.toISOString(),
    whitePlayer: record.whitePlayer,
    blackPlayer: record.blackPlayer,
    moves: record.moves.map((move) => ({ ...move, elapsedMs: move.elapsedMs ?? 0 })),
    ...(ratingEvent
      ? {
          ratingBefore: Math.round(ratingEvent.ratingBefore),
          ratingAfter: Math.round(ratingEvent.ratingAfter),
          ratingDelta: Math.round(ratingEvent.ratingAfter - ratingEvent.ratingBefore),
        }
      : {}),
  };
}

function toHistoryMode(mode: string): GameMode {
  if (mode === 'ranked') return 'ranked';
  if (mode === 'correspondence') return 'correspondence';
  return 'casual';
}

function toResult(value: string | null): HistoryGame['result'] {
  return value === 'white' || value === 'black' || value === 'draw' ? value : null;
}
