import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const rootDir = process.cwd()
const databasePath = resolve(rootDir, 'prisma', 'rey30verse.db')
const initSqlPath = resolve(rootDir, 'prisma', 'init.sql')
const presencePatchSql = `
CREATE TABLE "Presence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'ONLINE',
  "currentScreen" TEXT,
  "latencyMs" INTEGER,
  "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Presence_userId_key" ON "Presence"("userId");
`

const gameMatchPatchSql = `
CREATE TABLE "GameMatch" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roomId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "roundNumber" INTEGER NOT NULL DEFAULT 1,
  "trickNumber" INTEGER NOT NULL DEFAULT 1,
  "turnSeat" INTEGER NOT NULL DEFAULT 0,
  "leadSuit" TEXT,
  "crownsReleased" BOOLEAN NOT NULL DEFAULT false,
  "lastWinnerSeat" INTEGER,
  "statePayload" TEXT NOT NULL,
  "settingsPayload" TEXT NOT NULL,
  "lastActionSummary" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "GameMatch_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GameMatch_roomId_key" ON "GameMatch"("roomId");

CREATE TABLE "GameMatchEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "gameMatchId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "eventType" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "payload" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameMatchEvent_gameMatchId_fkey" FOREIGN KEY ("gameMatchId") REFERENCES "GameMatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
`

const livePhasePatchSql = `
CREATE TABLE "LiveChatMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "liveSessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveChatMessage_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LiveChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LiveGiftEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "liveSessionId" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "marketplaceItemId" TEXT,
  "itemName" TEXT NOT NULL,
  "imageKey" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "totalValue" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveGiftEvent_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LiveGiftEvent_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LiveGiftEvent_marketplaceItemId_fkey" FOREIGN KEY ("marketplaceItemId") REFERENCES "MarketplaceItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "CreatorClip" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "hostUserId" TEXT NOT NULL,
  "liveSessionId" TEXT,
  "title" TEXT NOT NULL,
  "durationLabel" TEXT NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "accentTone" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreatorClip_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CreatorClip_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
`

const phaseSevenPatchSql = `
CREATE TABLE "UserInventoryItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "marketplaceItemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "isEquipped" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "UserInventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserInventoryItem_marketplaceItemId_fkey" FOREIGN KEY ("marketplaceItemId") REFERENCES "MarketplaceItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UserInventoryItem_userId_marketplaceItemId_key" ON "UserInventoryItem"("userId", "marketplaceItemId");

CREATE TABLE "CardArtwork" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "storageProvider" TEXT,
  "storageKey" TEXT,
  "publicUrl" TEXT,
  "mimeType" TEXT NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CardArtwork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "DeckTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "styleKey" TEXT,
  "artworkId" TEXT,
  "scope" TEXT NOT NULL DEFAULT 'DECK',
  "targetCard" TEXT,
  "targetSuit" TEXT,
  "zoom" INTEGER NOT NULL DEFAULT 100,
  "rotation" INTEGER NOT NULL DEFAULT 0,
  "offsetX" INTEGER NOT NULL DEFAULT 0,
  "offsetY" INTEGER NOT NULL DEFAULT 0,
  "isEquipped" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "DeckTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DeckTemplate_styleKey_fkey" FOREIGN KEY ("styleKey") REFERENCES "DeckStyle" ("key") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DeckTemplate_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "CardArtwork" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
`

mkdirSync(dirname(databasePath), { recursive: true })

if (!existsSync(initSqlPath)) {
  console.error('[db] No se encontro prisma/init.sql.')
  process.exit(1)
}

const db = new DatabaseSync(databasePath)
const hasTable = (name) =>
  Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name))
const hasColumn = (tableName, columnName) =>
  hasTable(tableName) &&
  db
    .prepare(`PRAGMA table_info("${tableName}")`)
    .all()
    .some((column) => column.name === columnName)

const existingUserTable = hasTable('User')

if (!existingUserTable) {
  db.exec(readFileSync(initSqlPath, 'utf8'))
  console.log('[db] Esquema SQLite inicializado.')
} else {
  console.log('[db] Esquema SQLite ya presente.')

  if (!hasTable('Presence')) {
    db.exec(presencePatchSql)
    console.log('[db] Patch realtime aplicado: tabla Presence creada.')
  }

  if (!hasTable('GameMatch')) {
    db.exec(gameMatchPatchSql)
    console.log('[db] Patch de mesa aplicado: tablas GameMatch y GameMatchEvent creadas.')
  } else {
    if (!hasColumn('GameMatch', 'crownsReleased')) {
      db.exec('ALTER TABLE "GameMatch" ADD COLUMN "crownsReleased" BOOLEAN NOT NULL DEFAULT false;')
      db.exec('DELETE FROM "GameMatchEvent";')
      db.exec('DELETE FROM "GameMatch";')
      console.log('[db] Patch de mesa aplicado: columna crownsReleased creada y partidas reiniciadas.')
    }

    if (!hasTable('GameMatchEvent')) {
      db.exec(`
CREATE TABLE "GameMatchEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "gameMatchId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "eventType" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "payload" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameMatchEvent_gameMatchId_fkey" FOREIGN KEY ("gameMatchId") REFERENCES "GameMatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
`)
      console.log('[db] Patch de mesa aplicado: tabla GameMatchEvent creada.')
    }
  }

  if (!hasTable('LiveChatMessage') || !hasTable('LiveGiftEvent') || !hasTable('CreatorClip')) {
    db.exec(livePhasePatchSql)
    console.log('[db] Patch live aplicado: tablas de chat, gifts y clips creadas.')
  }

  if (!hasTable('UserInventoryItem') || !hasTable('CardArtwork') || !hasTable('DeckTemplate')) {
    db.exec(phaseSevenPatchSql)
    console.log('[db] Patch phase 7 aplicado: inventario, artworks y templates creados.')
  }

  if (hasTable('CardArtwork')) {
    if (!hasColumn('CardArtwork', 'storageProvider')) {
      db.exec('ALTER TABLE "CardArtwork" ADD COLUMN "storageProvider" TEXT;')
    }

    if (!hasColumn('CardArtwork', 'storageKey')) {
      db.exec('ALTER TABLE "CardArtwork" ADD COLUMN "storageKey" TEXT;')
    }

    if (!hasColumn('CardArtwork', 'publicUrl')) {
      db.exec('ALTER TABLE "CardArtwork" ADD COLUMN "publicUrl" TEXT;')
    }

    db.exec(`
UPDATE "CardArtwork"
SET
  "storageProvider" = COALESCE("storageProvider", 'local'),
  "storageKey" = COALESCE("storageKey", REPLACE("filePath", '/uploads/', '')),
  "publicUrl" = COALESCE("publicUrl", "filePath");
`)
    console.log('[db] Patch infra aplicado: metadata de storage sincronizada en CardArtwork.')
  }

  if (!hasColumn('User', 'passwordHash')) {
    db.exec('ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;')
    console.log('[db] Patch auth aplicado: columna passwordHash creada en User.')
  }
}

db.close()
