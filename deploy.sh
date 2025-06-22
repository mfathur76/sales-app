#!/bin/bash

# Sales App Deployment Script for Alibaba Cloud
# Usage: ./deploy.sh

set -e

echo "🚀 Starting Sales App Deployment..."

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
print_status "Installing PM2..."
sudo npm install -g pm2

# Install Nginx
print_status "Installing Nginx..."
sudo apt install nginx -y

# Install Certbot for SSL
print_status "Installing Certbot..."
sudo apt install certbot python3-certbot-nginx -y

# Create application directory
print_status "Setting up application directory..."
sudo mkdir -p /var/www/sales-app
sudo chown $USER:$USER /var/www/sales-app

# Build backend
print_status "Building backend application..."
cd backend
npm install
npm run build

# Create logs directory
mkdir -p logs

# Setup environment
print_status "Setting up environment variables..."
if [ ! -f .env ]; then
    cp env.production.example .env
    print_warning "Please edit .env file with your production settings"
fi

# Run database migrations
print_status "Running database migrations..."
npm run migrate

# Start backend with PM2
print_status "Starting backend with PM2..."
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Build frontend
print_status "Building frontend application..."
cd ../frontend
npm install
npm run build

# Deploy frontend to Nginx
print_status "Deploying frontend to Nginx..."
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# Configure Nginx
print_status "Configuring Nginx..."
sudo cp ../backend/nginx.conf /etc/nginx/sites-available/sales-app
sudo ln -sf /etc/nginx/sites-available/sales-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# Restart Nginx
print_status "Restarting Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Setup firewall
print_status "Configuring firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw --force enable

print_status "Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit /var/www/sales-app/backend/.env with your production settings"
echo "2. Point your domain to this server's IP address"
echo "3. Run: sudo certbot --nginx -d yourdomain.com"
echo "4. Restart the application: pm2 restart sales-backend"
echo ""
echo "🌐 Your application should be accessible at:"
echo "   - Frontend: https://yourdomain.com"
echo "   - Backend API: https://yourdomain.com/api"
echo ""
echo "📊 PM2 Status: pm2 status"
echo "📝 PM2 Logs: pm2 logs sales-backend" 