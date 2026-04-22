-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "creator" TEXT,
    "coverUrl" TEXT,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "rating" INTEGER,
    "review" TEXT,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT
);

-- CreateTable
CREATE TABLE "BookDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "isbn" TEXT,
    "publisher" TEXT,
    "pageCount" INTEGER,
    CONSTRAINT "BookDetail_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovieDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "director" TEXT,
    "year" INTEGER,
    "duration" INTEGER,
    CONSTRAINT "MovieDetail_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "platform" TEXT,
    "playtime" INTEGER,
    "achievements" INTEGER,
    CONSTRAINT "GameDetail_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlaceDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "address" TEXT,
    "lat" REAL,
    "lng" REAL,
    "city" TEXT,
    CONSTRAINT "PlaceDetail_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "YearSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "template" TEXT NOT NULL,
    "imageUrl" TEXT,
    "content" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "_ItemToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ItemToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ItemToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Item_type_finishedAt_idx" ON "Item"("type", "finishedAt");

-- CreateIndex
CREATE INDEX "Item_externalId_type_idx" ON "Item"("externalId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BookDetail_itemId_key" ON "BookDetail"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieDetail_itemId_key" ON "MovieDetail"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "GameDetail_itemId_key" ON "GameDetail"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceDetail_itemId_key" ON "PlaceDetail"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "_ItemToTag_AB_unique" ON "_ItemToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_ItemToTag_B_index" ON "_ItemToTag"("B");
