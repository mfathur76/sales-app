# ⚡ Quick Start Guide - Sales App Deployment

Panduan cepat untuk deploy Sales App ke Alibaba Cloud dalam 30 menit.

## 🚀 Super Quick Deployment (30 minutes)

### Step 1: Alibaba Cloud Setup (5 min)
1. **Daftar Alibaba Cloud**: [alibabacloud.com](https://www.alibabacloud.com/)
2. **Create ECS Instance**:
   - Region: Asia Pacific (Jakarta)
   - Instance: 2 vCPU, 4GB RAM, 40GB SSD
   - OS: Ubuntu 20.04 LTS
   - Security Group: Open port 22, 80, 443

### Step 2: Connect & Deploy (10 min)
```bash
# Connect to server
ssh root@your-server-ip

# Create user (optional)
adduser salesuser
usermod -aG sudo salesuser
su - salesuser

# Clone & deploy
git clone https://github.com/yourusername/sales-app.git
cd sales-app
chmod +x deploy.sh
./deploy.sh
```

### Step 3: Domain & SSL (10 min)
```bash
# Point domain to server IP
# Then get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Update frontend API URL
nano frontend/src/api/salesApi.js
# Change to: return 'https://yourdomain.com/api';

# Rebuild frontend
cd frontend
npm run build
sudo cp -r build/* /var/www/html/
```

### Step 4: Setup Data (5 min)
```bash
# Create admin
curl -X POST https://yourdomain.com/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "name": "Administrator", 
    "password": "admin123",
    "role": "super_admin"
  }'

# Create outlet
curl -X POST https://yourdomain.com/api/auth/outlets \
  -H "Content-Type: application/json" \
  -d '{
    "code": "OUTLET001",
    "name": "Outlet Pusat",
    "password": "outlet123"
  }'
```

## 🎉 Done! Your app is live at:
- **Frontend**: https://yourdomain.com
- **Admin**: https://yourdomain.com/admin
- **API**: https://yourdomain.com/api

## 📊 Quick Commands

### Check Status
```bash
# App status
pm2 status
pm2 logs sales-backend

# System status
./maintenance.sh status
```

### Backup & Maintenance
```bash
# Create backup
./maintenance.sh backup

# View logs
./maintenance.sh logs

# Setup auto-backup
chmod +x setup-cron.sh
./setup-cron.sh
```

### Troubleshooting
```bash
# Restart everything
./maintenance.sh restart

# Check nginx
sudo nginx -t
sudo systemctl status nginx

# Check SSL
sudo certbot certificates
```

## 💰 Cost Breakdown
- **ECS Instance**: $15-20/month
- **Domain**: $10-15/year
- **Total**: ~$20-30/month

## 🔒 Security Checklist
- [ ] Changed default passwords
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Regular backups enabled
- [ ] System updates automated

## 📞 Need Help?
- **Logs**: `./maintenance.sh logs`
- **Status**: `./maintenance.sh status`
- **Restart**: `./maintenance.sh restart`
- **Backup**: `./maintenance.sh backup`

---

**🎯 That's it! Your Sales App is now live and ready to use!** 