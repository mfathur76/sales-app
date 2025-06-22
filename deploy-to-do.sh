#!/bin/bash

echo "🚀 Deploying Sales App to DO Server..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_status "Running as root - good for deployment"
else
    print_error "This script should be run as root for deployment"
    exit 1
fi

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18.x
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 globally
print_status "Installing PM2..."
npm install -g pm2

# Install Nginx
print_status "Installing Nginx..."
apt install nginx -y

# Create application directory
print_status "Setting up application directory..."
mkdir -p /var/www/sales-app
cd /var/www/sales-app

# Create backend structure
print_status "Creating backend structure..."
mkdir -p backend/src/{routes,services,middleware,types,database}
mkdir -p backend/prisma
mkdir -p backend/data

# Create frontend structure
print_status "Creating frontend structure..."
mkdir -p frontend/src/{components,api}
mkdir -p frontend/public

print_status "Deployment structure created!"
echo ""
echo "📋 Next steps:"
echo "1. Copy your application files to /var/www/sales-app/"
echo "2. Run: cd /var/www/sales-app/backend && npm install"
echo "3. Run: cd /var/www/sales-app/frontend && npm install"
echo "4. Run: cd /var/www/sales-app/backend && npm run build"
echo "5. Run: cd /var/www/sales-app/frontend && npm run build"
echo "6. Configure nginx and start services"
echo ""
echo "🌐 Server IP: 152.42.232.39" 