import { Prisma, type PrismaClient } from '@prisma/client';

import { inflateRdForInactivity, updateGlicko2, type GlickoRating } from './Glicko2.js';

export const SEASON_TIME_ZONE = 'Europe/Berlin';
export const SEASON_LENGTH_WEEKS = 8;
export const INITIAL_RATING: GlickoRating = { rating: 1200, rd: 350, volatility: 0.06 };

type RatingResult = 'white' | 'black' | 'draw';
type RatingSide = { userId: string; score: 0 | 0.5 | 1; result: 'win' | 'loss' | 'draw' };

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  rating: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface SeasonSummary {
  id: string;
  sequence: number;
  startsAt: string;
  endsAt: string;
  status: string;
  participantCount: number;
}

export interface LeaderboardPage {
  entries: LeaderboardEntry[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  currentUserEntry: LeaderboardEntry | null;
}

export const DEFAULT_LEADERBOARD_PAGE_SIZE = 20;
export const MAX_LEADERBOARD_PAGE_SIZE = 100;

export type RatingDatabaseClient = Pick<
  PrismaClient,
  '$transaction' | 'season' | 'seasonRating' | 'ratingEvent' | 'user'
>;
type RatingTransaction = Prisma.TransactionClient;

export class PrismaRatingService {
  constructor(
    private readonly client: RatingDatabaseClient,
    private readonly now: () => Date = () => new Date(),
    private readonly firstSeasonDate: string = process.env.SEASON_ONE_START ?? '2026-09-13',
  ) {}

  async recordGame(input: {
    gameId: string;
    finishedAt: Date;
    whitePlayerId: string;
    blackPlayerId: string;
    result: RatingResult;
  }): Promise<void> {
    await this.client.$transaction((tx) => this.recordGameInTransaction(input, tx));
  }

  async recordGameInTransaction(
    input: {
      gameId: string;
      finishedAt: Date;
      whitePlayerId: string;
      blackPlayerId: string;
      result: RatingResult;
    },
    tx: RatingTransaction,
  ): Promise<void> {
    const sides = sidesForResult(input.result, input.whitePlayerId, input.blackPlayerId);
    const season = await this.ensureSeason(input.finishedAt, tx);
    const existing = await tx.ratingEvent.findUnique({
      where: { gameId_userId: { gameId: input.gameId, userId: input.whitePlayerId } },
      select: { id: true },
    });
    if (existing) return;

    const ratings = await Promise.all(
      sides.map((side) =>
        tx.seasonRating.upsert({
          where: { seasonId_userId: { seasonId: season.id, userId: side.userId } },
          create: { seasonId: season.id, userId: side.userId, ...INITIAL_RATING },
          update: {},
        }),
      ),
    );
    const byUser = new Map(ratings.map((rating) => [rating.userId, rating]));
    const whiteBefore = inflateRdForInactivity(
      byUser.get(input.whitePlayerId)!,
      Math.max(0, input.finishedAt.getTime() - byUser.get(input.whitePlayerId)!.updatedAt.getTime()),
    );
    const blackBefore = inflateRdForInactivity(
      byUser.get(input.blackPlayerId)!,
      Math.max(0, input.finishedAt.getTime() - byUser.get(input.blackPlayerId)!.updatedAt.getTime()),
    );
    const whiteAfter = updateGlicko2(whiteBefore, blackBefore, sides[0].score);
    const blackAfter = updateGlicko2(blackBefore, whiteBefore, sides[1].score);

    await Promise.all(
      sides.map((side, index) => {
        const before = index === 0 ? whiteBefore : blackBefore;
        const after = index === 0 ? whiteAfter : blackAfter;
        return tx.seasonRating
          .update({
            where: { seasonId_userId: { seasonId: season.id, userId: side.userId } },
            data: {
              ...after,
              games: { increment: 1 },
              wins: { increment: side.result === 'win' ? 1 : 0 },
              draws: { increment: side.result === 'draw' ? 1 : 0 },
              losses: { increment: side.result === 'loss' ? 1 : 0 },
            },
          })
          .then(() =>
            tx.ratingEvent.create({
              data: {
                gameId: input.gameId,
                seasonId: season.id,
                userId: side.userId,
                result: side.result,
                ratingBefore: before.rating,
                ratingAfter: after.rating,
                rdBefore: before.rd,
                rdAfter: after.rd,
                volatilityBefore: before.volatility,
                volatilityAfter: after.volatility,
                createdAt: input.finishedAt,
              },
            }),
          );
      }),
    );
    await Promise.all([
      tx.user.update({
        where: { id: input.whitePlayerId },
        data: { rating: Math.round(whiteAfter.rating) },
      }),
      tx.user.update({
        where: { id: input.blackPlayerId },
        data: { rating: Math.round(blackAfter.rating) },
      }),
    ]);
  }

  async ensureSeason(
    at = this.now(),
    database: Pick<PrismaClient, 'season'> & Pick<PrismaClient, 'seasonRating' | 'ratingEvent' | 'user'> = this.client,
  ): Promise<{ id: string; startsAt: Date; endsAt: Date }> {
    const bounds = seasonBounds(at, this.firstSeasonDate);
    const sequence = bounds.sequence;
    const existingCurrent = await database.season.findUnique({
      where: { sequence },
      select: { id: true },
    });
    await this.finalizeDueSeasons(at, existingCurrent?.id ?? '', database);
    const season = await database.season.upsert({
      where: { sequence },
      create: { sequence, startsAt: bounds.startsAt, endsAt: bounds.endsAt, status: 'active' },
      update: {},
      select: { id: true, startsAt: true, endsAt: true },
    });
    return season;
  }

