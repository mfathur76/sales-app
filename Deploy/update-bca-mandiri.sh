#!/bin/bash

echo "🔄 Updating BCA & Mandiri Bank Transfer Feature..."

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

# Update backend
print_status "Updating backend..."
cd backend

# Install dependencies
print_status "Installing backend dependencies..."
npm install

# Run database migration
print_status "Running database migration for BCA & Mandiri fields..."
npx prisma migrate deploy

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

# Restart backend with PM2
print_status "Restarting backend..."
pm2 restart sales-backend || pm2 start ecosystem.config.js --env production
pm2 save

# Update frontend
print_status "Updating frontend..."
cd ../frontend

# Install dependencies
print_status "Installing frontend dependencies..."
npm install

# Remove old build directory
print_status "Removing old build directory..."
rm -rf build

# Build frontend
print_status "Building frontend..."
npm run build

# Deploy to nginx
print_status "Deploying to nginx..."
if [ -d "build" ]; then
    # Remove old files from nginx directory
    sudo rm -rf /var/www/html/*
    
    # Copy new build files
    sudo cp -r build/* /var/www/html/
    
    # Set proper permissions
    sudo chown -R www-data:www-data /var/www/html
    sudo chmod -R 755 /var/www/html
    
    print_status "Frontend deployed successfully"
else
    print_error "Build directory not found!"
    exit 1
fi

# Restart nginx
print_status "Restarting nginx..."
sudo systemctl restart nginx

print_status "BCA & Mandiri update completed successfully!"
echo ""
echo "🌐 Your updated application is accessible at:"
echo "   Frontend: http://152.42.232.39"
echo "   API Health: http://152.42.232.39/api/health"
echo ""
echo "✅ New features added:"
echo "   - BCA Bank Transfer input field"
echo "   - Mandiri Bank Transfer input field"
echo "   - Percentage calculations for both banks"
echo "   - Display in sales records"
echo ""
echo "📊 PM2 Status:"
pm2 status 