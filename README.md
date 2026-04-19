# Sales App

Sistem penjualan outlet untuk input sales harian, verifikasi admin, pengelolaan pengeluaran, dan pelaporan.

Arsitektur produksi saat ini:
- Frontend: Cloudflare Pages
- Backend: AWS Lambda + API Gateway
- Database: DynamoDB

## Fitur Utama

### Sales
- Input sales harian per outlet
- Breakdown metode pembayaran: cash, QRIS, Gojek, Shopee, Grab
- Filter data berdasarkan rentang tanggal
- Dashboard dan rekap penjualan

### Expense
- Input pengeluaran per outlet
- Kelola kategori expense dan item master
- Edit dan hapus expense
- Laporan mingguan, bulanan, dan summary

### Admin
- Verifikasi sales dan input transfer bank
- Kelola outlet
- Kelola expense categories dan item master
- Kelola data expense
- Manajemen admin khusus `super_admin`

## Roles

### Outlet User
- Input sales harian untuk outlet sendiri
- Melihat data, dashboard, expense, dan laporan milik outlet sendiri
- Tidak bisa mengakses menu administrasi global

### Admin
- Mengakses admin dashboard
- Verifikasi sales dan input bank transfer
- Kelola kategori pengeluaran, item master, outlet, dan data pengeluaran
- Tidak bisa membuka manajemen user admin

### Super Admin
- Memiliki semua akses `Admin`
- Bisa membuka `Manajemen User`
- Bisa membuat, mengubah, dan menghapus akun admin lain

Catatan:
- Endpoint `admin/list`, `admin/create`, `admin/{username}`, dan hapus admin dibatasi untuk `super_admin`.
- Jika akun admin biasa perlu dinaikkan aksesnya, role user harus diubah menjadi `super_admin` di data admin backend.

## Arsitektur

### Frontend
- React 19
- CRA (`react-scripts`)
- Base URL API bisa diatur lewat `REACT_APP_API_BASE_URL`
- Default production fallback mengarah ke API Gateway AWS

### Backend
- Node.js 18+
- TypeScript
- Serverless Framework v3
- AWS Lambda handlers di folder `backend/lambda/handlers`
- DynamoDB tables dibuat dari `backend/serverless.yml`

### Deployment
- Cloudflare Pages build frontend dari folder `frontend`
- AWS Lambda deploy backend lewat Serverless Framework
- CORS dibaca dari environment terminal saat deploy

## Struktur Repo

```text
sales-app/
├── backend/
│   ├── lambda/              # Lambda handlers, services, scripts
│   ├── src/                 # Kode backend lama / local dev compatibility
│   ├── prisma/              # Legacy Prisma assets yang masih tersisa di repo
│   ├── serverless.yml       # Definisi Lambda, API Gateway, DynamoDB
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── components/      # UI pages dan components
│   │   └── App.js
│   └── package.json
├── Deploy/
│   └── DEPLOYMENT.md        # Panduan deploy Cloudflare + AWS
├── domain-setup.md          # Catatan domain dan CORS
└── README.md
```

## Menjalankan Lokal

### Prasyarat
- Node.js 18+
- npm
- Git

### Backend local

```bash
cd backend
npm install
npm run dev
```

Default local API berjalan di `http://localhost:3001`.

### Frontend local

```bash
cd frontend
npm install
npm start
```

Frontend akan memakai:
- `http://localhost:3001/api` jika dibuka dari `localhost`
- `REACT_APP_API_BASE_URL` jika env itu di-set
- fallback API AWS saat build production tanpa env override

### Opsi env frontend lokal

Buat `frontend/.env.local` jika ingin memaksa base URL tertentu:

```env
REACT_APP_API_BASE_URL=http://localhost:3001/api
```

## Konfigurasi Environment

### Backend

Minimal env yang penting untuk deploy:

```env
JWT_SECRET=<secret-yang-kuat>
CORS_ALLOWED_ORIGINS=https://sales.risolmejik.com
```

`serverless.yml` membaca env ini dari terminal saat deploy, jadi untuk PowerShell jalankan di terminal yang sama:

