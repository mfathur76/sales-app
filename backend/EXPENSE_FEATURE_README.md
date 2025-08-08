# Fitur Pencatatan Pengeluaran

## Overview
Fitur pencatatan pengeluaran telah berhasil ditambahkan ke aplikasi sales-app. Fitur ini memungkinkan admin untuk mencatat, mengelola, dan melaporkan pengeluaran outlet dengan kategori yang terorganisir.

## Fitur yang Tersedia

### 1. Kategori Pengeluaran
- **Belanja Pasar** - Pengeluaran untuk belanja bahan makanan di pasar
- **Operasional** - Pengeluaran operasional outlet seperti listrik, air, gas
- **Transportasi** - Pengeluaran transportasi dan pengiriman
- **Peralatan** - Pengeluaran untuk peralatan dan perlengkapan
- **Gaji Karyawan** - Pengeluaran untuk gaji dan upah karyawan
- **Lainnya** - Pengeluaran lainnya yang tidak termasuk kategori di atas

### 2. Pencatatan Pengeluaran
- Input detail pengeluaran (deskripsi, kuantitas, harga satuan, total harga)
- Kategori pengeluaran
- Tanggal transaksi
- Catatan tambahan
- Status approval (pending, approved, rejected)

### 3. Laporan Pengeluaran
- **Laporan Mingguan** - Total pengeluaran per minggu dengan breakdown per kategori
- **Laporan Bulanan** - Total pengeluaran per bulan dengan breakdown per kategori
- **Ringkasan** - Ringkasan pengeluaran berdasarkan rentang tanggal

## Contoh Penggunaan

### Contoh Pengeluaran Belanja Pasar (7 Agustus 2025)
```
Tanggal: 7 Agustus 2025
Kategori: Belanja Pasar

1. Wortel: 35kg × Rp 4.000 = Rp 140.000
2. Cabe Ceplus: 6kg × Rp 27.000 = Rp 162.000
3. Bawang Merah: 1kg × Rp 52.000 = Rp 52.000
4. Kentang: 35kg × Rp 14.000 = Rp 490.000
5. Jagung Manis: 8kg × Rp 4.375 = Rp 35.000

Total Pengeluaran: Rp 879.000
```

## Struktur Database

### Model ExpenseCategory
```sql
- id (String, Primary Key)
- name (String, Unique)
- description (String, Optional)
- isActive (Boolean)
- createdAt (DateTime)
- updatedAt (DateTime)
```

### Model Expense
```sql
- id (String, Primary Key)
- outlet (String, Foreign Key)
- categoryId (String, Foreign Key)
- date (DateTime)
- description (String)
- quantity (Float)
- unitPrice (Float)
- totalPrice (Float)
- notes (String, Optional)
- status (String) - pending, approved, rejected
- approvedBy (String, Optional)
- approvedAt (DateTime, Optional)
- rejectionReason (String, Optional)
- createdBy (String, Foreign Key)
- createdAt (DateTime)
- updatedAt (DateTime)
```

## API Endpoints

### Kategori Pengeluaran
- `GET /api/expenses/categories` - Mendapatkan semua kategori
- `POST /api/expenses/categories` - Membuat kategori baru (Admin only)

### Pengelolaan Pengeluaran
- `GET /api/expenses` - Mendapatkan semua pengeluaran dengan filter
- `POST /api/expenses` - Membuat pengeluaran baru (Admin only)
- `PUT /api/expenses/:id` - Mengupdate pengeluaran (Admin only)
- `DELETE /api/expenses/:id` - Menghapus pengeluaran (Admin only)
- `POST /api/expenses/:id/approve` - Menyetujui pengeluaran (Admin only)
- `POST /api/expenses/:id/reject` - Menolak pengeluaran (Admin only)

### Laporan
- `GET /api/expenses/reports/weekly` - Laporan mingguan
- `GET /api/expenses/reports/monthly` - Laporan bulanan
- `GET /api/expenses/reports/summary` - Ringkasan berdasarkan rentang tanggal

## Workflow Approval

1. **Pembuatan Pengeluaran**
   - Admin membuat pengeluaran dengan status "pending"
   - Sistem otomatis menghitung total harga (quantity × unitPrice)

2. **Approval Process**
   - Admin lain dapat menyetujui atau menolak pengeluaran
   - Jika ditolak, harus memberikan alasan penolakan
   - Hanya pengeluaran "approved" yang masuk ke dalam laporan

3. **Laporan**
   - Laporan hanya menampilkan pengeluaran dengan status "approved"
   - Data dikelompokkan berdasarkan kategori
   - Menampilkan total per kategori dan detail item

## Cara Menjalankan

### 1. Setup Database
```bash
cd backend
npx prisma migrate dev --name add_expense_models
npx prisma db seed
```

### 2. Menjalankan Server
```bash
cd backend
npm run dev
```

### 3. Testing API
```bash
node test_expense_api.js
```

## Contoh Response Laporan

### Laporan Mingguan
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
        }
      ]
    }
  ]
}
```

### Laporan Bulanan
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
      "items": [...]
    }
  ]
}
```

## Keamanan

- Semua endpoint memerlukan autentikasi JWT
- Hanya admin yang dapat membuat, mengupdate, dan menghapus pengeluaran
- Workflow approval memastikan transparansi dan kontrol
- Validasi input untuk mencegah data yang tidak valid

## File yang Ditambahkan/Dimodifikasi

### Backend
- `backend/prisma/schema.prisma` - Model database baru
- `backend/src/services/expenseService.ts` - Service untuk logika bisnis
- `backend/src/routes/expenses.ts` - API routes
- `backend/src/index.ts` - Registrasi routes
- `backend/prisma/seed.ts` - Data seeding

### Dokumentasi
- `EXPENSE_API_DOCS.md` - Dokumentasi API lengkap
- `EXPENSE_FEATURE_README.md` - README fitur ini
- `test_expense_api.js` - Script testing

## Next Steps

Untuk pengembangan selanjutnya, dapat ditambahkan:
1. Frontend interface untuk pengelolaan pengeluaran
2. Export laporan ke PDF/Excel
3. Notifikasi untuk approval pengeluaran
4. Dashboard visualisasi pengeluaran
5. Integrasi dengan sistem akuntansi
6. Multi-currency support
7. Foto bukti pengeluaran

## Support

Jika ada pertanyaan atau masalah dengan fitur ini, silakan buat issue di repository atau hubungi tim development.
