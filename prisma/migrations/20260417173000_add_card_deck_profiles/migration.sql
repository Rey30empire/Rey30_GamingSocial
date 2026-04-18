CREATE TABLE IF NOT EXISTS "rey30verse"."CardDeckProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deckKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CardDeckProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CardDeckProfile_userId_deckKey_key"
  ON "rey30verse"."CardDeckProfile"("userId", "deckKey");

CREATE INDEX IF NOT EXISTS "CardDeckProfile_userId_isActive_idx"
  ON "rey30verse"."CardDeckProfile"("userId", "isActive");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CardDeckProfile_userId_fkey'
  ) THEN
    ALTER TABLE "rey30verse"."CardDeckProfile"
      ADD CONSTRAINT "CardDeckProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "rey30verse"."User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "rey30verse"."CardDeckProfile" ("id", "userId", "deckKey", "name", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT
  CONCAT('default-card-deck-', "id"),
  "id",
  'default',
  'Mazo principal',
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "rey30verse"."User"
ON CONFLICT ("userId", "deckKey") DO NOTHING;
