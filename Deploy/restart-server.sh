#!/bin/bash

echo "🔄 Restarting Sales App Server..."

# Navigate to backend directory
cd /var/www/sales-app/backend

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

# Check PM2 processes
echo "📋 Checking PM2 processes..."
pm2 list

# Kill existing processes
echo "🛑 Stopping existing processes..."
pm2 delete all 2>/dev/null || true

# Start the application
echo "🚀 Starting application..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Restart nginx
echo "🌐 Restarting nginx..."
sudo systemctl restart nginx

# Check status
echo "📊 Checking status..."
pm2 status
sudo systemctl status nginx --no-pager

echo "✅ Server restarted successfully!"
echo ""
echo "🔗 Test URLs:"
echo "Frontend: http://152.42.232.39"
echo "API Health: http://152.42.232.39/api/health"
echo "API Outlets: http://152.42.232.39/api/auth/outlets"
echo ""
echo "🔑 Test Login:"
echo "Outlet: RM001"
echo "Password: rm0012024" 