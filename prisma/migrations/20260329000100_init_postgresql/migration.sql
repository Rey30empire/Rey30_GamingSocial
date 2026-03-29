-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('GLOBAL', 'PRIVATE', 'GROUP', 'GAME');

-- CreateEnum
CREATE TYPE "RoomVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'STARTING', 'FULL', 'LIVE');

-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('LIVE', 'OFFLINE', 'ENDED');

-- CreateEnum
CREATE TYPE "PresenceState" AS ENUM ('ONLINE', 'AWAY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "GameMatchStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "MarketplaceItemType" AS ENUM ('DECK', 'GIFT', 'BADGE', 'THEME');

-- CreateEnum
CREATE TYPE "CurrencyType" AS ENUM ('COINS', 'GEMS');

-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "DeckApplyScope" AS ENUM ('DECK', 'CARD', 'SUIT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarSeed" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "roleLine" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "following" INTEGER NOT NULL DEFAULT 0,
    "loves" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "gems" INTEGER NOT NULL DEFAULT 0,
    "elo" INTEGER NOT NULL DEFAULT 0,
    "rankLabel" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL,
    "highlightLabel" TEXT NOT NULL,
    "highlightCopy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionCard" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CollectionCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapItem" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RoadmapItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineTask" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "RoomType" NOT NULL,
    "visibility" "RoomVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
    "mode" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "currentPlayers" INTEGER NOT NULL DEFAULT 1,
    "maxPlayers" INTEGER NOT NULL DEFAULT 4,
    "onlineCount" INTEGER NOT NULL DEFAULT 0,
    "bots" INTEGER NOT NULL DEFAULT 0,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "pointsRequired" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isVoiceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isRanked" BOOLEAN NOT NULL DEFAULT false,
    "lastMessagePreview" TEXT NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomMembership" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "seatOrder" INTEGER NOT NULL DEFAULT 0,
    "seatLabel" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "roomId" TEXT,
    "title" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "viewers" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "thumbnailSeed" TEXT NOT NULL,
    "status" "StreamStatus" NOT NULL DEFAULT 'LIVE',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveChatMessage" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveGiftEvent" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "marketplaceItemId" TEXT,
    "itemName" TEXT NOT NULL,
    "imageKey" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalValue" INTEGER NOT NULL,
    "currency" "CurrencyType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveGiftEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorClip" (
    "id" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "liveSessionId" TEXT,
    "title" TEXT NOT NULL,
    "durationLabel" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "accentTone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" "PresenceState" NOT NULL DEFAULT 'ONLINE',
    "currentScreen" TEXT,
    "latencyMs" INTEGER,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameMatch" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" "GameMatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "trickNumber" INTEGER NOT NULL DEFAULT 1,
    "turnSeat" INTEGER NOT NULL DEFAULT 0,
    "leadSuit" TEXT,
    "crownsReleased" BOOLEAN NOT NULL DEFAULT false,
    "lastWinnerSeat" INTEGER,
    "statePayload" TEXT NOT NULL,
    "settingsPayload" TEXT NOT NULL,
    "lastActionSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameMatchEvent" (
    "id" TEXT NOT NULL,
    "gameMatchId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "eventType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameMatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeckStyle" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradientFrom" TEXT NOT NULL,
    "gradientTo" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeckStyle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" "CurrencyType" NOT NULL,
    "imageKey" TEXT NOT NULL,
    "type" "MarketplaceItemType" NOT NULL,
    "rarity" "ItemRarity" NOT NULL,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInventoryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketplaceItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardArtwork" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "storageProvider" TEXT,
    "storageKey" TEXT,
    "publicUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardArtwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeckTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "styleKey" TEXT,
    "artworkId" TEXT,
    "scope" "DeckApplyScope" NOT NULL DEFAULT 'DECK',
    "targetCard" TEXT,
    "targetSuit" TEXT,
    "zoom" INTEGER NOT NULL DEFAULT 100,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "offsetX" INTEGER NOT NULL DEFAULT 0,
    "offsetY" INTEGER NOT NULL DEFAULT 0,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeckTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_username_key" ON "Profile"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Room_slug_key" ON "Room"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RoomMembership_roomId_userId_key" ON "RoomMembership"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveSession_roomId_key" ON "LiveSession"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_userId_key" ON "Presence"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameMatch_roomId_key" ON "GameMatch"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "DeckStyle_key_key" ON "DeckStyle"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserInventoryItem_userId_marketplaceItemId_key" ON "UserInventoryItem"("userId", "marketplaceItemId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionCard" ADD CONSTRAINT "CollectionCard_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapItem" ADD CONSTRAINT "RoadmapItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMembership" ADD CONSTRAINT "RoomMembership_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMembership" ADD CONSTRAINT "RoomMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveChatMessage" ADD CONSTRAINT "LiveChatMessage_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveChatMessage" ADD CONSTRAINT "LiveChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveGiftEvent" ADD CONSTRAINT "LiveGiftEvent_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveGiftEvent" ADD CONSTRAINT "LiveGiftEvent_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveGiftEvent" ADD CONSTRAINT "LiveGiftEvent_marketplaceItemId_fkey" FOREIGN KEY ("marketplaceItemId") REFERENCES "MarketplaceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorClip" ADD CONSTRAINT "CreatorClip_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorClip" ADD CONSTRAINT "CreatorClip_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMatch" ADD CONSTRAINT "GameMatch_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMatchEvent" ADD CONSTRAINT "GameMatchEvent_gameMatchId_fkey" FOREIGN KEY ("gameMatchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInventoryItem" ADD CONSTRAINT "UserInventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInventoryItem" ADD CONSTRAINT "UserInventoryItem_marketplaceItemId_fkey" FOREIGN KEY ("marketplaceItemId") REFERENCES "MarketplaceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardArtwork" ADD CONSTRAINT "CardArtwork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckTemplate" ADD CONSTRAINT "DeckTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckTemplate" ADD CONSTRAINT "DeckTemplate_styleKey_fkey" FOREIGN KEY ("styleKey") REFERENCES "DeckStyle"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckTemplate" ADD CONSTRAINT "DeckTemplate_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "CardArtwork"("id") ON DELETE SET NULL ON UPDATE CASCADE;

