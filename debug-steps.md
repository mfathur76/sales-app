# Debug Steps untuk Login Issue

## Masalah: CORS Error
```
Access to fetch at 'http://localhost:3001/api/auth/outlets' from origin 'http://152.42.232.39' has been blocked by CORS policy
```

## Solusi:

### 1. Restart Server di DO
```bash
# Masuk ke server DO
ssh root@152.42.232.39

# Masuk ke direktori backend
cd /var/www/sales-app/backend

# Buat .env jika belum ada
cp env.production.example .env

# Inisialisasi database
npx prisma migrate deploy
npx prisma generate
npx prisma db seed

# Restart PM2
pm2 delete all
pm2 start ecosystem.config.js
pm2 save

# Restart nginx
sudo systemctl restart nginx
```

### 2. Clear Browser Cache
- Buka browser
- Tekan F12 untuk Developer Tools
- Klik kanan pada tombol refresh
- Pilih "Empty Cache and Hard Reload"

### 3. Test API
```bash
# Test health check
curl http://152.42.232.39/api/health

# Test outlets
curl http://152.42.232.39/api/auth/outlets

# Test login
curl -X POST http://152.42.232.39/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"outlet":"RM001","password":"rm0012024"}'
```

### 4. Check Logs
```bash
# Check nginx logs
sudo tail -f /var/log/nginx/sales-app.error.log

# Check application logs
pm2 logs
```

## Password Default:
- RM001: rm0012024
- RM002: rm0022024
- RM003: rm0032024
- RM004: rm0042024 