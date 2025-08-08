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
    "isCash" BOOLEAN NOT NULL DEFAULT true,
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
INSERT INTO "new_expenses" ("actualPrice", "approvedAt", "approvedBy", "createdAt", "createdBy", "date", "id", "itemId", "notes", "outlet", "quantity", "rejectionReason", "status", "totalPrice", "updatedAt") SELECT "actualPrice", "approvedAt", "approvedBy", "createdAt", "createdBy", "date", "id", "itemId", "notes", "outlet", "quantity", "rejectionReason", "status", "totalPrice", "updatedAt" FROM "expenses";
DROP TABLE "expenses";
ALTER TABLE "new_expenses" RENAME TO "expenses";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
