# Debug Frontend Cache Issue

## Masalah:
```
Access to fetch at 'http://localhost:3001/api/admin/login' from origin 'http://152.42.232.39'
```

## Penyebab:
Browser masih menggunakan cache lama yang mengakses `localhost:3001`

## Solusi:

### 1. Force Rebuild Frontend
```bash
cd /var/www/sales-app/frontend

# Clean build
rm -rf build/
rm -rf node_modules/

# Fresh install
npm install

# Build
npm run build

# Deploy
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# Restart nginx
sudo systemctl restart nginx
```

### 2. Clear Browser Cache
- Buka browser
- Tekan `F12` untuk Developer Tools
- Klik kanan pada tombol refresh
- Pilih **"Empty Cache and Hard Reload"**

### 3. Check Browser Console
- Tekan `F12`
- Buka tab Console
- Lihat apakah ada log:
  ```
  🔍 getApiBaseUrl - hostname: 152.42.232.39
  🔍 getApiBaseUrl - Production API URL: http://152.42.232.39/api
  🔍 API_BASE_URL set to: http://152.42.232.39/api
  ```

### 4. Test API Langsung
```bash
# Test health
curl http://152.42.232.39/api/health

# Test outlets
curl http://152.42.232.39/api/auth/outlets

# Test login
curl -X POST http://152.42.232.39/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"outlet":"RM001","password":"rm0012024"}'
```

### 5. Check File Timestamps
```bash
# Check if files are updated
ls -la /var/www/html/static/js/
```

## Jika Masih Bermasalah:

### 1. Hard Refresh
- Tekan `Ctrl + Shift + R` (Windows/Linux)
- Tekan `Cmd + Shift + R` (Mac)

### 2. Incognito Mode
- Buka browser dalam mode incognito/private
- Test login di sana

### 3. Different Browser
- Coba browser yang berbeda
- Atau hapus cache browser sepenuhnya

### 4. Check Network Tab
- Tekan `F12`
- Buka tab Network
- Lihat request yang dikirim
- Pastikan URL yang benar digunakan 