# Database Readonly Fix Guide

## 🚨 Quick Solutions

### 1. Emergency Fix (Paling Cepat)
```bash
# Upload dan deploy
chmod +x upload-and-deploy.sh
./upload-and-deploy.sh

# SSH ke server
ssh root@152.42.232.39
cd /opt/sales-app

# Emergency fix
chmod +x emergency-db-fix.sh
./emergency-db-fix.sh
```

### 2. Quick Fix (Jika emergency tidak berhasil)
```bash
# Di server
chmod +x quick-db-fix.sh
./quick-db-fix.sh
```

### 3. Force Fix (Jika quick fix tidak berhasil)
```bash
# Di server
chmod +x force-fix-database.sh
./force-fix-database.sh
```

### 4. Full Deployment (Lengkap dengan database fix)
```bash
# Di server
chmod +x deploy-bca-mandiri-fix.sh
./deploy-bca-mandiri-fix.sh
```

## 🔍 Manual Steps

Jika semua script tidak berhasil, jalankan manual:

```bash
# 1. Stop backend
pm2 stop sales-backend

# 2. Find database file
find /opt/sales-app -name "*.db" -type f

# 3. Fix permissions aggressively
sudo chown -R $USER:$USER /opt/sales-app/backend/
sudo chmod -R 755 /opt/sales-app/backend/
sudo chmod 777 /opt/sales-app/backend/prisma/data/sales.db

# 4. Verify permissions
ls -la /opt/sales-app/backend/prisma/data/sales.db

# 5. Setup database
cd /opt/sales-app/backend
npx prisma migrate deploy
npx prisma generate

# 6. Start backend
pm2 start sales-backend
```

## 📋 Troubleshooting

### Error: "attempt to write a readonly database"
- **Cause**: Database file atau directory tidak memiliki permission write
- **Solution**: Jalankan `emergency-db-fix.sh`

### Error: "database is locked"
- **Cause**: Database sedang digunakan oleh process lain
- **Solution**: Stop backend dulu, lalu jalankan fix script

### Error: "no such table"
- **Cause**: Migration belum dijalankan
- **Solution**: Jalankan `npx prisma migrate deploy`

### Error: "sqlite3 module not found"
- **Cause**: Module sqlite3 belum terinstall
- **Solution**: Jalankan `fix-sqlite3-error.sh`

## 🔧 Script Descriptions

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `emergency-db-fix.sh` | Fix database readonly dengan cara paling agresif | Saat error database readonly |
| `quick-db-fix.sh` | Fix database dengan cara yang lebih aman | Jika emergency fix tidak berhasil |
| `force-fix-database.sh` | Fix database dengan cara paling comprehensive | Jika quick fix tidak berhasil |
| `deploy-bca-mandiri-fix.sh` | Deploy lengkap dengan database fix | Untuk deployment baru |
| `upload-and-deploy.sh` | Upload files dan deploy | Dari komputer local |

## 📊 Verification

Setelah fix, cek:

```bash
# 1. Database permissions
ls -la /opt/sales-app/backend/prisma/data/sales.db

# 2. PM2 status
pm2 status

# 3. Backend logs
pm2 logs sales-backend

# 4. Test database connection
cd /opt/sales-app/backend
npx prisma db pull

# 5. Test API
curl http://152.42.232.39/api/health
```

## 🌐 Test di Browser

1. Buka http://152.42.232.39
2. Login sebagai admin
3. Test input sales dengan BCA/Mandiri transfer
4. Pastikan tidak ada error di console browser 