import { describe, expect, it, vi } from 'vitest';

import { PrismaProfileProvider, type ProfileDatabaseClient } from './ProfileService.js';

describe('profile statistics', () => {
  it('calculates totals and mode breakdowns from finished games', async () => {
    const client = {
      user: {
        findUnique: vi.fn(async () => ({
          id: 'user-1',
          username: 'alice',
          rating: 1240,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        })),
      },
      game: {
        findMany: vi.fn(async () => [
          {
            mode: 'casual',
            result: 'white',
            whitePlayerId: 'user-1',
            blackPlayerId: 'user-2',
            finishedAt: new Date('2026-02-01T00:00:00.000Z'),
          },
          {
            mode: 'ranked',
            result: 'black',
            whitePlayerId: 'user-3',
            blackPlayerId: 'user-1',
            finishedAt: new Date('2026-02-02T00:00:00.000Z'),
          },
          {
            mode: 'ranked',
            result: 'draw',
            whitePlayerId: 'user-1',
            blackPlayerId: 'user-4',
            finishedAt: new Date('2026-02-03T00:00:00.000Z'),
          },
          {
            mode: 'casual',
            result: 'white',
            whitePlayerId: 'user-5',
            blackPlayerId: 'user-1',
            finishedAt: new Date('2026-02-04T00:00:00.000Z'),
          },
        ]),
      },
      ratingEvent: {
        findMany: vi.fn(async () => [
          { createdAt: new Date('2026-02-02T00:00:00.000Z'), ratingAfter: 1218 },
          { createdAt: new Date('2026-02-03T00:00:00.000Z'), ratingAfter: 1240 },
        ]),
      },
    } as unknown as ProfileDatabaseClient;
    const provider = new PrismaProfileProvider(client);

    await expect(provider.getForUser('user-1')).resolves.toEqual({
      user: {
        id: 'user-1',
        username: 'alice',
        rating: 1240,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      stats: {
        totalGames: 4,
        wins: 2,
        losses: 1,
        draws: 1,
        ranked: { totalGames: 2, wins: 1, losses: 0, draws: 1 },
        casual: { totalGames: 2, wins: 1, losses: 1, draws: 0 },
        correspondence: { totalGames: 0, wins: 0, losses: 0, draws: 0 },
        ratingHistory: [
          { at: '2026-02-02T00:00:00.000Z', rating: 1218 },
          { at: '2026-02-03T00:00:00.000Z', rating: 1240 },
        ],
      },
    });
  });

  it('returns an initial rating snapshot when no finished games exist', async () => {
    const client = {
      user: {
        findUnique: vi.fn(async () => ({
          id: 'user-1',
          username: 'alice',
          rating: 1200,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        })),
      },
      game: { findMany: vi.fn(async () => []) },
      ratingEvent: { findMany: vi.fn(async () => []) },
    } as unknown as ProfileDatabaseClient;

    await expect(new PrismaProfileProvider(client).getForUser('user-1')).resolves.toMatchObject({
      stats: {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        ratingHistory: [{ at: '2026-01-01T00:00:00.000Z', rating: 1200 }],
      },
    });
  });

  it('returns the selected season rating history and rating', async () => {
    const client = {
      user: {
        findUnique: vi.fn(async () => ({
          id: 'user-1',
          username: 'alice',
          rating: 1400,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        })),
      },
      game: {
        findMany: vi.fn(async () => [
          {
            id: 'game-1',
            mode: 'ranked',
            result: 'white',
            whitePlayerId: 'user-1',
            blackPlayerId: 'user-2',
            finishedAt: new Date('2026-02-01T00:00:00.000Z'),
          },
        ]),
      },
      ratingEvent: {
        findMany: vi.fn(async () => [
          {
            gameId: 'game-1',
            createdAt: new Date('2026-02-01T00:00:00.000Z'),
            ratingAfter: 1288,
          },
        ]),
      },
      seasonRating: {
        findUnique: vi.fn(async () => ({ rating: 1288 })),
      },
    } as unknown as ProfileDatabaseClient;

    await expect(
      new PrismaProfileProvider(client).getForUser('user-1', 'season-1'),
    ).resolves.toMatchObject({
      user: { rating: 1288 },
      stats: {
        totalGames: 1,
        ratingHistory: [{ at: '2026-02-01T00:00:00.000Z', rating: 1288 }],
      },
    });
  });
});
