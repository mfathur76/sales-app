#!/bin/bash

echo "⚡ Quick Update Sales App"

# Navigate to project directory
cd /var/www/sales-app

echo "🔄 Updating backend..."
cd backend
npm install
npx prisma generate
npm run build
pm2 restart all

echo "🔄 Updating frontend..."
cd ../frontend
npm install
npm run build
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

echo "🔄 Restarting nginx..."
sudo systemctl restart nginx

echo "✅ Update completed!"
echo "🌐 Test at: http://152.42.232.39" 