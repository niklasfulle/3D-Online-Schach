ALTER TABLE "Game"
ADD COLUMN "opponentType" TEXT NOT NULL DEFAULT 'human',
ADD COLUMN "engineLevel" INTEGER;

ALTER TABLE "Game"
ADD CONSTRAINT "Game_opponentType_check"
CHECK ("opponentType" IN ('human', 'stockfish'));

ALTER TABLE "Game"
ADD CONSTRAINT "Game_engineLevel_check"
CHECK ("engineLevel" IS NULL OR ("engineLevel" >= 0 AND "engineLevel" <= 20));
