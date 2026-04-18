-- CreateEnum
CREATE TYPE "LiveCallParticipantRole" AS ENUM ('HOST', 'GUEST');

-- CreateEnum
CREATE TYPE "LiveCallSignalType" AS ENUM ('OFFER', 'ANSWER', 'ICE');

-- CreateTable
CREATE TABLE "LiveCallParticipant" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "LiveCallParticipantRole" NOT NULL DEFAULT 'GUEST',
    "microphoneEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cameraEnabled" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveCallParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveCallSignal" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "fromParticipantId" TEXT NOT NULL,
    "toParticipantId" TEXT NOT NULL,
    "type" "LiveCallSignalType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "LiveCallSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiveCallParticipant_liveSessionId_userId_key" ON "LiveCallParticipant"("liveSessionId", "userId");

-- CreateIndex
CREATE INDEX "LiveCallParticipant_liveSessionId_lastSeenAt_idx" ON "LiveCallParticipant"("liveSessionId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "LiveCallSignal_toParticipantId_consumedAt_createdAt_idx" ON "LiveCallSignal"("toParticipantId", "consumedAt", "createdAt");

-- CreateIndex
CREATE INDEX "LiveCallSignal_liveSessionId_createdAt_idx" ON "LiveCallSignal"("liveSessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "LiveCallParticipant" ADD CONSTRAINT "LiveCallParticipant_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveCallParticipant" ADD CONSTRAINT "LiveCallParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveCallSignal" ADD CONSTRAINT "LiveCallSignal_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveCallSignal" ADD CONSTRAINT "LiveCallSignal_fromParticipantId_fkey" FOREIGN KEY ("fromParticipantId") REFERENCES "LiveCallParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveCallSignal" ADD CONSTRAINT "LiveCallSignal_toParticipantId_fkey" FOREIGN KEY ("toParticipantId") REFERENCES "LiveCallParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
