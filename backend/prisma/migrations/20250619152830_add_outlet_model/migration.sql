-- CreateTable
CREATE TABLE "Outlet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("outlet", "date"),
    CONSTRAINT "outlet_sales_outlet_fkey" FOREIGN KEY ("outlet") REFERENCES "Outlet" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_outlet_sales" ("cash", "createdAt", "date", "gojek", "grab", "outlet", "qris", "shopee", "totalSales", "updatedAt") SELECT "cash", "createdAt", "date", "gojek", "grab", "outlet", "qris", "shopee", "totalSales", "updatedAt" FROM "outlet_sales";
DROP TABLE "outlet_sales";
ALTER TABLE "new_outlet_sales" RENAME TO "outlet_sales";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Outlet_code_key" ON "Outlet"("code");
