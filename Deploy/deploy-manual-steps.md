# Manual Deployment Steps untuk BCA & Mandiri Bank Transfer

## 1. Upload Files ke Server

### Upload Backend:
```bash
# Dari komputer local, upload backend ke server
scp -r backend/ root@152.42.232.39:/opt/sales-app/
```

### Upload Frontend:
```bash
# Dari komputer local, upload frontend ke server
scp -r frontend/ root@152.42.232.39:/opt/sales-app/
```

### Upload Migration:
```bash
# Upload migration files
scp -r backend/prisma/migrations/ root@152.42.232.39:/opt/sales-app/backend/prisma/
```

## 2. SSH ke Server dan Update

```bash
# SSH ke server
ssh root@152.42.232.39

# Masuk ke direktori aplikasi
cd /opt/sales-app

# Jalankan update script dengan database fix
chmod +x deploy-bca-mandiri-fix.sh
./deploy-bca-mandiri-fix.sh
```

Atau jika masih ada error database readonly:

```bash
# Emergency fix
chmod +x emergency-db-fix.sh
./emergency-db-fix.sh
```

## 3. Atau Jalankan Manual di Server

Jika script tidak berhasil, jalankan manual:

```bash
# Update backend
cd /opt/sales-app/backend
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart sales-backend

# Update frontend
cd /opt/sales-app/frontend
npm install
rm -rf build
npm run build

# Deploy ke nginx
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
sudo systemctl restart nginx
```

## 4. Verifikasi

```bash
# Cek status PM2
pm2 status

# Cek logs
pm2 logs sales-backend

# Test API
curl http://152.42.232.39/api/health
```

## 5. Test di Browser

1. Buka http://152.42.232.39
2. Login sebagai admin
3. Buka sales record
4. Klik "Input Bank Transfer" atau "Edit Bank Transfer"
5. Pastikan ada input field untuk:
   - BCA Bank Transfer
   - Mandiri Bank Transfer

## Troubleshooting

### Jika BCA/Mandiri tidak muncul:
1. Clear browser cache (Ctrl+Shift+R)
2. Cek console browser untuk error
3. Cek backend logs: `pm2 logs sales-backend`
4. Pastikan migration berhasil: `npx prisma migrate status`

### Jika ada error database:
```bash
cd /opt/sales-app/backend
npx prisma db push
npx prisma generate
pm2 restart sales-backend
```

### Jika ada error sqlite3 module:
```bash
cd /opt/sales-app/backend
chmod +x fix-sqlite3-error.sh
./fix-sqlite3-error.sh
```

Atau manual:
```bash
cd /opt/sales-app/backend
npm install sqlite3
npm install --save-dev @types/sqlite3
rm -rf node_modules package-lock.json
npm install
npx prisma generate
npm run build
pm2 restart sales-backend
```

### Jika ada error database readonly:

#### Option 1: Quick Fix (Recommended)
```bash
cd /opt/sales-app
chmod +x quick-db-fix.sh
./quick-db-fix.sh
```

#### Option 2: Force Fix (If quick fix doesn't work)
```bash
cd /opt/sales-app
chmod +x force-fix-database.sh
./force-fix-database.sh
```

#### Option 3: Manual Fix
```bash
# Stop backend
pm2 stop sales-backend

# Find the actual database file
find /opt/sales-app -name "*.db" -type f

# Fix permissions aggressively
sudo chown -R $USER:$USER /opt/sales-app/backend/
sudo chmod -R 755 /opt/sales-app/backend/
sudo chmod 777 /opt/sales-app/backend/prisma/data/sales.db

# Verify permissions
ls -la /opt/sales-app/backend/prisma/data/sales.db

# Setup database
cd /opt/sales-app/backend
npx prisma migrate deploy
npx prisma generate

# Start backend
pm2 start sales-backend
``` 