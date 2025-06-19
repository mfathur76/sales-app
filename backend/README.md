# Sales API Backend

Backend API untuk aplikasi Sales Tracker Risol Mejik - Data Penjualan Outlet.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Jalankan server development:
```bash
npm run dev
```

3. Build untuk production:
```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- **GET** `/api/health` - Check status API

### Outlet Sales Management

#### Get All Outlet Sales
- **GET** `/api/sales`
- **Query Parameters:**
  - `start_date` (optional) - Filter by start date (YYYY-MM-DD)
  - `end_date` (optional) - Filter by end date (YYYY-MM-DD)
  - `outlet` (optional) - Filter by outlet code

#### Get Outlet Sale by Outlet and Date
- **GET** `/api/sales/:outlet/:date`
- **Example:** `/api/sales/RM001/2024-01-15`

#### Create New Outlet Sale
- **POST** `/api/sales`
- **Body:**
```json
{
  "outlet": "RM001",
  "date": "2024-01-15",
  "cash": 500000,
  "qris": 300000,
  "gojek": 200000,
  "shopee": 150000,
  "grab": 100000
}
```

#### Update Outlet Sale
- **PUT** `/api/sales/:outlet/:date`
- **Example:** `/api/sales/RM001/2024-01-15`
- **Body:** (semua field optional)
```json
{
  "cash": 550000,
  "qris": 320000
}
```

#### Delete Outlet Sale
- **DELETE** `/api/sales/:outlet/:date`
- **Example:** `/api/sales/RM001/2024-01-15`

#### Get Outlet Sales Statistics
- **GET** `/api/sales/stats/overview`
- **Query Parameters:**
  - `start_date` (optional) - Filter by start date
  - `end_date` (optional) - Filter by end date
  - `outlet` (optional) - Filter by outlet
- **Response:**
```json
{
  "success": true,
  "data": {
    "total_sales": 50,
    "total_revenue": 25000000,
    "average_daily_sales": 500000,
    "total_cash": 15000000,
    "total_qris": 8000000,
    "total_gojek": 1200000,
    "total_shopee": 500000,
    "total_grab": 300000,
    "outlet_breakdown": [
      {
        "outlet": "RM001",
        "total_sales": 20,
        "total_revenue": 10000000
      }
    ]
  }
}
```

#### Get Outlet Options
- **GET** `/api/sales/outlets`
- **Response:**
```json
{
  "success": true,
  "data": ["RM001", "RM002", "RM003", "RM004"],
  "message": "Outlet options retrieved successfully"
}
```

## Data Models

### OutletSale
```typescript
{
  outlet: string;           // Primary key part 1
  date: string;             // Primary key part 2 (YYYY-MM-DD)
  cash: number;             // Penjualan cash
  qris: number;             // Penjualan QRIS
  gojek: number;            // Penjualan Gojek
  shopee: number;           // Penjualan Shopee
  grab: number;             // Penjualan Grab
  total_sales?: number;     // Total penjualan (auto-calculated)
  created_at?: string;      // Timestamp created
  updated_at?: string;      // Timestamp updated
}
```

## Database Schema

### Table: outlet_sales
```sql
CREATE TABLE outlet_sales (
  outlet TEXT NOT NULL,
  date DATE NOT NULL,
  cash REAL NOT NULL DEFAULT 0,
  qris REAL NOT NULL DEFAULT 0,
  gojek REAL NOT NULL DEFAULT 0,
  shopee REAL NOT NULL DEFAULT 0,
  grab REAL NOT NULL DEFAULT 0,
  total_sales REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (outlet, date)
);
```

**Fitur Database:**
- **Primary Key:** Kombinasi `outlet + date` (satu outlet hanya bisa memiliki satu record per hari)
- **Auto-calculated:** `total_sales` dihitung otomatis dari jumlah semua metode pembayaran
- **Triggers:** Auto-update `updated_at` dan `total_sales` saat data berubah
- **Data Type:** Menggunakan `DATE` untuk kolom tanggal

## Response Format

Semua response menggunakan format:
```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "error": string
}
```

## Error Handling

- **400** - Bad Request (data tidak valid)
- **404** - Not Found (record tidak ditemukan)
- **409** - Conflict (record sudah ada untuk outlet dan tanggal yang sama)
- **500** - Internal Server Error

## Outlet Codes

- **RM001** - Risol Mejik Kelinci Raya
- **RM002** - Risol Mejik Ketileng
- **RM003** - Risol Mejik Tlogosari
- **RM004** - Risol Mejik Karyadi 