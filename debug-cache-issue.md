# Debug Cache Issue - Frontend Still Using Localhost

## Masalah:
```
Access to fetch at 'http://localhost:3001/api/auth/outlets' from origin 'http://152.42.232.39'
```

## Penyebab:
Browser masih menggunakan cache lama yang mengakses `localhost:3001`

## Solusi Lengkap:

### 1. Force Rebuild di Server DO
```bash
cd /opt/sales-app

# Clean build
cd frontend
rm -rf build/ node_modules/
npm install
npm run build

# Deploy
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# Restart nginx
sudo systemctl restart nginx
```

### 2. Clear Browser Cache (PENTING!)
**LANGKAH INI WAJIB DILAKUKAN:**

1. **Buka browser** dan akses http://152.42.232.39
2. **Tekan `F12`** untuk Developer Tools
3. **Klik kanan** pada tombol refresh
4. **Pilih "Empty Cache and Hard Reload"**

### 3. Check Browser Console
Setelah clear cache, buka Developer Tools (F12) dan lihat di tab Console. Anda harus melihat:
```
🔍 getApiBaseUrl - hostname: 152.42.232.39
🔍 getApiBaseUrl - Production API URL: http://152.42.232.39/api
🔍 FORCED API URL: http://152.42.232.39/api
```

### 4. Test API Langsung
```bash
# Test health
curl http://152.42.232.39/api/health

# Test outlets
curl http://152.42.232.39/api/auth/outlets
```

### 5. Jika Masih Bermasalah

#### A. Hard Refresh
- Tekan `Ctrl + Shift + R` (Windows/Linux)
- Tekan `Cmd + Shift + R` (Mac)

#### B. Incognito Mode
- Buka browser dalam mode incognito/private
- Test login di sana

#### C. Different Browser
- Coba browser yang berbeda
- Atau hapus cache browser sepenuhnya

#### D. Check Network Tab
- Tekan `F12`
- Buka tab Network
- Lihat request yang dikirim
- Pastikan URL yang benar digunakan

### 6. Force Cache Bust Script
```bash
# Di server DO
cd /opt/sales-app
chmod +x force-cache-bust.sh
./force-cache-bust.sh
```

## Verifikasi:
Setelah semua langkah di atas, cek di browser console apakah URL yang digunakan sudah benar:
- ❌ `http://localhost:3001/api` (salah)
- ✅ `http://152.42.232.39/api` (benar) 