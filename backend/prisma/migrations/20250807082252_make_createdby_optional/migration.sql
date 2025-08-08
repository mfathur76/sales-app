-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "outlet" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
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
    CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "expenses_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Admin" ("username") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "expenses_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "Admin" ("username") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_expenses" ("approvedAt", "approvedBy", "categoryId", "createdAt", "createdBy", "date", "description", "id", "notes", "outlet", "quantity", "rejectionReason", "status", "totalPrice", "unitPrice", "updatedAt") SELECT "approvedAt", "approvedBy", "categoryId", "createdAt", "createdBy", "date", "description", "id", "notes", "outlet", "quantity", "rejectionReason", "status", "totalPrice", "unitPrice", "updatedAt" FROM "expenses";
DROP TABLE "expenses";
ALTER TABLE "new_expenses" RENAME TO "expenses";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
