CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "completedAt" TIMESTAMP(3),
    "leaderboardSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeasonRating" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 1200,
    "rd" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "volatility" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
    "games" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SeasonRating_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RatingEvent" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "ratingBefore" DOUBLE PRECISION NOT NULL,
    "ratingAfter" DOUBLE PRECISION NOT NULL,
    "rdBefore" DOUBLE PRECISION NOT NULL,
    "rdAfter" DOUBLE PRECISION NOT NULL,
    "volatilityBefore" DOUBLE PRECISION NOT NULL,
    "volatilityAfter" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RatingEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Season_sequence_key" ON "Season"("sequence");
CREATE INDEX "Season_status_startsAt_endsAt_idx" ON "Season"("status", "startsAt", "endsAt");
CREATE UNIQUE INDEX "SeasonRating_seasonId_userId_key" ON "SeasonRating"("seasonId", "userId");
CREATE INDEX "SeasonRating_seasonId_rating_idx" ON "SeasonRating"("seasonId", "rating");
CREATE UNIQUE INDEX "RatingEvent_gameId_userId_key" ON "RatingEvent"("gameId", "userId");
CREATE INDEX "RatingEvent_seasonId_userId_createdAt_idx" ON "RatingEvent"("seasonId", "userId", "createdAt");

ALTER TABLE "SeasonRating" ADD CONSTRAINT "SeasonRating_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeasonRating" ADD CONSTRAINT "SeasonRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RatingEvent" ADD CONSTRAINT "RatingEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RatingEvent" ADD CONSTRAINT "RatingEvent_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RatingEvent" ADD CONSTRAINT "RatingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
