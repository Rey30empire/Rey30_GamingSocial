-- CreateTable
CREATE TABLE "FeedPostCommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedPostCommentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedPostCommentReaction_commentId_userId_key" ON "FeedPostCommentReaction"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "FeedPostCommentReaction" ADD CONSTRAINT "FeedPostCommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "FeedPostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPostCommentReaction" ADD CONSTRAINT "FeedPostCommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
