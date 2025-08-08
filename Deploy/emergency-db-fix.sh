#!/bin/bash

echo "🚨 EMERGENCY DATABASE FIX"

# Stop backend
pm2 stop sales-backend

# Find and fix database
DB_PATH="/opt/sales-app/backend/prisma/data/sales.db"

echo "Fixing database: $DB_PATH"

# Create directory if needed
mkdir -p /opt/sales-app/backend/prisma/data

# Create file if needed
touch "$DB_PATH"

# Fix permissions with sudo
sudo chown $USER:$USER "$DB_PATH"
sudo chmod 777 "$DB_PATH"

# Fix entire backend directory
sudo chown -R $USER:$USER /opt/sales-app/backend/
sudo chmod -R 755 /opt/sales-app/backend/

echo "Database permissions:"
ls -la "$DB_PATH"

# Setup database
cd /opt/sales-app/backend
npx prisma migrate deploy
npx prisma generate

# Start backend
pm2 start sales-backend

echo "✅ Emergency fix completed!"
pm2 status 