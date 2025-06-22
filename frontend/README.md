# Risol Mejik Sales Tracker

Aplikasi untuk tracking penjualan outlet Risol Mejik dengan React frontend dan Express backend.

## 📁 Project Structure

```
sales-app/
├── frontend/          # React application
│   ├── src/          # React source code
│   ├── public/       # Static files
│   └── package.json  # Frontend dependencies
├── backend/          # Express + SQLite API
│   ├── src/          # TypeScript source code
│   └── package.json  # Backend dependencies
└── README.md
```

## 🚀 Getting Started

### Frontend (React)
```bash
cd frontend
npm install
npm start
```
Frontend akan berjalan di http://localhost:3000

### Backend (Express + SQLite)
```bash
cd backend
npm install
npx ts-node src/index.ts
```
Backend akan berjalan di http://localhost:5000

## 📊 Database Schema

### Outlets Table
- `id` (TEXT): RM001, RM002, RM003, RM004
- `name` (TEXT): Nama outlet

### Sales Table
- `id` (INTEGER): Auto increment
- `outlet_id` (TEXT): Reference ke outlets
- `date` (TEXT): Tanggal penjualan
- `cash` (REAL): Penjualan cash
- `qris` (REAL): Penjualan QRIS
- `gojek` (REAL): Penjualan Gojek
- `shopee` (REAL): Penjualan Shopee
- `grab` (REAL): Penjualan Grab
- `created_at` (TIMESTAMP): Waktu input

## 🔧 API Endpoints

- `GET /api/outlets` - Get semua outlet
- `POST /api/sales` - Input data penjualan

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, CSS3
- **Backend**: Express, SQLite, TypeScript
- **Database**: SQLite (development), PostgreSQL (production) 