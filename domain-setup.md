# Setup Domain: sales.risolmejik.com

## Langkah-langkah Setup Domain

### 1. Konfigurasi DNS

Di provider domain Anda (GoDaddy, Namecheap, dll), tambahkan DNS records:

**A Records:**
```
risolmejik.com     → 152.42.232.39
sales.risolmejik.com → 152.42.232.39
```

**CNAME Records (opsional):**
```
www.risolmejik.com → risolmejik.com
```

### 2. Setup di Server DO

Jalankan perintah berikut di server DO:

```bash
# Masuk ke server DO
ssh root@152.42.232.39

# Masuk ke direktori aplikasi
cd /opt/sales-app

# Pull latest changes
git pull origin main

# Update nginx config
sudo cp backend/nginx.conf /etc/nginx/sites-available/sales-app
sudo ln -sf /etc/nginx/sites-available/sales-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 3. Setup SSL Certificate

```bash
# Install certbot (jika belum)
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d sales.risolmejik.com --non-interactive --agree-tos --email admin@risolmejik.com

# Setup auto-renewal
sudo crontab -e
# Tambahkan: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 4. Update Frontend

```bash
# Build frontend dengan konfigurasi baru
cd /opt/sales-app/frontend
npm run build

# Deploy ke nginx
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# Restart services
sudo systemctl restart nginx
cd /opt/sales-app/backend
pm2 restart all
```

### 5. Test Aplikasi

Setelah setup selesai, test:

- **Frontend**: https://sales.risolmejik.com
- **API Health**: https://sales.risolmejik.com/api/health
- **Login**: RM001 / rm0012024

### 6. Troubleshooting

**Jika domain tidak bisa diakses:**
1. Cek DNS propagation: https://www.whatsmydns.net/
2. Tunggu 24-48 jam untuk DNS propagation
3. Cek nginx logs: `sudo tail -f /var/log/nginx/sales-app.error.log`

**Jika SSL error:**
1. Cek certificate: `sudo certbot certificates`
2. Renew manual: `sudo certbot renew`
3. Restart nginx: `sudo systemctl restart nginx`

### 7. Monitoring

```bash
# Check SSL certificate
sudo certbot certificates

# Check nginx status
sudo systemctl status nginx

# Check PM2 status
pm2 status

# Check logs
sudo tail -f /var/log/nginx/sales-app.error.log
pm2 logs
```

## Keuntungan Menggunakan Domain

1. **Tidak ada masalah CORS** - domain yang sama
2. **SSL/HTTPS** - lebih aman
3. **Professional** - URL yang lebih baik
4. **Tidak ada cache issues** - browser akan reload fresh
5. **SEO friendly** - lebih baik untuk indexing

## URL Setelah Setup

- **Frontend**: https://sales.risolmejik.com
- **API**: https://sales.risolmejik.com/api
- **Health Check**: https://sales.risolmejik.com/api/health 