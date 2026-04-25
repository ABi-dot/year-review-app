/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `YearSummary` table. All the data in the column will be lost.
  - You are about to drop the column `template` on the `YearSummary` table. All the data in the column will be lost.
  - Added the required column `style` to the `YearSummary` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_YearSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "style" TEXT NOT NULL,
    "content" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_YearSummary" ("content", "createdAt", "id", "year") SELECT "content", "createdAt", "id", "year" FROM "YearSummary";
DROP TABLE "YearSummary";
ALTER TABLE "new_YearSummary" RENAME TO "YearSummary";
CREATE UNIQUE INDEX "YearSummary_year_style_key" ON "YearSummary"("year", "style");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
