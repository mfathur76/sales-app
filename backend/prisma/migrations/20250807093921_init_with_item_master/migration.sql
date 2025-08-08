/*
  Warnings:

  - You are about to drop the column `categoryId` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `expenses` table. All the data in the column will be lost.
  - Added the required column `actualPrice` to the `expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemId` to the `expenses` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "item_masters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "standardPrice" REAL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "item_masters_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "outlet" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "actualPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    CONSTRAINT "expenses_outlet_fkey" FOREIGN KEY ("outlet") REFERENCES "Outlet" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "expenses_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item_masters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "expenses_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Admin" ("username") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "expenses_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "Admin" ("username") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_expenses" ("approvedAt", "approvedBy", "createdAt", "createdBy", "date", "id", "notes", "outlet", "quantity", "rejectionReason", "status", "totalPrice", "updatedAt") SELECT "approvedAt", "approvedBy", "createdAt", "createdBy", "date", "id", "notes", "outlet", "quantity", "rejectionReason", "status", "totalPrice", "updatedAt" FROM "expenses";
DROP TABLE "expenses";
ALTER TABLE "new_expenses" RENAME TO "expenses";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "item_masters_name_key" ON "item_masters"("name");
