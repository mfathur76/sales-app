-- CreateTable
CREATE TABLE "outlet_sales" (
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

    PRIMARY KEY ("outlet", "date")
);