```powershell
$env:JWT_SECRET="<isi-jwt-secret-yang-kuat>"
$env:CORS_ALLOWED_ORIGINS="https://sales.risolmejik.com"
```

### Frontend

```env
REACT_APP_API_BASE_URL=https://your-api-id.execute-api.ap-southeast-3.amazonaws.com/prod/api
```

Contoh ada di [frontend/.env.production.example](./frontend/.env.production.example).

## Deploy Ringkas

### Frontend
- Push ke branch yang terhubung ke Cloudflare Pages
- Cloudflare akan build otomatis dari folder `frontend`

### Backend

```bash
cd backend
npm install
npx serverless deploy --stage prod
```

Jika route, handler, atau resource berubah, lakukan full deploy backend.

Panduan detail ada di [Deploy/DEPLOYMENT.md](./Deploy/DEPLOYMENT.md).

## Command Yang Sering Dipakai

### Backend

```bash
cd backend

# local dev backend
npm run dev

# build lambda package
npm run build:lambda

# deploy lambda production
npm run deploy:lambda

# deploy lambda dev
npm run deploy:lambda:dev

# serverless offline
npm run offline

# cek info deployment
npx serverless info --stage prod

# lihat logs
npx serverless logs -f getSales --stage prod --tail
```

### Admin tools

```bash
cd backend

# reset password admin
npm run reset:admin

# ubah role admin, contoh jadi super_admin
npm run promote:admin -- admin super_admin
```

Setelah role admin diubah, login ulang supaya token baru ikut membawa role terbaru.

### Frontend

```bash
cd frontend

# local dev
npm start

# build production
npm run build
```

## API Ringkas

### Auth
- `POST /api/auth/login`
- `GET /api/auth/outlets`
- `POST /api/admin/login`
- `GET /api/admin/profile`

### Sales
- `GET /api/sales`
- `POST /api/sales`
- `GET /api/sales/{outlet}/{date}`
- `PUT /api/sales/{outlet}/{date}`
- `PUT /api/sales/{outlet}/{date}/bank`
- `DELETE /api/sales/{outlet}/{date}`
- `GET /api/sales/stats`
- `GET /api/sales/stats/overview`

### Admin dan Master Data
- `GET /api/admin/list`
- `POST /api/admin/create`
- `PUT /api/admin/{username}`
- `DELETE /api/admin/{username}`
- `POST /api/admin/change-password`
- `GET /api/outlets`
- `POST /api/outlets`
- `PUT /api/outlets/{code}`
- `DELETE /api/outlets/{code}`

### Expense
- `GET /api/expenses`
- `POST /api/expenses`
- `GET /api/expenses/{id}`
- `PUT /api/expenses/{id}`
- `DELETE /api/expenses/{id}`
- `GET /api/expenses/categories`
- `POST /api/expenses/categories`
- `GET /api/expenses/items`
- `POST /api/expenses/items`
- `GET /api/expenses/reports/weekly`
- `GET /api/expenses/reports/monthly`
- `GET /api/expenses/reports/summary`

Daftar endpoint paling akurat tetap ada di [backend/serverless.yml](./backend/serverless.yml).

## Troubleshooting Singkat

### CORS error
- Pastikan `CORS_ALLOWED_ORIGINS` cocok dengan domain frontend
- Redeploy backend setelah env diubah

### Admin login gagal atau 401
- Jalankan `npm run reset:admin` dari folder `backend`
- Login ulang setelah reset selesai

### Manajemen User tidak muncul
- Pastikan akun login punya role `super_admin`
- Jika baru dipromosikan, logout lalu login lagi

### Frontend memanggil API yang salah
- Cek `REACT_APP_API_BASE_URL`
- Cek fallback di `frontend/src/api/salesApi.js`

## Dokumen Terkait

- [Deploy/DEPLOYMENT.md](./Deploy/DEPLOYMENT.md)
- [backend/README.md](./backend/README.md)
- [domain-setup.md](./domain-setup.md)
