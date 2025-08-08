# API Dokumentasi Fitur Pengeluaran

## Overview
Fitur pencatatan pengeluaran memungkinkan admin untuk mencatat dan mengelola pengeluaran outlet dengan kategori dan laporan yang detail.

## Base URL
```
http://localhost:3001/api/expenses
```

## Authentication
Semua endpoint memerlukan token JWT yang dikirim melalui header `Authorization: Bearer <token>`

## Endpoints

### 1. Kategori Pengeluaran

#### GET /api/expenses/categories
Mendapatkan semua kategori pengeluaran yang aktif.

**Response:**
```json
[
  {
    "id": "clx1234567890",
    "name": "Belanja Pasar",
    "description": "Pengeluaran untuk belanja bahan makanan di pasar",
    "isActive": true,
    "createdAt": "2025-08-07T02:50:54.000Z",
    "updatedAt": "2025-08-07T02:50:54.000Z"
  }
]
```

#### POST /api/expenses/categories
Membuat kategori pengeluaran baru (Admin only).

**Request Body:**
```json
{
  "name": "Kategori Baru",
  "description": "Deskripsi kategori"
}
```

### 2. Pengelolaan Pengeluaran

#### GET /api/expenses
Mendapatkan semua pengeluaran dengan filter opsional.

**Query Parameters:**
- `outlet` (string): Filter berdasarkan outlet
- `categoryId` (string): Filter berdasarkan kategori
- `startDate` (string): Filter tanggal mulai (YYYY-MM-DD)
- `endDate` (string): Filter tanggal akhir (YYYY-MM-DD)
- `status` (string): Filter berdasarkan status (pending, approved, rejected)

**Response:**
```json
[
  {
    "id": "clx1234567890",
    "outlet": "OUTLET001",
    "categoryId": "clx1234567891",
    "date": "2025-08-07T00:00:00.000Z",
    "description": "Wortel",
    "quantity": 35,
    "unitPrice": 4000,
    "totalPrice": 140000,
    "notes": "Belanja pasar pagi",
    "status": "approved",
    "approvedBy": "admin",
    "approvedAt": "2025-08-07T02:50:54.000Z",
    "rejectionReason": null,
    "createdAt": "2025-08-07T02:50:54.000Z",
    "updatedAt": "2025-08-07T02:50:54.000Z",
    "createdBy": "admin",
    "categoryRef": {
      "id": "clx1234567891",
      "name": "Belanja Pasar",
      "description": "Pengeluaran untuk belanja bahan makanan di pasar"
    },
    "outletRef": {
      "code": "OUTLET001",
      "name": "Outlet 1"
    },
    "createdByRef": {
      "username": "admin",
      "name": "Administrator"
    },
    "approvedByRef": {
      "username": "admin",
      "name": "Administrator"
    }
  }
]
```

#### POST /api/expenses
Membuat pengeluaran baru (Admin only).

**Request Body:**
```json
{
  "outlet": "OUTLET001",
  "categoryId": "clx1234567891",
  "date": "2025-08-07",
  "description": "Wortel",
  "quantity": 35,
  "unitPrice": 4000,
  "notes": "Belanja pasar pagi"
}
```

#### PUT /api/expenses/:id
Mengupdate pengeluaran (Admin only).

**Request Body:**
```json
{
  "description": "Wortel Segar",
  "quantity": 40,
  "unitPrice": 4500,
  "notes": "Belanja pasar pagi - update"
}
```

#### DELETE /api/expenses/:id
Menghapus pengeluaran (Admin only).

#### POST /api/expenses/:id/approve
Menyetujui pengeluaran (Admin only).

#### POST /api/expenses/:id/reject
Menolak pengeluaran (Admin only).

**Request Body:**
```json
{
  "rejectionReason": "Harga terlalu mahal"
}
```

### 3. Laporan Pengeluaran

#### GET /api/expenses/reports/weekly
Mendapatkan laporan pengeluaran mingguan.