  async getCurrentLeaderboard(
    at = this.now(),
    page = 1,
    pageSize = DEFAULT_LEADERBOARD_PAGE_SIZE,
    userId?: string,
  ): Promise<{ season: SeasonSummary } & LeaderboardPage> {
    const season = await this.ensureSeason(at);
    const allEntries = await this.entries(season.id);
    return {
      season: await this.toSummary(season.id),
      ...paginate(allEntries, page, pageSize, userId),
    };
  }

  async listSeasons(): Promise<SeasonSummary[]> {
    const seasons = await this.client.season.findMany({ orderBy: { sequence: 'desc' } });
    return Promise.all(seasons.map((season) => this.toSummary(season.id)));
  }

  async getSeasonLeaderboard(
    id: string,
    page = 1,
    pageSize = DEFAULT_LEADERBOARD_PAGE_SIZE,
    userId?: string,
  ): Promise<({ season: SeasonSummary } & LeaderboardPage) | undefined> {
    const season = await this.client.season.findUnique({
      where: { id },
      select: { id: true, status: true, leaderboardSnapshot: true },
    });
    if (!season) return undefined;
    let entries: LeaderboardEntry[];
    if (Array.isArray(season.leaderboardSnapshot)) {
      entries = season.leaderboardSnapshot as unknown as LeaderboardEntry[];
    } else if (season.status === 'finished') {
      entries = [];
    } else {
      entries = await this.entries(id);
    }
    return { season: await this.toSummary(id), ...paginate(entries, page, pageSize, userId) };
  }

  private async finalizeDueSeasons(
    at: Date,
    currentSeasonId: string,
    database: Pick<PrismaClient, 'season' | 'seasonRating' | 'user'>,
  ): Promise<void> {
    const due = await database.season.findMany({
      where: { status: 'active', endsAt: { lte: at }, id: { not: currentSeasonId } },
      select: { id: true },
    });
    for (const season of due) {
      const entries = await this.entries(season.id, database);
      await database.season.update({
        where: { id: season.id },
        data: {
          status: 'finished',
          completedAt: at,
          leaderboardSnapshot: entries as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  private async entries(
    seasonId: string,
    database: Pick<PrismaClient, 'seasonRating'> = this.client,
  ): Promise<LeaderboardEntry[]> {
    const ratings = await database.seasonRating.findMany({
      where: { seasonId, games: { gt: 0 } },
      include: { user: { select: { username: true } } },
      orderBy: [{ rating: 'desc' }, { wins: 'desc' }, { userId: 'asc' }],
    });
    return ratings.map((rating, index) => ({
      rank: index + 1,
      userId: rating.userId,
      username: rating.user.username,
      rating: Math.round(rating.rating),
      games: rating.games,
      wins: rating.wins,
      draws: rating.draws,
      losses: rating.losses,
    }));
  }

  private async toSummary(id: string): Promise<SeasonSummary> {
    const season = await this.client.season.findUnique({
      where: { id },
      include: { _count: { select: { ratings: true } } },
    });
    if (!season) throw new Error('Season not found');
    return {
      id: season.id,
      sequence: season.sequence,
      startsAt: season.startsAt.toISOString(),
      endsAt: season.endsAt.toISOString(),
      status: season.status,
      participantCount: season._count.ratings,
    };
  }
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
  userId?: string,
): {
  entries: T[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  currentUserEntry: T | null;
} {
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const normalizedPageSize = Number.isInteger(pageSize)
    ? Math.min(Math.max(pageSize, 1), MAX_LEADERBOARD_PAGE_SIZE)
    : DEFAULT_LEADERBOARD_PAGE_SIZE;
  const start = (normalizedPage - 1) * normalizedPageSize;
  return {
    entries: items.slice(start, start + normalizedPageSize),
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total: items.length,
    hasNext: start + normalizedPageSize < items.length,
    currentUserEntry: userId
      ? (items.find((item) => (item as { userId?: string }).userId === userId) ?? null)
      : null,
  };
}

function sidesForResult(
  result: RatingResult,
  whitePlayerId: string,
  blackPlayerId: string,
): RatingSide[] {
  if (result === 'draw')
    return [
      { userId: whitePlayerId, score: 0.5, result: 'draw' },
      { userId: blackPlayerId, score: 0.5, result: 'draw' },
    ];
  const whiteWon = result === 'white';
  return [
    { userId: whitePlayerId, score: whiteWon ? 1 : 0, result: whiteWon ? 'win' : 'loss' },
    { userId: blackPlayerId, score: whiteWon ? 0 : 1, result: whiteWon ? 'loss' : 'win' },
  ];
}

export function seasonBounds(
  at: Date,
  firstSeasonDate: string,
): { sequence: number; startsAt: Date; endsAt: Date } {
  const first = berlinMidnightUtc(firstSeasonDate);
  if (at < first)
    return {
      sequence: 1,
      startsAt: first,
      endsAt: berlinMidnightUtc(addDays(firstSeasonDate, 56)),
    };
  let startDate = firstSeasonDate;
  let sequence = 1;
  while (berlinMidnightUtc(addDays(startDate, 56)) <= at) {
    startDate = addDays(startDate, 56);
    sequence += 1;
  }
  return {
    sequence,
    startsAt: berlinMidnightUtc(startDate),
    endsAt: berlinMidnightUtc(addDays(startDate, 56)),
  };
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function berlinMidnightUtc(date: string): Date {
  const guess = new Date(`${date}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SEASON_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(guess);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  const offset = localAsUtc - guess.getTime();
  return new Date(guess.getTime() - offset);
}
