ALTER TABLE "Game" ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE INDEX "Game_status_expiresAt_idx" ON "Game"("status", "expiresAt");
