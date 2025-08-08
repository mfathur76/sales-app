# Debug Login Issue

## Masalah yang Mungkin Terjadi:

### 1. API URL Masih Localhost
Frontend masih menggunakan `localhost:3001` padahal sudah di DO.

**Solusi:** Sudah diperbaiki di `frontend/src/api/salesApi.js`

### 2. Database Belum Diinisialisasi
Outlet data mungkin belum ada di database.

**Solusi:**
```bash
cd /var/www/sales-app/backend
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

### 3. Environment Variables
JWT_SECRET mungkin tidak diset.

**Solusi:**
```bash
cd /var/www/sales-app/backend
cp env.production.example .env
# Edit .env file dengan JWT_SECRET yang benar
```

### 4. CORS Issues
Backend mungkin menolak request dari frontend.

**Solusi:** Sudah diperbaiki di `backend/src/index.ts`

## Langkah Debugging:

### 1. Test API Langsung
```bash
# Test health check
curl http://your-server-ip/api/health

# Test get outlets
curl http://your-server-ip/api/auth/outlets

# Test login
curl -X POST http://your-server-ip/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"outlet":"RM001","password":"rm0012024"}'
```

### 2. Check Server Logs
```bash
# Check nginx logs
sudo tail -f /var/log/nginx/sales-app.error.log

# Check application logs
pm2 logs sales-app
```

### 3. Check Database
```bash
cd /var/www/sales-app/backend
npx prisma studio
```

### 4. Restart Services
```bash
pm2 restart sales-app
sudo systemctl restart nginx
```

## Password Default:
- RM001: rm0012024
- RM002: rm0022024  
- RM003: rm0032024
- RM004: rm0042024

## Test File:
Gunakan file `frontend/test-login.html` untuk testing langsung di browser. 