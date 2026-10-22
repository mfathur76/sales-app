# Setup Domain: sales.risolmejik.com

## Langkah Setup (Cloudflare Pages + AWS API)

### 1. Tambahkan Custom Domain di Cloudflare Pages
1. Buka project frontend di Cloudflare Pages.
2. Masuk ke tab **Custom domains**.
3. Tambahkan domain `sales.risolmejik.com`.
4. Ikuti instruksi DNS yang diberikan Cloudflare.

### 2. Pastikan Frontend Pakai API URL Production
Di frontend, pastikan base URL API mengarah ke endpoint AWS API Gateway production.

### 3. Sinkronkan CORS di Backend
Di backend (Lambda), set environment:

```env
CORS_ALLOWED_ORIGINS=https://sales.risolmejik.com
```

Lalu redeploy backend agar env terbaru aktif.

### 4. Validasi Setelah Deploy
- Frontend: `https://sales.risolmejik.com`
- API Health: endpoint health API Gateway
- Login outlet/admin harus sukses tanpa CORS error

### 5. Troubleshooting Cepat
1. Cek DNS propagation: https://www.whatsmydns.net/
2. Hard reload browser (Empty Cache and Hard Reload)
3. Pastikan response API menyertakan header CORS origin yang sesuai

## Catatan
- SSL untuk frontend ditangani Cloudflare otomatis.
- Jika domain API berbeda dengan domain frontend, CORS harus selalu sinkron.