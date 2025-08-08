# 🚀 Sales App Deployment Guide - Alibaba Cloud

Panduan lengkap untuk deploy aplikasi Sales App ke Alibaba Cloud.

## 📋 Prerequisites

### 1. Alibaba Cloud Account
- Daftar di [Alibaba Cloud](https://www.alibabacloud.com/)
- Verifikasi dengan KTP
- Aktifkan free tier (12 bulan gratis)

### 2. Domain Name
- Beli domain di Alibaba Cloud atau provider lain
- Contoh: `sales-app.com` atau `sales-app.id`

### 3. Credit Card/Payment Method
- Untuk verifikasi dan billing setelah free tier

## 🏗️ Step 1: Create ECS Instance

### 1.1 Login ke Alibaba Cloud Console
```
https://ecs.console.aliyun.com/
```

### 1.2 Create Instance
- **Region**: Asia Pacific (Jakarta) - untuk latency terbaik
- **Instance Type**: 
  - Free Tier: 1 vCPU, 2GB RAM
  - Paid: 2 vCPU, 4GB RAM (recommended)
- **OS**: Ubuntu 20.04 LTS
- **Storage**: 40GB SSD
- **Network**: VPC dengan public IP

### 1.3 Security Group
Buka port berikut:
- **22** (SSH)
- **80** (HTTP)
- **443** (HTTPS)

### 1.4 Connect ke Server
```bash
ssh root@your-server-ip
```

## 🛠️ Step 2: Server Setup

### 2.1 Create User (Optional but Recommended)
```bash
# Create new user
adduser salesuser
usermod -aG sudo salesuser

# Switch to new user
su - salesuser
```

### 2.2 Clone Repository
```bash
# Install Git
sudo apt update
sudo apt install git -y

# Clone your repository
git clone https://github.com/yourusername/sales-app.git
cd sales-app
```

### 2.3 Run Deployment Script
```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

## ⚙️ Step 3: Configuration

### 3.1 Environment Variables
```bash
# Edit backend environment
nano backend/.env
```

**Required settings:**
```env
NODE_ENV=production
PORT=3001
DATABASE_URL="file:./data/sales.db"
JWT_SECRET=your-super-secret-jwt-key-change-this
CORS_ORIGIN=https://yourdomain.com
```

### 3.2 Update Frontend API URL
```bash
# Edit frontend API configuration
nano frontend/src/api/salesApi.js
```

**Change API base URL:**
```javascript
const getApiBaseUrl = () => {
  return 'https://yourdomain.com/api';
};
```

### 3.3 Rebuild Applications
```bash
# Rebuild backend
cd backend
npm run build
pm2 restart sales-backend

# Rebuild frontend
cd ../frontend
npm run build
sudo cp -r build/* /var/www/html/
```

## 🌐 Step 4: Domain & SSL Setup

### 4.1 Point Domain to Server
Di domain provider, set A record:
```
Type: A
Name: @
Value: your-server-ip
TTL: 300
```

### 4.2 Update Nginx Configuration
```bash
# Edit nginx config
sudo nano /etc/nginx/sites-available/sales-app
```

**Replace `yourdomain.com` with your actual domain**

### 4.3 Get SSL Certificate
```bash
# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 4.4 Restart Services
```bash
# Restart nginx
sudo systemctl restart nginx

# Restart backend
pm2 restart sales-backend
```

## 🔧 Step 5: Database Setup

### 5.1 Create Initial Data
```bash
cd backend

# Run seed script (if available)
npm run seed

# Or create admin manually via API
curl -X POST https://yourdomain.com/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "name": "Administrator",
    "password": "your-secure-password",
    "role": "super_admin"
  }'
```

### 5.2 Create Outlet
```bash
curl -X POST https://yourdomain.com/api/auth/outlets \
  -H "Content-Type: application/json" \
  -d '{
    "code": "OUTLET001",
    "name": "Outlet Pusat",
    "password": "outlet-password"
  }'
```

## 📊 Step 6: Monitoring & Maintenance

### 6.1 PM2 Commands
```bash
# Check status
pm2 status

# View logs
pm2 logs sales-backend

# Restart application
pm2 restart sales-backend

# Monitor resources
pm2 monit
```

### 6.2 Nginx Commands
```bash
# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/sales-app.access.log
sudo tail -f /var/log/nginx/sales-app.error.log

# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx
```

### 6.3 Backup Database
```bash
# Create backup script
nano backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp backend/data/sales.db backend/data/sales_backup_$DATE.db
echo "Backup created: sales_backup_$DATE.db"
```

```bash
chmod +x backup.sh
./backup.sh
```

## 🔒 Step 7: Security Hardening

### 7.1 Update System Regularly
```bash
# Add to crontab
sudo crontab -e

# Add this line for daily updates
0 2 * * * apt update && apt upgrade -y
```

### 7.2 Firewall Rules
```bash
# Check firewall status
sudo ufw status

# Allow only necessary ports
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 7.3 Fail2ban (Optional)
```bash
# Install fail2ban
sudo apt install fail2ban -y

# Configure for SSH protection
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 🚨 Troubleshooting

### Common Issues:

#### 1. Application Not Starting
```bash
# Check PM2 logs
pm2 logs sales-backend

# Check if port is in use
sudo netstat -tlnp | grep :3001

# Restart PM2
pm2 delete sales-backend
pm2 start ecosystem.config.js
```

#### 2. Nginx 502 Bad Gateway
```bash
# Check if backend is running
pm2 status

# Check nginx error logs
sudo tail -f /var/log/nginx/sales-app.error.log

# Test backend directly
curl http://localhost:3001/api/health
```

#### 3. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check nginx SSL configuration
sudo nginx -t
```

#### 4. Database Issues
```bash
# Check database file
ls -la backend/data/

# Check database permissions
sudo chown -R $USER:$USER backend/data/
chmod 644 backend/data/sales.db
```

## 📈 Performance Optimization

### 1. Enable Gzip Compression
```bash
# Already configured in nginx.conf
# Check if working
curl -H "Accept-Encoding: gzip" -I https://yourdomain.com
```

### 2. Enable Browser Caching
```bash
# Already configured in nginx.conf
# Static assets cached for 1 year
```

### 3. Database Optimization
```bash
# For SQLite, consider upgrading to PostgreSQL for better performance
# Update DATABASE_URL in .env
```

## 💰 Cost Optimization

### 1. Alibaba Cloud Pricing
- **ECS Instance**: $15-20/month (2 vCPU, 4GB RAM)
- **CDN**: $5-10/month (optional)
- **Domain**: $10-15/year
- **Total**: ~$20-30/month

### 2. Free Tier Usage
- Use free tier for 12 months
- Downgrade to smaller instance if traffic low
- Use Alibaba Cloud CDN for better performance

## 📞 Support

### Useful Commands:
```bash
# System info
htop
df -h
free -h

# Application logs
pm2 logs --lines 100
sudo journalctl -u nginx -f

# Network
sudo netstat -tlnp
curl -I https://yourdomain.com
```

### Contact:
- **Alibaba Cloud Support**: Available in console
- **Documentation**: [Alibaba Cloud Docs](https://www.alibabacloud.com/help)
- **Community**: [Alibaba Cloud Community](https://community.alibabacloud.com/)

---

**🎉 Congratulations! Your Sales App is now live on Alibaba Cloud!**

**🌐 Access your application:**
- Frontend: https://yourdomain.com
- Backend API: https://yourdomain.com/api
- Admin Dashboard: https://yourdomain.com/admin 

## Quick Deploy Scripts

### 1. Deploy Admin Loading Fix
**Problem**: After admin login, only shows "loading user" instead of admin dashboard.

**Solution**: Fixed App.js to properly handle admin vs outlet user rendering.

**Deploy using scripts:**
```bash
# Linux/Mac
./deploy-admin-fix.sh

# Windows Batch
deploy-admin-fix.bat

# Windows PowerShell
.\deploy-admin-fix.ps1
```

**Option 1: Pull from GitHub (Recommended)**
```bash
# Linux/Mac
./pull-and-deploy-admin-fix.sh

# Windows Batch
pull-and-deploy-admin-fix.bat

# Windows PowerShell
.\pull-and-deploy-admin-fix.ps1
```

**Option 2: Manual deployment**
```bash
# 1. Upload fixed App.js
scp -i DOSSHKEY frontend/src/App.js root@your-server-ip:/var/www/sales-app/frontend/src/App.js

# 2. SSH to server
ssh -i DOSSHKEY root@your-server-ip

# 3. Build and restart frontend
cd /var/www/sales-app/frontend
npm run build
pm2 restart sales-frontend
pm2 status
```

**Changes made:**
- Added null check for admin data in renderPage()
- Fixed routing to show AdminDashboard for admin users
- Added proper user type checking in all page routes