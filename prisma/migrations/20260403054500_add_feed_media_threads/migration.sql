-- AlterTable
ALTER TABLE "FeedPostComment" ADD COLUMN "parentCommentId" TEXT;

-- CreateTable
CREATE TABLE "FeedPostMedia" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
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

    CONSTRAINT "FeedPostMedia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FeedPostMedia" ADD CONSTRAINT "FeedPostMedia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPostMedia" ADD CONSTRAINT "FeedPostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPostComment" ADD CONSTRAINT "FeedPostComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "FeedPostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
