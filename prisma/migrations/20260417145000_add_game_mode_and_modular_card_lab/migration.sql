ALTER TYPE "DeckApplyScope" ADD VALUE IF NOT EXISTS 'MODULE';
ALTER TYPE "DeckApplyScope" ADD VALUE IF NOT EXISTS 'ELEMENT';

ALTER TABLE "Room"
  ADD COLUMN IF NOT EXISTS "gameMode" TEXT NOT NULL DEFAULT 'classic-hearts';

UPDATE "Room"
SET "gameMode" = CASE
  WHEN "maxPlayers" > 4 THEN 'custom-table'
  ELSE 'classic-hearts'
END
WHERE "gameMode" IS NULL OR "gameMode" = '';

ALTER TABLE "DeckTemplate"
  ADD COLUMN IF NOT EXISTS "targetModule" TEXT,
  ADD COLUMN IF NOT EXISTS "targetElement" TEXT;
