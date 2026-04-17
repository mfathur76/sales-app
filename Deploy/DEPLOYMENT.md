# Deployment Guide — Cloudflare Pages + AWS Lambda

## Arsitektur

| Layer | Provider | Keterangan |
|-------|----------|------------|
| Frontend | Cloudflare Pages | Auto-deploy dari GitHub push ke `main` |
| Backend | AWS Lambda + API Gateway | Deploy via Serverless Framework |
| Database | AWS DynamoDB | Serverless, pay-as-you-go |
| Domain | sales.risolmejik.com | Custom domain di Cloudflare Pages |

---

## 1. Deploy Backend (AWS Lambda)

### Prasyarat
- AWS CLI terkonfigurasi (`aws configure`)
- Node.js 18+
- Serverless Framework (`npm install -g serverless`)

### Wajib Set ENV Sebelum Deploy (PowerShell)

`serverless.yml` membaca value dari environment terminal saat deploy. Jalankan ini dulu di terminal yang sama:

```powershell
$env:JWT_SECRET="<isi-jwt-secret-yang-kuat>"
$env:CORS_ALLOWED_ORIGINS="https://sales.risolmejik.com"
```

Lalu deploy tanpa pindah terminal.

### Langkah

```bash
cd backend
npm install

# Deploy ke production
npx serverless deploy --stage prod
```

> Output deploy akan menampilkan API Gateway endpoint URL. Catat URL ini.

### Environment Variables Backend

Set environment variables di `backend/.env` sebelum deploy:

```env
NODE_ENV=production
JWT_SECRET=<random-string-panjang>
CORS_ALLOWED_ORIGINS=https://sales.risolmejik.com
DYNAMODB_TABLE_PREFIX=sales-app-api
AWS_REGION=ap-southeast-3
```

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

# Lihat logs Lambda secara live
npx serverless logs -f api --stage prod --tail

# Deploy ulang hanya satu function
npx serverless deploy function -f api --stage prod
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
npx serverless deploy function -f api --stage prod
```

Pakai ini jika hanya ubah logic function tanpa ubah infrastruktur.

### D. Cek Logs Saat Error

```bash
cd backend
npx serverless logs -f api --stage prod --tail
```

### E. Verifikasi Endpoint Setelah Deploy

```bash
cd backend
npx serverless info --stage prod
```

Copy endpoint dari output, lalu test:

```bash
curl https://<api-id>.execute-api.<region>.amazonaws.com/health
```

### F. Reset Admin (Jika Login 401)

```bash
cd backend
npx ts-node lambda/scripts/reset-admin-password.ts
```

### G. Urutan Aman Deploy Harian

1. Deploy backend dulu (`serverless deploy`)
2. Push frontend ke `main`
3. Test login + input sales + menu data