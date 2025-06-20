-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_outlet_sales" (
    "outlet" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "cash" REAL NOT NULL DEFAULT 0,
    "qris" REAL NOT NULL DEFAULT 0,
    "gojek" REAL NOT NULL DEFAULT 0,
    "shopee" REAL NOT NULL DEFAULT 0,
    "grab" REAL NOT NULL DEFAULT 0,
    "totalSales" REAL NOT NULL DEFAULT 0,
    "cashBank" REAL NOT NULL DEFAULT 0,
    "qrisBank" REAL NOT NULL DEFAULT 0,
    "gojekBank" REAL NOT NULL DEFAULT 0,
    "shopeeBank" REAL NOT NULL DEFAULT 0,
    "grabBank" REAL NOT NULL DEFAULT 0,
    "totalBank" REAL NOT NULL DEFAULT 0,
    "cashPercent" REAL NOT NULL DEFAULT 0,
    "qrisPercent" REAL NOT NULL DEFAULT 0,
    "gojekPercent" REAL NOT NULL DEFAULT 0,
    "shopeePercent" REAL NOT NULL DEFAULT 0,
    "grabPercent" REAL NOT NULL DEFAULT 0,
    "overallPercent" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("outlet", "date"),
    CONSTRAINT "outlet_sales_outlet_fkey" FOREIGN KEY ("outlet") REFERENCES "Outlet" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "outlet_sales_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "Admin" ("username") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_outlet_sales" ("cash", "createdAt", "date", "gojek", "grab", "outlet", "qris", "shopee", "totalSales", "updatedAt") SELECT "cash", "createdAt", "date", "gojek", "grab", "outlet", "qris", "shopee", "totalSales", "updatedAt" FROM "outlet_sales";
DROP TABLE "outlet_sales";
ALTER TABLE "new_outlet_sales" RENAME TO "outlet_sales";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");
