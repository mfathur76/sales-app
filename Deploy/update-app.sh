#!/bin/bash

echo "🔄 Updating Sales App..."

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

# Function to safely remove build directory
safe_remove_build() {
    local build_path="$1"
    if [ -d "$build_path" ]; then
        print_status "Removing old build directory: $build_path"
        
        # Try to remove with sudo first
        if sudo rm -rf "$build_path" 2>/dev/null; then
            print_status "Successfully removed build directory"
        else
            # If sudo fails, try to change permissions first
            print_warning "Permission denied, trying to fix permissions..."
            sudo chown -R $USER:$USER "$build_path" 2>/dev/null
            sudo chmod -R 755 "$build_path" 2>/dev/null
            rm -rf "$build_path"
            print_status "Build directory removed after fixing permissions"
        fi
    fi
}

# Update backend
print_status "Updating backend..."
cd backend

# Install dependencies
print_status "Installing backend dependencies..."
npm install

# Run database migrations
print_status "Running database migrations..."
npm run migrate

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

# Safely remove old build directory
safe_remove_build "build"

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

print_status "Update completed successfully!"
echo ""
echo "🌐 Your updated application is accessible at:"
echo "   Frontend: http://152.42.232.39"
echo "   API Health: http://152.42.232.39/api/health"
echo ""
echo "📊 PM2 Status:"
pm2 status 