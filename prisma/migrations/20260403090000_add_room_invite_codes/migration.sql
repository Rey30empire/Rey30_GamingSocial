ALTER TABLE "Room"
ADD COLUMN "inviteCode" TEXT;

CREATE UNIQUE INDEX "Room_inviteCode_key" ON "Room"("inviteCode");
