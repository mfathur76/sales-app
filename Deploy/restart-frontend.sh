#!/bin/bash

echo "🔄 Restarting Frontend on DO..."

# Navigate to project directory
cd /var/www/sales-app

# Build frontend with latest changes
echo "📦 Building frontend..."
cd frontend
npm install
npm run build

# Deploy to Nginx
echo "🚀 Deploying to Nginx..."
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# Restart Nginx
echo "🌐 Restarting Nginx..."
sudo systemctl restart nginx

# Check status
echo "📊 Checking status..."
sudo systemctl status nginx --no-pager

echo "✅ Frontend restarted successfully!"
echo ""
echo "🔗 Frontend URL: http://152.42.232.39"
echo "🔗 API URL: http://152.42.232.39/api"
echo ""
echo "🧪 Test login with:"
echo "Outlet: RM001"
echo "Password: rm0012024" 