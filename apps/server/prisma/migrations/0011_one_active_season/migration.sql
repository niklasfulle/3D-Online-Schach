CREATE UNIQUE INDEX "Season_one_active_key"
ON "Season"("status")
WHERE "status" = 'active';
