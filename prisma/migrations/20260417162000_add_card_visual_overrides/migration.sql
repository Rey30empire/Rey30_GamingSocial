CREATE TABLE IF NOT EXISTS "CardVisualOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deckKey" TEXT NOT NULL DEFAULT 'default',
  "scope" "DeckApplyScope" NOT NULL DEFAULT 'DECK',
  "targetCard" TEXT,
  "targetSuit" TEXT,
  "targetModule" TEXT,
  "targetElement" TEXT,
  "styleKey" TEXT,
  "artworkId" TEXT,
  "sourceTemplateId" TEXT,
  "zoom" INTEGER NOT NULL DEFAULT 100,
  "rotation" INTEGER NOT NULL DEFAULT 0,
  "offsetX" INTEGER NOT NULL DEFAULT 0,
  "offsetY" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CardVisualOverride_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CardVisualOverride_userId_deckKey_isActive_idx"
  ON "CardVisualOverride"("userId", "deckKey", "isActive");

CREATE INDEX IF NOT EXISTS "CardVisualOverride_userId_deckKey_scope_idx"
  ON "CardVisualOverride"("userId", "deckKey", "scope");

CREATE INDEX IF NOT EXISTS "CardVisualOverride_sourceTemplateId_idx"
  ON "CardVisualOverride"("sourceTemplateId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CardVisualOverride_userId_fkey'
  ) THEN
    ALTER TABLE "CardVisualOverride"
      ADD CONSTRAINT "CardVisualOverride_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CardVisualOverride_styleKey_fkey'
  ) THEN
    ALTER TABLE "CardVisualOverride"
      ADD CONSTRAINT "CardVisualOverride_styleKey_fkey"
      FOREIGN KEY ("styleKey") REFERENCES "DeckStyle"("key") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CardVisualOverride_artworkId_fkey'
  ) THEN
    ALTER TABLE "CardVisualOverride"
      ADD CONSTRAINT "CardVisualOverride_artworkId_fkey"
      FOREIGN KEY ("artworkId") REFERENCES "CardArtwork"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
