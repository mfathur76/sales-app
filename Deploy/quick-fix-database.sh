#!/bin/bash

echo "🔧 Quick Fix for Database Permission Issue..."

# Find and fix database file
echo "Finding database file..."
DB_PATH=""

# Check common locations
for path in \
    "/opt/sales-app/backend/prisma/data/sales.db" \
    "/var/www/sales-app/backend/prisma/data/sales.db" \
    "/opt/sales-app/backend/data/sales.db" \
    "/var/www/sales-app/backend/data/sales.db"; do
    
    if [ -f "$path" ]; then
        DB_PATH="$path"
        echo "Found database at: $DB_PATH"
        break
    fi
done

if [ -z "$DB_PATH" ]; then
    echo "❌ Database file not found in common locations"
    echo "Creating new database..."
    mkdir -p /opt/sales-app/backend/prisma/data
    DB_PATH="/opt/sales-app/backend/prisma/data/sales.db"
    touch "$DB_PATH"
fi

# Fix permissions
echo "Fixing database permissions..."
sudo chown $USER:$USER "$DB_PATH"
sudo chmod 666 "$DB_PATH"

# Fix directory permissions
DB_DIR=$(dirname "$DB_PATH")
sudo chown -R $USER:$USER "$DB_DIR"
sudo chmod -R 755 "$DB_DIR"

echo "✅ Database permission fixed!"
echo "Database path: $DB_PATH"

# Restart backend
echo "Restarting backend..."
pm2 restart sales-backend

echo "✅ Done! Check logs with: pm2 logs sales-backend" 