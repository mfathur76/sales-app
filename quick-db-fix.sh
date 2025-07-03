#!/bin/bash

echo "🔧 Quick Database Fix..."

# Stop backend
pm2 stop sales-backend

# Find the actual database file
echo "Finding database file..."
DB_FILE=""

# Check common locations
for path in \
    "/opt/sales-app/backend/prisma/data/sales.db" \
    "/var/www/sales-app/backend/prisma/data/sales.db" \
    "/opt/sales-app/backend/data/sales.db" \
    "/opt/sales-app/prisma/data/sales.db"; do
    
    if [ -f "$path" ]; then
        DB_FILE="$path"
        echo "Found database at: $DB_FILE"
        break
    fi
done

if [ -z "$DB_FILE" ]; then
    echo "Creating new database..."
    mkdir -p /opt/sales-app/backend/prisma/data
    DB_FILE="/opt/sales-app/backend/prisma/data/sales.db"
    touch "$DB_FILE"
fi

# Fix permissions aggressively
echo "Fixing permissions..."
sudo chown -R $USER:$USER /opt/sales-app/backend/
sudo chmod -R 755 /opt/sales-app/backend/
sudo chmod 777 "$DB_FILE"

# Show current permissions
echo "Current database permissions:"
ls -la "$DB_FILE"

# Test write access
if [ -w "$DB_FILE" ]; then
    echo "✅ Database is writable"
else
    echo "❌ Database is still not writable"
    exit 1
fi

# Setup database
cd /opt/sales-app/backend
npx prisma migrate deploy
npx prisma generate

# Start backend
pm2 start sales-backend

echo "✅ Quick fix completed!"
echo "Database: $DB_FILE"
pm2 status 