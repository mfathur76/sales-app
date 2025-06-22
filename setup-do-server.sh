#!/bin/bash

echo "🚀 Complete Setup for DO Server..."

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
if [ ! -f "backend/package.json" ]; then
    print_error "Backend package.json not found. Make sure you're in /var/www/sales-app"
    exit 1
fi

# 1. Setup Backend
print_status "Setting up backend..."
cd backend

# Install dependencies
print_status "Installing backend dependencies..."
npm install

# Create .env file
if [ ! -f ".env" ]; then
    print_status "Creating .env file..."
    cp env.production.example .env
fi

# Initialize database
print_status "Initializing database..."
npx prisma migrate deploy
npx prisma generate
npx prisma db seed

# Build backend
print_status "Building backend..."
npm run build

# 2. Setup Frontend
print_status "Setting up frontend..."
cd ../frontend

# Install dependencies
print_status "Installing frontend dependencies..."
npm install

# Build frontend
print_status "Building frontend..."
npm run build

# 3. Deploy to Nginx
print_status "Deploying to Nginx..."
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# 4. Configure Nginx
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

# 5. Start Backend with PM2
print_status "Starting backend with PM2..."
cd ../backend
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 6. Setup Firewall
print_status "Setting up firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw --force enable

# 7. Check Status
print_status "Checking status..."
echo ""
echo "PM2 Status:"
pm2 status
echo ""
echo "Nginx Status:"
sudo systemctl status nginx --no-pager

print_status "Setup completed successfully!"
echo ""
echo "🌐 Your application is now accessible at:"
echo "   Frontend: http://152.42.232.39"
echo "   API Health: http://152.42.232.39/api/health"
echo ""
echo "🧪 Test Login:"
echo "   Outlet: RM001"
echo "   Password: rm0012024"
echo ""
echo "📝 Useful commands:"
echo "   PM2 Logs: pm2 logs"
echo "   Nginx Logs: sudo tail -f /var/log/nginx/sales-app.error.log"
echo "   Restart Backend: pm2 restart all"
echo "   Restart Nginx: sudo systemctl restart nginx" 