#!/bin/bash

echo "🔧 Fixing Login Issues..."

cd /var/www/sales-app/backend

# 1. Create .env if not exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp env.production.example .env
fi

# 2. Initialize database
echo "Initializing database..."
npx prisma migrate deploy
npx prisma generate
npx prisma db seed

# 3. Restart services
echo "Restarting services..."
pm2 restart sales-app
sudo systemctl restart nginx

echo "✅ Fix completed!"
echo "Test login with: RM001 / rm0012024" 