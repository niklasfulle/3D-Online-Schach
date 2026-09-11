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
  ratingHistory: RatingSnapshot[];
}

export interface UserProfile {
  user: ProfileUser;
  stats: ProfileStats;
}

export interface ProfileProvider {
  getForUser(userId: string): Promise<UserProfile | undefined>;
}

export type ProfileDatabaseClient = Pick<PrismaClient, 'user' | 'game'>;

type FinishedGame = {
  mode: string;
  result: string | null;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  finishedAt: Date | null;
};

export class PrismaProfileProvider implements ProfileProvider {
  constructor(private readonly client: ProfileDatabaseClient) {}

  async getForUser(userId: string): Promise<UserProfile | undefined> {
    const user = await this.client.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, rating: true, createdAt: true },
    });
    if (!user) return undefined;

    const games = await this.client.game.findMany({
      where: {
        status: 'finished',
        finishedAt: { not: null },
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      },
      orderBy: { finishedAt: 'asc' },
      select: {
        mode: true,
        result: true,
        whitePlayerId: true,
        blackPlayerId: true,
        finishedAt: true,
      },
    });

    const stats = createEmptyStats();
    const ratingHistory: RatingSnapshot[] = [];
    for (const game of games as FinishedGame[]) {
      const breakdown = game.mode === 'ranked' ? stats.ranked : stats.casual;
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

      if (game.finishedAt)
        ratingHistory.push({ at: game.finishedAt.toISOString(), rating: user.rating });
    }

    stats.ratingHistory = ratingHistory.length
      ? ratingHistory
      : [{ at: user.createdAt.toISOString(), rating: user.rating }];

    return {
      user: {
        id: user.id,
        username: user.username,
        rating: user.rating,
        createdAt: user.createdAt.toISOString(),
      },
      stats,
    };
  }
}

function createEmptyBreakdown(): ProfileBreakdown {
  return { totalGames: 0, wins: 0, losses: 0, draws: 0 };
}

function createEmptyStats(): ProfileStats {
  return {
    ...createEmptyBreakdown(),
    ranked: createEmptyBreakdown(),
    casual: createEmptyBreakdown(),
    ratingHistory: [],
  };
}
