-- AlterTable
ALTER TABLE "User" ADD COLUMN "gamesPlayed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "wins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "rating" INTEGER NOT NULL DEFAULT 1200;

-- AlterTable
ALTER TABLE "GameRecord" ADD COLUMN "replay" JSONB;

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
