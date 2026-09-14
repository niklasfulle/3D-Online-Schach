import type { PrismaClient } from '@prisma/client';

export interface ProfileUser {
  id: string;
  username: string;
  rating: number;
  createdAt: string;
}

export interface ProfileBreakdown {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface RatingSnapshot {
  at: string;
  rating: number;
}

export interface ProfileStats extends ProfileBreakdown {
  ranked: ProfileBreakdown;
  casual: ProfileBreakdown;
  correspondence: ProfileBreakdown;
  ratingHistory: RatingSnapshot[];
}

export interface UserProfile {
  user: ProfileUser;
  stats: ProfileStats;
}

export interface ProfileProvider {
  getForUser(userId: string, seasonId?: string): Promise<UserProfile | undefined>;
}

export type ProfileDatabaseClient = Pick<
  PrismaClient,
  'user' | 'game' | 'ratingEvent' | 'seasonRating'
> & { season?: PrismaClient['season'] };

type FinishedGame = {
  id: string;
  mode: string;
  result: string | null;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  finishedAt: Date | null;
};

export class PrismaProfileProvider implements ProfileProvider {
  constructor(private readonly client: ProfileDatabaseClient) {}

  async getForUser(userId: string, seasonId?: string): Promise<UserProfile | undefined> {
    const user = await this.client.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, rating: true, createdAt: true },
    });
    if (!user) return undefined;

    const effectiveSeasonId = await resolveSeasonId(this.client, seasonId);

    const games = await this.client.game.findMany({
      where: {
        status: 'finished',
        finishedAt: { not: null },
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      },
      orderBy: { finishedAt: 'asc' },
      select: {
        mode: true,
        id: true,
        result: true,
        whitePlayerId: true,
        blackPlayerId: true,
        finishedAt: true,
      },
    });
    const ratingEvents = await this.client.ratingEvent.findMany({
      where: { userId, ...(effectiveSeasonId ? { seasonId: effectiveSeasonId } : {}) },
      orderBy: { createdAt: 'asc' },
      select: { gameId: true, createdAt: true, ratingAfter: true },
    });

    const seasonRating = await findSeasonRating(this.client, effectiveSeasonId, userId);
    const visibleRating = seasonRating ? Math.round(seasonRating.rating) : user.rating;
    const stats = createProfileStats(
      games as FinishedGame[],
      userId,
      effectiveSeasonId,
      ratingEvents,
      user.createdAt,
      visibleRating,
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        rating: visibleRating,
        createdAt: user.createdAt.toISOString(),
      },
      stats,
    };
  }
}

async function resolveSeasonId(
  client: ProfileDatabaseClient,
  seasonId: string | undefined,
): Promise<string | undefined> {
  if (seasonId || !client.season) return seasonId;
  const activeSeason = await client.season.findFirst({
    where: { status: 'active' },
    orderBy: { sequence: 'desc' },
    select: { id: true },
  });
  return activeSeason?.id;
}

async function findSeasonRating(
  client: ProfileDatabaseClient,
  seasonId: string | undefined,
  userId: string,
): Promise<{ rating: number } | null> {
  if (!seasonId) return null;
  return client.seasonRating.findUnique({
    where: { seasonId_userId: { seasonId, userId } },
    select: { rating: true },
  });
}

function createProfileStats(
  games: FinishedGame[],
  userId: string,
  seasonId: string | undefined,
  ratingEvents: Array<{ gameId: string; createdAt: Date; ratingAfter: number }>,
  createdAt: Date,
  visibleRating: number,
): ProfileStats {
  const stats = createEmptyStats();
  const seasonalGameIds = seasonId ? new Set(ratingEvents.map((event) => event.gameId)) : null;
  for (const game of games) {
    if (seasonalGameIds && !seasonalGameIds.has(game.id)) continue;
    recordGameOutcome(stats, game, userId);
  }
  stats.ratingHistory = ratingHistory(ratingEvents, createdAt, visibleRating);
  return stats;
}

function recordGameOutcome(stats: ProfileStats, game: FinishedGame, userId: string): void {
  const breakdown = breakdownForMode(stats, game.mode);
  breakdown.totalGames += 1;
  stats.totalGames += 1;
  const userColor = game.whitePlayerId === userId ? 'white' : 'black';
  if (game.result === 'draw') {
    breakdown.draws += 1;
    stats.draws += 1;
  } else if (game.result === userColor) {
    breakdown.wins += 1;
    stats.wins += 1;
  } else if (game.result === 'white' || game.result === 'black') {
    breakdown.losses += 1;
    stats.losses += 1;
  }
}

function breakdownForMode(stats: ProfileStats, mode: string): ProfileBreakdown {
  if (mode === 'ranked') return stats.ranked;
  if (mode === 'correspondence') return stats.correspondence;
  return stats.casual;
}

function ratingHistory(
  events: Array<{ createdAt: Date; ratingAfter: number }>,
  createdAt: Date,
  visibleRating: number,
): RatingSnapshot[] {
  if (!events.length) return [{ at: createdAt.toISOString(), rating: visibleRating }];
  return events.map((event) => ({
    at: event.createdAt.toISOString(),
    rating: Math.round(event.ratingAfter),
  }));
}

function createEmptyBreakdown(): ProfileBreakdown {
  return { totalGames: 0, wins: 0, losses: 0, draws: 0 };
}

function createEmptyStats(): ProfileStats {
  return {
    ...createEmptyBreakdown(),
    ranked: createEmptyBreakdown(),
    casual: createEmptyBreakdown(),
    correspondence: createEmptyBreakdown(),
    ratingHistory: [],
  };
}
