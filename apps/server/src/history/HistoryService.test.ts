import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

import { PrismaHistoryProvider } from './HistoryService.js';

describe('PrismaHistoryProvider', () => {
  it('lists only finished games for the user and returns a cursor for more results', async () => {
    const findMany = vi.fn(async () => [
      createRecord('game-1', '2026-09-11T12:00:00.000Z'),
      createRecord('game-2', '2026-09-11T11:00:00.000Z'),
      createRecord('game-3', '2026-09-11T10:00:00.000Z'),
    ]);
    const provider = new PrismaHistoryProvider({ game: { findMany } } as unknown as PrismaClient);

    const page = await provider.listForUser('user-1', { limit: 2 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'finished',
          finishedAt: { not: null },
          OR: [{ whitePlayerId: 'user-1' }, { blackPlayerId: 'user-1' }],
        },
        orderBy: [{ finishedAt: 'desc' }, { id: 'desc' }],
        take: 3,
      }),
    );
    expect(page.games).toHaveLength(2);
    expect(page.games[0]).toMatchObject({
      id: 'game-1',
      code: 'ABC123',
      mode: 'ranked',
      result: 'white',
      whitePlayer: { id: 'user-1', username: 'alice' },
      blackPlayer: { id: 'user-2', username: 'bob' },
      moves: [{ moveNumber: 1, san: 'e4' }],
    });
    expect(page.nextCursor).toEqual(expect.any(String));
  });

  it('adds the cursor boundary to the next Prisma query', async () => {
    const findMany = vi.fn(async () => []);
    const provider = new PrismaHistoryProvider({ game: { findMany } } as unknown as PrismaClient);

    await provider.listForUser('user-1', {
      limit: 10,
      cursor: 'eyJmaW5pc2hlZEF0IjoiMjAyNi0wOS0xMVQxMTowMDowMC4wMDBaIiwiaWQiOiJnYW1lLTEifQ',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                { finishedAt: { lt: new Date('2026-09-11T11:00:00.000Z') } },
                { finishedAt: new Date('2026-09-11T11:00:00.000Z'), id: { lt: 'game-1' } },
              ],
            },
          ],
        }),
      }),
    );
  });

  it('identifies Stockfish and keeps its selected level in game history', async () => {
    const findMany = vi.fn(async () => [
      { ...createRecord('game-ai', '2026-09-11T12:00:00.000Z'),
        opponentType: 'stockfish',
        engineLevel: 0,
        blackPlayer: null,
      },
    ]);
    const provider = new PrismaHistoryProvider({ game: { findMany } } as unknown as PrismaClient);

    const page = await provider.listForUser('user-1', { limit: 10 });

    expect(page.games[0]).toMatchObject({
      opponentType: 'stockfish',
      engineLevel: 0,
      blackPlayer: { id: 'stockfish', username: 'Stockfish' },
    });
  });
});

function createRecord(id: string, finishedAt: string) {
  return {
    id,
    code: 'ABC123',
    mode: 'ranked',
    result: 'white',
    createdAt: new Date('2026-09-11T09:00:00.000Z'),
    finishedAt: new Date(finishedAt),
    whitePlayer: { id: 'user-1', username: 'alice' },
    blackPlayer: { id: 'user-2', username: 'bob' },
    moves: [
      {
        moveNumber: 1,
        from: 'e2',
        to: 'e4',
        promotion: null,
        san: 'e4',
        fenAfterMove: 'fen-after-e4',
      },
    ],
  };
}