**Query Parameters:**
- `outlet` (string, required): Kode outlet
- `weekStart` (string, required): Tanggal awal minggu (YYYY-MM-DD)

**Response:**
```json
{
  "weekStart": "2025-08-04T00:00:00.000Z",
  "weekEnd": "2025-08-10T00:00:00.000Z",
  "totalExpense": 879000,
  "expensesByCategory": [
    {
      "categoryName": "Belanja Pasar",
      "totalAmount": 879000,
      "itemCount": 5,
      "items": [
        {
          "description": "Wortel",
          "quantity": 35,
          "unitPrice": 4000,
          "totalPrice": 140000,
          "date": "2025-08-07T00:00:00.000Z"
        },
        {
          "description": "Cabe Ceplus",
          "quantity": 6,
          "unitPrice": 27000,
          "totalPrice": 162000,
          "date": "2025-08-07T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

#### GET /api/expenses/reports/monthly
Mendapatkan laporan pengeluaran bulanan.

**Query Parameters:**
- `outlet` (string, required): Kode outlet
- `month` (number, required): Bulan (1-12)
- `year` (number, required): Tahun

**Response:**
```json
{
  "month": 8,
  "year": 2025,
  "totalExpense": 879000,
  "expensesByCategory": [
    {
      "categoryName": "Belanja Pasar",
      "totalAmount": 879000,
      "itemCount": 5,
      "items": [
        {
          "description": "Wortel",
          "quantity": 35,
          "unitPrice": 4000,
          "totalPrice": 140000,
          "date": "2025-08-07T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

#### GET /api/expenses/reports/summary
Mendapatkan ringkasan pengeluaran berdasarkan rentang tanggal.

**Query Parameters:**
- `outlet` (string, required): Kode outlet
- `startDate` (string, required): Tanggal mulai (YYYY-MM-DD)
- `endDate` (string, required): Tanggal akhir (YYYY-MM-DD)

**Response:**
```json
{
  "totalExpense": 879000,
  "categorySummary": {
    "Belanja Pasar": {
      "totalAmount": 879000,
      "itemCount": 5
    }
  },
  "itemCount": 5
}
```

## Contoh Penggunaan

### 1. Menambahkan Pengeluaran Belanja Pasar
```bash
curl -X POST http://localhost:3001/api/expenses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "outlet": "OUTLET001",
    "categoryId": "clx1234567891",
    "date": "2025-08-07",
    "description": "Wortel",
    "quantity": 35,
    "unitPrice": 4000,
    "notes": "Belanja pasar pagi"
  }'
```

### 2. Mendapatkan Laporan Mingguan
```bash
curl -X GET "http://localhost:3001/api/expenses/reports/weekly?outlet=OUTLET001&weekStart=2025-08-04" \
  -H "Authorization: Bearer <token>"
```

### 3. Mendapatkan Laporan Bulanan
```bash
curl -X GET "http://localhost:3001/api/expenses/reports/monthly?outlet=OUTLET001&month=8&year=2025" \
  -H "Authorization: Bearer <token>"
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Error Response Format
```json
{
  "error": "Error message description"
}
```

## Kategori Default
Sistem menyediakan kategori pengeluaran default:
1. **Belanja Pasar** - Pengeluaran untuk belanja bahan makanan di pasar
2. **Operasional** - Pengeluaran operasional outlet seperti listrik, air, gas
3. **Transportasi** - Pengeluaran transportasi dan pengiriman
4. **Peralatan** - Pengeluaran untuk peralatan dan perlengkapan
5. **Gaji Karyawan** - Pengeluaran untuk gaji dan upah karyawan
6. **Lainnya** - Pengeluaran lainnya yang tidak termasuk kategori di atas

## Workflow Approval
1. Admin membuat pengeluaran dengan status "pending"
2. Admin lain dapat menyetujui atau menolak pengeluaran
3. Hanya pengeluaran dengan status "approved" yang masuk ke dalam laporan
4. Pengeluaran yang ditolak dapat dihapus atau diperbaiki
