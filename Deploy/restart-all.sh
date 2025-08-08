#!/bin/bash

echo "🔄 Restarting Sales App (Frontend + Backend)..."

# Navigate to project directory
cd /var/www/sales-app

# 1. Restart Backend
echo "🔧 Restarting Backend..."
cd backend

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp env.production.example .env
fi

# Initialize database
echo "🗄️  Initializing database..."
npx prisma migrate deploy
npx prisma generate
npx prisma db seed

# Restart PM2
echo "🔄 Restarting PM2..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# 2. Restart Frontend
echo "🎨 Restarting Frontend..."
cd ../frontend

# Build frontend
echo "📦 Building frontend..."
npm install
npm run build

# Deploy to Nginx
echo "🚀 Deploying to Nginx..."
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# 3. Restart Nginx
echo "🌐 Restarting Nginx..."
sudo systemctl restart nginx

# 4. Check Status
echo "📊 Checking status..."
echo ""
echo "PM2 Status:"
pm2 status
echo ""
echo "Nginx Status:"
sudo systemctl status nginx --no-pager

echo ""
echo "✅ Restart completed successfully!"
echo ""
echo "🔗 URLs:"
echo "Frontend: http://152.42.232.39"
echo "API Health: http://152.42.232.39/api/health"
echo "API Outlets: http://152.42.232.39/api/auth/outlets"
echo ""
echo "🧪 Test Login:"
echo "Outlet: RM001"
echo "Password: rm0012024"
echo ""
echo "📝 Logs:"
echo "PM2 Logs: pm2 logs"
echo "Nginx Logs: sudo tail -f /var/log/nginx/sales-app.error.log" 