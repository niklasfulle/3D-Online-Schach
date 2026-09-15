import { describe, expect, it, vi } from 'vitest';

import {
  INITIAL_RATING,
  PrismaRatingService,
  paginate,
  seasonBounds,
  type RatingDatabaseClient,
} from './RatingService.js';

const finishedAt = new Date('2026-09-20T12:00:00.000Z');

function createRatingDatabase() {
  const transaction = {
    season: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({
        id: 'season-1',
        startsAt: new Date('2026-09-12T22:00:00.000Z'),
        endsAt: new Date('2026-11-07T23:00:00.000Z'),
      }),
      update: vi.fn().mockResolvedValue(undefined),
    },
    seasonRating: {
      upsert: vi.fn().mockImplementation(
        (args: { create: { seasonId: string; userId: string } }) =>
          Promise.resolve({
            ...INITIAL_RATING,
            ...args.create,
            updatedAt: finishedAt,
          }),
      ),
      update: vi.fn().mockResolvedValue(undefined),
      findMany: vi.fn().mockResolvedValue([]),
    },
    ratingEvent: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(undefined),
    },
    user: {
      update: vi.fn().mockResolvedValue(undefined),
    },
  };
  const client = {
    ...transaction,
    $transaction: vi.fn(async (operation: (tx: never) => Promise<unknown>) =>
      operation(transaction as never),
    ),
  } as unknown as RatingDatabaseClient;

  return { client, transaction };
}

function currentSeasonSummary(id: string, sequence: number, participantCount = 2) {
  return {
    id,
    sequence,
    startsAt: new Date('2026-09-12T22:00:00.000Z'),
    endsAt: new Date('2026-11-07T23:00:00.000Z'),
    status: 'active',
    _count: { ratings: participantCount },
  };
}

function ratingRow(
  userId: string,
  username: string,
  rating: number,
  stats = { games: 4, wins: 2, draws: 1, losses: 1 },
) {
  return { userId, username, rating, ...stats, user: { username } };
}

describe('seasonBounds', () => {
  it('starts every season on Sunday at Berlin midnight', () => {
    const first = seasonBounds(new Date('2026-09-13T00:00:00.000Z'), '2026-09-13');
    const second = seasonBounds(new Date('2026-11-08T00:00:00.000Z'), '2026-09-13');

    expect(first.sequence).toBe(1);
    expect(first.startsAt.toISOString()).toBe('2026-09-12T22:00:00.000Z');
    expect(first.endsAt.toISOString()).toBe('2026-11-07T23:00:00.000Z');
    expect(second.sequence).toBe(2);
    expect(second.startsAt.toISOString()).toBe('2026-11-07T23:00:00.000Z');
  });

  it('uses the next season at the exact end instant', () => {
    const atBoundary = seasonBounds(new Date('2026-11-07T23:00:00.000Z'), '2026-09-13');
    expect(atBoundary.sequence).toBe(2);
  });
});

describe('paginate', () => {
  it('keeps global order and reports the next page', () => {
    expect(paginate(['a', 'b', 'c'], 2, 2)).toEqual({
      entries: ['c'],
      page: 2,
      pageSize: 2,
      total: 3,
      hasNext: false,
      currentUserEntry: null,
    });
  });

  it('normalizes invalid page values and caps the requested page size', () => {
    const entries = Array.from({ length: 3 }, (_, index) => ({ userId: `user-${index + 1}` }));

    expect(paginate(entries, 0, 500, 'missing')).toEqual({
      entries,
      page: 1,
      pageSize: 100,
      total: 3,
      hasNext: false,
      currentUserEntry: null,
    });
    expect(paginate(entries, -1, -5, 'user-2')).toMatchObject({
      entries: [entries[0]],
      page: 1,
      pageSize: 1,
      currentUserEntry: entries[1],
    });
  });
});

