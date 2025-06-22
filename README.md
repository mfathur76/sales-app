# 🏪 Sales App - Outlet Sales Management System

A comprehensive sales management system for retail outlets with bank transfer verification features.

## 🌟 Features

### **📊 Sales Management**
- ✅ Input daily sales data per outlet
- ✅ Multiple payment methods (Cash, QRIS, Gojek, Shopee, Grab)
- ✅ Sales statistics and reporting
- ✅ Date range filtering

### **🏦 Bank Transfer Verification**
- ✅ Admin input bank transfer amounts
- ✅ Real-time percentage calculation
- ✅ Digital payment verification (QRIS, Gojek, Shopee, Grab)
- ✅ Cash received directly (no bank transfer needed)
- ✅ Verification workflow with notes

### **👥 User Management**
- ✅ Outlet login system
- ✅ Admin dashboard
- ✅ Multi-level admin roles
- ✅ Secure authentication with JWT

### **📈 Analytics & Reporting**
- ✅ Sales overview dashboard
- ✅ Payment method breakdown
- ✅ Bank transfer realization percentage
- ✅ Export capabilities

## 🏗️ Tech Stack

### **Backend**
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT
- **Process Manager**: PM2

### **Frontend**
- **Framework**: React.js
- **Styling**: CSS3 with responsive design
- **State Management**: React Hooks
- **HTTP Client**: Fetch API

### **Infrastructure**
- **Web Server**: Nginx
- **SSL**: Let's Encrypt
- **Hosting**: DigitalOcean (recommended)
- **Backup**: Automated daily backups

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Git

### **Local Development**

#### **1. Clone Repository**
```bash
git clone https://github.com/mfathur/sales-app.git
cd sales-app
```

#### **2. Backend Setup**
```bash
cd backend
npm install
cp env.production.example .env
# Edit .env with your settings
npm run dev
```

#### **3. Frontend Setup**
```bash
cd frontend
npm install
npm start
```

#### **4. Database Setup**
```bash
cd backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### **Production Deployment**

#### **DigitalOcean Deployment (Recommended)**
```bash
# 1. Create DigitalOcean droplet
# 2. Connect to server
ssh root@your-droplet-ip

# 3. Clone and deploy
git clone https://github.com/mfathur/sales-app.git
cd sales-app
chmod +x deploy.sh
./deploy.sh

# 4. Setup domain & SSL
sudo certbot --nginx -d yourdomain.com
```

#### **Manual Deployment**
See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 📁 Project Structure

```
sales-app/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth middleware
│   │   └── types/          # TypeScript types
│   ├── prisma/             # Database schema & migrations
│   ├── ecosystem.config.js # PM2 configuration
│   └── nginx.conf          # Nginx configuration
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── api/           # API service
│   │   └── App.js         # Main app component
│   └── public/            # Static files
├── deploy.sh              # Deployment script
├── maintenance.sh         # Maintenance script
├── setup-cron.sh          # Cron jobs setup
├── DEPLOYMENT.md          # Deployment guide
├── QUICK_START.md         # Quick start guide
└── README.md              # This file
```

## 🔧 Configuration

### **Environment Variables**

#### **Backend (.env)**
```env
NODE_ENV=production
PORT=3001
DATABASE_URL="file:./data/sales.db"
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://yourdomain.com
```

#### **Frontend (src/api/salesApi.js)**
```javascript
const getApiBaseUrl = () => {
  return 'https://yourdomain.com/api';
};
```

## 📊 API Endpoints

### **Authentication**
- `POST /api/auth/login` - Outlet login
- `POST /api/admin/login` - Admin login

### **Sales Management**
- `GET /api/sales` - Get sales data
- `POST /api/sales` - Create sale record
- `PUT /api/sales/:outlet/:date` - Update sale
- `DELETE /api/sales/:outlet/:date` - Delete sale

### **Admin Features**
- `GET /api/admin/sales` - Get all sales for admin
- `PUT /api/admin/sales/:outlet/:date/bank-transfer` - Update bank transfer
- `PUT /api/admin/sales/:outlet/:date/status` - Update sale status
- `GET /api/admin/stats` - Admin statistics

### **Statistics**
- `GET /api/sales/stats` - Sales statistics
- `GET /api/sales/stats/overview` - Overview statistics

## 🛠️ Maintenance

### **Daily Operations**
```bash
# Check status
./maintenance.sh status

# View logs
./maintenance.sh logs

# Create backup
./maintenance.sh backup

# Restart services
./maintenance.sh restart
```

### **Automated Tasks**
```bash
# Setup cron jobs
./setup-cron.sh

# Cron jobs include:
# - Daily backup at 2 AM
# - Weekly system update at 3 AM (Sunday)
# - Daily log cleanup at 4 AM
# - SSL renewal check at 5 AM
```

## 🔒 Security Features

- ✅ JWT authentication
- ✅ CORS protection
- ✅ Input validation
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection
- ✅ HTTPS/SSL encryption
- ✅ Firewall configuration

## 📈 Performance

### **Recommended Server Specs**
- **Development**: 1 vCPU, 1GB RAM
- **Production**: 2 vCPU, 4GB RAM (recommended)
- **High Traffic**: 4 vCPU, 8GB RAM

### **Optimizations**
- Gzip compression
- Browser caching
- Database indexing
- PM2 process management
- Nginx reverse proxy

## 💰 Cost Estimation

### **DigitalOcean (Recommended)**
- **Droplet**: $24/month (2 vCPU, 4GB RAM)
- **Domain**: $10-15/year
- **Total**: ~$25/month

### **Other Providers**
- **Alibaba Cloud**: $53/month
- **AWS Lightsail**: $20/month
- **Vultr**: $24/month

## 🐛 Troubleshooting

### **Common Issues**

#### **1. Application Not Starting**
```bash
# Check PM2 logs
pm2 logs sales-backend

# Check if port is in use
sudo netstat -tlnp | grep :3001

# Restart PM2
pm2 delete sales-backend
pm2 start ecosystem.config.js
```

#### **2. Database Issues**
```bash
# Check database file
ls -la backend/data/

# Run migrations
cd backend
npx prisma migrate deploy
npx prisma generate
```

#### **3. SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Quick Start**: [QUICK_START.md](./QUICK_START.md)
- **Issues**: [GitHub Issues](https://github.com/mfathur/sales-app/issues)

## 🙏 Acknowledgments

- **Prisma** for excellent ORM
- **Express.js** for robust backend framework
- **React** for powerful frontend
- **DigitalOcean** for reliable hosting
- **Let's Encrypt** for free SSL certificates

---

**🎉 Happy coding! Your sales management system is ready to go!**
