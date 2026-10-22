# Deployment Guide — Cloudflare Pages + AWS Lambda

## Arsitektur

| Layer | Lokasi | Akses |
|-------|--------|-------|
| Frontend | Cloudflare Pages, proyek `sales-app-3sg.pages.dev` | Akun Cloudflare yang terhubung ke GitHub `mfathur76`. Production branch: lihat Settings proyek di dashboard |
| Domain/DNS | Hostinger (nameserver `dns-parking.com`) | CNAME `sales` → `sales-app-3sg.pages.dev` |
| Backend | AWS Lambda + API Gateway, akun `790762402182`, region `ap-southeast-3` (Jakarta) | AWS CLI profile `risolmejik` |
| Database | AWS DynamoDB, tabel `sales-app-api-*-prod` | sama dengan backend |

---

## 1. Deploy Backend (AWS Lambda)

### Prasyarat
- Node.js 18+
- AWS CLI dengan profile `risolmejik`. Cek dengan `aws sts get-caller-identity --profile risolmejik`, hasilnya harus akun `790762402182`.
  Kalau profile hilang: buat access key baru di IAM → Users → `risolmejik` → Security credentials, lalu jalankan `aws configure --profile risolmejik` (region `ap-southeast-3`).
- `backend/.env` berisi `JWT_SECRET` dan `CORS_ALLOWED_ORIGINS=https://sales.risolmejik.com`. File ini tidak masuk git, jadi **simpan cadangan JWT_SECRET di password manager**.

`serverless.yml` memakai `profile: risolmejik` dan `useDotenv: true`, jadi deploy otomatis ke akun yang benar dan membaca `.env` tanpa perlu set env manual di terminal.

### Langkah

```bash
cd backend
npm install

# Deploy ke production
npx serverless deploy --stage prod
```

> Output deploy akan menampilkan API Gateway endpoint URL. Catat URL ini.

### Environment Variables Backend

Dari `backend/.env`, saat deploy hanya `JWT_SECRET` dan `CORS_ALLOWED_ORIGINS` yang dipakai. Nama tabel DynamoDB, region, dan `NODE_ENV` sudah diatur di `serverless.yml`. Variabel lain di `.env` dipakai oleh script admin (`npm run reset:admin`, `npm run promote:admin`).

Kalau `JWT_SECRET` diganti, semua user otomatis logout dan harus login ulang.

> **Jangan commit** folder `.sls-package/`, `.serverless/`, atau `dist-lambda/`, karena isinya memuat nilai `JWT_SECRET` secara plain text.

---

## 2. Deploy Frontend (Cloudflare Pages)

Frontend ter-deploy otomatis setiap `git push` ke branch `main`.

### Setup Awal (sekali saja)
1. Buka [Cloudflare Pages](https://pages.cloudflare.com/)
2. Hubungkan ke repository GitHub
3. Build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `build`
   - **Root directory**: `frontend`

### Custom Domain
1. Di Cloudflare Pages → tab **Custom domains**
2. Tambahkan `sales.risolmejik.com`
3. Ikuti instruksi DNS Cloudflare (CNAME otomatis)
4. SSL dikelola Cloudflare secara otomatis

---

## 3. Setelah Deploy — Sinkronisasi URL

Pastikan URL API di frontend mengarah ke endpoint API Gateway yang benar.

Cek `frontend/src/api/salesApi.js` bagian `getApiBaseUrl()`.

---

## 4. Reset Admin Password

Jika perlu reset password admin:

```bash
cd backend
npx ts-node lambda/scripts/reset-admin-password.ts
```

---

## 5. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| CORS error di browser | Pastikan `CORS_ALLOWED_ORIGINS` di backend sesuai domain frontend |
| Login 401 | Jalankan reset-admin-password script |
| API tidak dikenal | Cek endpoint URL di `salesApi.js` |
| Cloudflare tidak update | Trigger manual re-deploy di Cloudflare Pages dashboard |

---

## 6. Useful Commands

```bash
# Cek status deployment Lambda
npx serverless info --stage prod

# Lihat logs Lambda secara live (nama function sesuai serverless.yml, mis. createExpense)
npx serverless logs -f createExpense --stage prod --tail

# Deploy ulang hanya satu function
npx serverless deploy function -f createExpense --stage prod
```

---

## 7. Command Cheat Sheet (Sering Dipakai)

### A. Frontend Cloudflare (via Git Push)

```bash
# dari root project
git add .
git commit -m "update frontend"
git push origin main
```

Cloudflare Pages akan build + deploy otomatis setelah push berhasil.

### B. Full Deploy Backend Lambda

```bash
# dari root project
cd backend
npm install
npx serverless deploy --stage prod
```

Pakai ini jika ada perubahan route, handler, infra, atau env.

### C. Deploy Cepat Satu Function

```bash
cd backend
npx serverless deploy function -f <namaFunction> --stage prod
```

Pakai ini jika hanya ubah logic function tanpa ubah infrastruktur. Catatan: satu file handler (mis. `expenses.ts`) dipakai beberapa function, jadi semua function yang memakainya perlu di-deploy ulang. Kalau ragu, pakai full deploy.

### D. Cek Logs Saat Error

```bash
cd backend
npx serverless logs -f <namaFunction> --stage prod --tail
```

### E. Verifikasi Endpoint Setelah Deploy

```bash
cd backend
npx serverless info --stage prod
```

Copy endpoint dari output, lalu test:

```bash
curl https://<api-id>.execute-api.<region>.amazonaws.com/prod/api/health
```

Atau jalankan `smoke-test-api.ps1` dari root project.

### F. Reset Admin (Jika Login 401)

```bash
cd backend
npx ts-node lambda/scripts/reset-admin-password.ts
```

### G. Urutan Aman Deploy Harian

1. Deploy backend dulu (`serverless deploy`)
2. Push frontend ke `main`
3. Test login + input sales + menu data