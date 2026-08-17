-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatarId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Table" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "maxPlayers" INTEGER NOT NULL DEFAULT 4,
    "ownerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TablePlayer" (
    "id" UUID NOT NULL,
    "tableId" UUID NOT NULL,
    "userId" UUID,
    "seatIndex" INTEGER,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "botProfile" TEXT,
    "avatarId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TablePlayer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TablePlayer_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TablePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameRecord" (
    "id" UUID NOT NULL,
    "tableId" UUID NOT NULL,
    "winnerSeat" INTEGER NOT NULL,
    "scores" JSONB NOT NULL,
    "handsPlayed" INTEGER NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GameRecord_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "TablePlayer_tableId_userId_key" ON "TablePlayer"("tableId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TablePlayer_tableId_seatIndex_key" ON "TablePlayer"("tableId", "seatIndex");
