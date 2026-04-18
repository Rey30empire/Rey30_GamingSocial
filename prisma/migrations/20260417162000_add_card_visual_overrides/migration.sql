CREATE TABLE IF NOT EXISTS "rey30verse"."CardVisualOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deckKey" TEXT NOT NULL DEFAULT 'default',
  "scope" "rey30verse"."DeckApplyScope" NOT NULL DEFAULT 'DECK',
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
  ON "rey30verse"."CardVisualOverride"("userId", "deckKey", "isActive");

CREATE INDEX IF NOT EXISTS "CardVisualOverride_userId_deckKey_scope_idx"
  ON "rey30verse"."CardVisualOverride"("userId", "deckKey", "scope");

CREATE INDEX IF NOT EXISTS "CardVisualOverride_sourceTemplateId_idx"
  ON "rey30verse"."CardVisualOverride"("sourceTemplateId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CardVisualOverride_userId_fkey'
  ) THEN
    ALTER TABLE "rey30verse"."CardVisualOverride"
      ADD CONSTRAINT "CardVisualOverride_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "rey30verse"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CardVisualOverride_styleKey_fkey'
  ) THEN
    ALTER TABLE "rey30verse"."CardVisualOverride"
      ADD CONSTRAINT "CardVisualOverride_styleKey_fkey"
      FOREIGN KEY ("styleKey") REFERENCES "rey30verse"."DeckStyle"("key") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CardVisualOverride_artworkId_fkey'
  ) THEN
    ALTER TABLE "rey30verse"."CardVisualOverride"
      ADD CONSTRAINT "CardVisualOverride_artworkId_fkey"
      FOREIGN KEY ("artworkId") REFERENCES "rey30verse"."CardArtwork"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
