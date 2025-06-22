#!/bin/bash

echo "💥 Force Cache Busting and Rebuild..."

# Navigate to project directory
cd /opt/sales-app

# Clean everything
echo "🧹 Cleaning everything..."
cd frontend
rm -rf build/
rm -rf node_modules/
rm -rf .cache/

# Fresh install
echo "📦 Fresh npm install..."
npm install

# Build with timestamp
echo "🔨 Building frontend..."
BUILD_TIME=$(date +%s)
echo "Build timestamp: $BUILD_TIME"

# Add timestamp to force cache bust
echo "// Build timestamp: $BUILD_TIME" > src/build-info.js

npm run build

# Verify build
echo "✅ Verifying build..."
if [ ! -f "build/static/js/main.*.js" ]; then
    echo "❌ Build failed - main.js not found"
    exit 1
fi

# Backup old files
echo "💾 Backing up old files..."
sudo cp -r /var/www/html /var/www/html.backup.$(date +%s) 2>/dev/null || true

# Deploy to Nginx
echo "🚀 Deploying to Nginx..."
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# Clear all caches
echo "🧹 Clearing all caches..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
sudo rm -rf /tmp/* 2>/dev/null || true

# Restart Nginx
echo "🌐 Restarting Nginx..."
sudo systemctl restart nginx

# Check status
echo "📊 Checking status..."
sudo systemctl status nginx --no-pager

echo ""
echo "✅ Force cache bust completed!"
echo ""
echo "🔗 Frontend URL: http://152.42.232.39"
echo "🔗 API URL: http://152.42.232.39/api"
echo ""
echo "🧪 Test login with:"
echo "Outlet: RM001"
echo "Password: rm0012024"
echo ""
echo "💡 IMPORTANT: Clear browser cache completely:"
echo "   - Press F12"
echo "   - Right-click refresh button"
echo "   - Select 'Empty Cache and Hard Reload'"
echo "   - Or use Ctrl+Shift+R (hard refresh)" 