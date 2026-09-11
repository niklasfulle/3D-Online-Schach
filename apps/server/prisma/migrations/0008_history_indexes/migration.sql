CREATE INDEX "Game_whitePlayerId_status_finishedAt_id_idx"
ON "Game"("whitePlayerId", "status", "finishedAt", "id");

CREATE INDEX "Game_blackPlayerId_status_finishedAt_id_idx"
ON "Game"("blackPlayerId", "status", "finishedAt", "id");
