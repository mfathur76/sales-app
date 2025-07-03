#!/bin/bash

echo "🚀 Deploying Admin Report Feature..."

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
if [ ! -f "frontend/src/components/AdminReport.js" ]; then
    print_error "AdminReport.js not found. Make sure you're in the project root directory"
    exit 1
fi

# Stop backend first
print_status "Stopping backend..."
pm2 stop sales-backend

# Update frontend
print_status "Updating frontend..."
cd frontend

# Install dependencies if needed
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

# Start backend
print_status "Starting backend..."
cd ../backend
pm2 start sales-backend

# Wait a moment for services to start
sleep 3

# Check status
print_status "Checking service status..."
pm2 status

print_status "✅ Admin Report feature deployed!"
echo ""
echo "📋 New features added:"
echo "   - Admin Report page with table view"
echo "   - Filter by date range and outlet"
echo "   - Staff vs Admin input comparison"
echo "   - Difference calculation and status"
echo "   - Export to CSV functionality"
echo "   - New 'Laporan' button in navigation"
echo ""
echo "🌐 Test URL: http://152.42.232.39"
echo "📱 Login as admin and click 'Laporan' button"
echo "🔍 Check logs: pm2 logs sales-backend" 