#!/bin/bash

# Sales App Update Script for DigitalOcean
# Usage: ./update.sh

set -e

echo "🔄 Starting Sales App Update..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
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
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the sales-app root directory"
    exit 1
fi

# Backup database (optional)
print_status "Creating database backup..."
DB_FILE="backend/data/sales.db"
if [ -f "$DB_FILE" ]; then
    BACKUP_DIR="/var/backups/sales-app"
    sudo mkdir -p "$BACKUP_DIR"
    STAMP="$(date +%F_%H%M%S)"
    sqlite3 "$DB_FILE" ".backup '$BACKUP_DIR/sales-$STAMP.sqlite'"
    gzip -9 "$BACKUP_DIR/sales-$STAMP.sqlite"
    print_status "Database backed up to: $BACKUP_DIR/sales-$STAMP.sqlite.gz"
else
    print_warning "Database file not found, skipping backup"
fi

# Update backend
print_status "Updating backend..."
cd backend

# Install dependencies
print_status "Installing backend dependencies..."
npm ci --production

# Run database migrations
print_status "Running database migrations..."
npx prisma migrate deploy
npx prisma db seed

# Build backend
print_status "Building backend..."
npm run build

# Restart backend service
print_status "Restarting backend service..."
pm2 restart sales-backend

# Update frontend
print_status "Updating frontend..."
cd ../frontend

# Install dependencies
print_status "Installing frontend dependencies..."
npm ci --production

# Build frontend
print_status "Building frontend..."
npm run build

# Deploy frontend to Nginx
print_status "Deploying frontend to Nginx..."
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# Restart Nginx
print_status "Restarting Nginx..."
sudo systemctl restart nginx

# Check status
print_status "Checking application status..."
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager -l

echo ""
print_status "Update completed successfully!"
echo ""
echo "📋 Application URLs:"
echo "   - Frontend: https://yourdomain.com"
echo "   - Backend API: https://yourdomain.com/api"
echo ""
echo "📝 To check logs:"
echo "   - Backend logs: pm2 logs sales-backend"
echo "   - Nginx logs: sudo tail -f /var/log/nginx/access.log"
