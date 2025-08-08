#!/bin/bash

echo "🚀 Pull from GitHub and Deploy on Server"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -d ".git" ]; then
    print_error "Not a git repository. Please run this from the sales-app directory"
    exit 1
fi

# Stop backend first
print_status "Stopping backend..."
pm2 stop sales-backend

# Pull latest changes
print_status "Pulling latest changes from GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    print_error "Failed to pull from GitHub"
    exit 1
fi

# Fix database permissions first
print_status "Fixing database permissions..."

# Find database file
DB_FILE=""
for path in \
    "/opt/sales-app/backend/prisma/data/sales.db" \
    "/var/www/sales-app/backend/prisma/data/sales.db" \
    "/opt/sales-app/backend/data/sales.db" \
    "/opt/sales-app/prisma/data/sales.db"; do
    
    if [ -f "$path" ]; then
        DB_FILE="$path"
        print_status "Found database at: $DB_FILE"
        break
    fi
done

if [ -z "$DB_FILE" ]; then
    print_status "Creating new database..."
    mkdir -p /opt/sales-app/backend/prisma/data
    DB_FILE="/opt/sales-app/backend/prisma/data/sales.db"
    touch "$DB_FILE"
fi

# Fix permissions aggressively
print_status "Fixing permissions..."
sudo chown -R $USER:$USER /opt/sales-app/backend/
sudo chmod -R 755 /opt/sales-app/backend/
sudo chmod 777 "$DB_FILE"

# Show current permissions
print_status "Current database permissions:"
ls -la "$DB_FILE"

# Test write access
if [ -w "$DB_FILE" ]; then
    print_status "✅ Database is writable"
else
    print_error "❌ Database is still not writable"
    exit 1
fi

# Update backend
print_status "Updating backend..."
cd /opt/sales-app/backend

# Install dependencies
print_status "Installing dependencies..."
npm install

# Setup database
print_status "Setting up database..."
npx prisma migrate deploy
npx prisma generate

# Build backend
print_status "Building backend..."
npm run build

# Update frontend
print_status "Updating frontend..."
cd /opt/sales-app/frontend

# Install dependencies
print_status "Installing frontend dependencies..."
npm install

# Build frontend
print_status "Building frontend..."
rm -rf build
npm run build

# Deploy to nginx
print_status "Deploying to nginx..."
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Start services
print_status "Starting services..."
cd /opt/sales-app/backend
pm2 start sales-backend
sudo systemctl restart nginx

# Wait a moment for services to start
sleep 3

# Check status
print_status "Checking service status..."
pm2 status

# Test database connection
print_status "Testing database connection..."
npx prisma db pull

print_status "✅ Pull and deploy completed!"
echo ""
echo "📋 Summary:"
echo "   - Database: $DB_FILE"
echo "   - Backend: PM2 status above"
echo "   - Frontend: Deployed to nginx"
echo ""
echo "🔍 Check logs:"
echo "   - Backend: pm2 logs sales-backend"
echo "   - Nginx: sudo systemctl status nginx"
echo ""
echo "🌐 Test URL: http://152.42.232.39" 