describe('PrismaRatingService', () => {
  it.each([
    { result: 'white' as const, whiteResult: 'win', blackResult: 'loss' },
    { result: 'black' as const, whiteResult: 'loss', blackResult: 'win' },
    { result: 'draw' as const, whiteResult: 'draw', blackResult: 'draw' },
  ])('records a $result game for both players', async ({ result, whiteResult, blackResult }) => {
    const { client, transaction } = createRatingDatabase();
    const service = new PrismaRatingService(client, () => finishedAt, '2026-09-13');

    await service.recordGame({
      gameId: 'game-1',
      finishedAt,
      whitePlayerId: 'white-player',
      blackPlayerId: 'black-player',
      result,
    });

    expect(client.$transaction).toHaveBeenCalledOnce();
    expect(transaction.seasonRating.upsert).toHaveBeenCalledTimes(2);
    expect(transaction.seasonRating.update).toHaveBeenCalledTimes(2);
    expect(transaction.ratingEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gameId: 'game-1',
          seasonId: 'season-1',
          userId: 'white-player',
          result: whiteResult,
          createdAt: finishedAt,
        }),
      }),
    );
    expect(transaction.ratingEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gameId: 'game-1',
          seasonId: 'season-1',
          userId: 'black-player',
          result: blackResult,
          createdAt: finishedAt,
        }),
      }),
    );
    expect(transaction.user.update).toHaveBeenCalledTimes(2);
  });

  it('does not update ratings or create rating events when a game was already recorded', async () => {
    const { client, transaction } = createRatingDatabase();
    transaction.ratingEvent.findUnique.mockResolvedValueOnce({ id: 'existing-event' });
    const service = new PrismaRatingService(client, () => finishedAt, '2026-09-13');

    await service.recordGame({
      gameId: 'game-1',
      finishedAt,
      whitePlayerId: 'white-player',
      blackPlayerId: 'black-player',
      result: 'white',
    });

    expect(transaction.seasonRating.upsert).not.toHaveBeenCalled();
    expect(transaction.seasonRating.update).not.toHaveBeenCalled();
    expect(transaction.ratingEvent.create).not.toHaveBeenCalled();
    expect(transaction.user.update).not.toHaveBeenCalled();
  });

  it('creates the season for the date and finalizes due seasons with a leaderboard snapshot', async () => {
    const { client, transaction } = createRatingDatabase();
    transaction.season.findUnique.mockResolvedValueOnce({ id: 'season-2' });
    transaction.season.findMany.mockResolvedValueOnce([{ id: 'season-1' }]);
    transaction.seasonRating.findMany.mockResolvedValueOnce([
      ratingRow('alice', 'Alice', 1542.7),
      ratingRow('bob', 'Bob', 1488.2),
    ]);
    const service = new PrismaRatingService(client, () => finishedAt, '2026-09-13');

    const season = await service.ensureSeason(finishedAt);

    expect(season).toEqual({
      id: 'season-1',
      startsAt: new Date('2026-09-12T22:00:00.000Z'),
      endsAt: new Date('2026-11-07T23:00:00.000Z'),
    });
    expect(transaction.season.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sequence: 1 },
        create: expect.objectContaining({
          sequence: 1,
          startsAt: new Date('2026-09-12T22:00:00.000Z'),
          endsAt: new Date('2026-11-07T23:00:00.000Z'),
          status: 'active',
        }),
      }),
    );
    expect(transaction.season.update).toHaveBeenCalledWith({
      where: { id: 'season-1' },
      data: {
        status: 'finished',
        completedAt: finishedAt,
        leaderboardSnapshot: [
          {
            rank: 1,
            userId: 'alice',
            username: 'Alice',
            rating: 1543,
            games: 4,
            wins: 2,
            draws: 1,
            losses: 1,
          },
          {
            rank: 2,
            userId: 'bob',
            username: 'Bob',
            rating: 1488,
            games: 4,
            wins: 2,
            draws: 1,
            losses: 1,
          },
        ],
      },
    });
  });

  it('returns a paginated current leaderboard and the requested player entry', async () => {
    const { client, transaction } = createRatingDatabase();
    transaction.season.findUnique
      .mockResolvedValueOnce({ id: 'season-1' })
      .mockResolvedValueOnce(currentSeasonSummary('season-1', 1));
    transaction.seasonRating.findMany.mockResolvedValueOnce([
      ratingRow('alice', 'Alice', 1500.4),
      ratingRow('bob', 'Bob', 1400.2),
    ]);
    const service = new PrismaRatingService(client, () => finishedAt, '2026-09-13');

    const leaderboard = await service.getCurrentLeaderboard(finishedAt, 1, 1, 'bob');

    expect(leaderboard).toMatchObject({
      season: {
        id: 'season-1',
        sequence: 1,
        status: 'active',
        participantCount: 2,
      },
      entries: [
        {
          rank: 1,
          userId: 'alice',
          username: 'Alice',
          rating: 1500,
        },
      ],
      page: 1,
      pageSize: 1,
      total: 2,
      hasNext: true,
      currentUserEntry: {
        rank: 2,
        userId: 'bob',
        username: 'Bob',
        rating: 1400,
      },
    });
  });

  it('lists seasons newest first with ISO dates and participant counts', async () => {
    const { client, transaction } = createRatingDatabase();
    transaction.season.findMany.mockResolvedValueOnce([{ id: 'season-2' }, { id: 'season-1' }]);
    transaction.season.findUnique
      .mockResolvedValueOnce({ ...currentSeasonSummary('season-2', 2), status: 'active' })
      .mockResolvedValueOnce({ ...currentSeasonSummary('season-1', 1, 7), status: 'finished' });
    const service = new PrismaRatingService(client, () => finishedAt, '2026-09-13');

    await expect(service.listSeasons()).resolves.toEqual([
      {
        id: 'season-2',
        sequence: 2,
        startsAt: '2026-09-12T22:00:00.000Z',
        endsAt: '2026-11-07T23:00:00.000Z',
        status: 'active',
        participantCount: 2,
      },
      {
        id: 'season-1',
        sequence: 1,
        startsAt: '2026-09-12T22:00:00.000Z',
        endsAt: '2026-11-07T23:00:00.000Z',
        status: 'finished',
        participantCount: 7,
      },
    ]);
  });

  it('uses the saved snapshot for a finished season leaderboard', async () => {
    const { client, transaction } = createRatingDatabase();
    const snapshot = [
      {
        rank: 1,
        userId: 'alice',
        username: 'Alice',
        rating: 1600,
        games: 8,
        wins: 6,
        draws: 1,
        losses: 1,
      },
    ];
    transaction.season.findUnique
      .mockResolvedValueOnce({ id: 'season-1', status: 'finished', leaderboardSnapshot: snapshot })
      .mockResolvedValueOnce({ ...currentSeasonSummary('season-1', 1), status: 'finished' });
    const service = new PrismaRatingService(client, () => finishedAt, '2026-09-13');

    const leaderboard = await service.getSeasonLeaderboard('season-1', 1, 20, 'alice');

    expect(leaderboard).toMatchObject({
      season: { id: 'season-1', status: 'finished' },
      entries: snapshot,
      total: 1,
      currentUserEntry: snapshot[0],
    });
    expect(transaction.seasonRating.findMany).not.toHaveBeenCalled();
  });

  it('returns an empty board for a finished season without a snapshot', async () => {
    const { client, transaction } = createRatingDatabase();
    transaction.season.findUnique
      .mockResolvedValueOnce({ id: 'season-1', status: 'finished', leaderboardSnapshot: null })
      .mockResolvedValueOnce({ ...currentSeasonSummary('season-1', 1), status: 'finished' });
    const service = new PrismaRatingService(client, () => finishedAt, '2026-09-13');

    await expect(service.getSeasonLeaderboard('season-1')).resolves.toMatchObject({
      entries: [],
      total: 0,
      hasNext: false,
      currentUserEntry: null,
    });
    expect(transaction.seasonRating.findMany).not.toHaveBeenCalled();
  });

  it('reads live ratings for an active historical season and returns undefined for an unknown season', async () => {
    const { client, transaction } = createRatingDatabase();
    transaction.season.findUnique
      .mockResolvedValueOnce({ id: 'season-2', status: 'active', leaderboardSnapshot: null })
      .mockResolvedValueOnce(currentSeasonSummary('season-2', 2))
      .mockResolvedValueOnce(null);
    transaction.seasonRating.findMany.mockResolvedValueOnce([ratingRow('alice', 'Alice', 1350.1)]);
    const service = new PrismaRatingService(client, () => finishedAt, '2026-09-13');

    await expect(service.getSeasonLeaderboard('season-2')).resolves.toMatchObject({
      entries: [{ rank: 1, userId: 'alice', username: 'Alice', rating: 1350 }],
      total: 1,
    });
    await expect(service.getSeasonLeaderboard('missing')).resolves.toBeUndefined();
    expect(transaction.seasonRating.findMany).toHaveBeenCalledOnce();
  });
});
