#!/bin/bash

echo "🌐 Setting up Domain and SSL for Sales App..."

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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root"
    exit 1
fi

# Domain configuration
DOMAIN="sales.risolmejik.com"
MAIN_DOMAIN="risolmejik.com"

print_status "Setting up domain: $DOMAIN"

# 1. Update nginx configuration
print_status "Updating nginx configuration..."
cp backend/nginx.conf /etc/nginx/sites-available/sales-app
ln -sf /etc/nginx/sites-available/sales-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
print_status "Testing nginx configuration..."
nginx -t

if [ $? -ne 0 ]; then
    print_error "Nginx configuration test failed"
    exit 1
fi

# 2. Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    print_status "Installing certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
fi

# 3. Start nginx with HTTP only first
print_status "Starting nginx with HTTP only..."
systemctl restart nginx

# 4. Get SSL certificate
print_status "Getting SSL certificate for $DOMAIN..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@risolmejik.com

if [ $? -eq 0 ]; then
    print_status "SSL certificate obtained successfully!"
else
    print_warning "SSL certificate could not be obtained. Continuing with HTTP only."
fi

# 5. Update frontend with new domain
print_status "Updating frontend configuration..."
cd /opt/sales-app/frontend
npm run build
cp -r build/* /var/www/html/
chown -R www-data:www-data /var/www/html

# 6. Restart services
print_status "Restarting services..."
systemctl restart nginx
cd /opt/sales-app/backend
pm2 restart all

# 7. Setup SSL auto-renewal
print_status "Setting up SSL auto-renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

print_status "Domain setup completed!"
echo ""
echo "🌐 Your application is now accessible at:"
echo "   HTTP:  http://$DOMAIN"
echo "   HTTPS: https://$DOMAIN"
echo "   API:   https://$DOMAIN/api"
echo ""
echo "🧪 Test login with:"
echo "   Outlet: RM001"
echo "   Password: rm0012024"
echo ""
echo "📝 DNS Configuration Required:"
echo "   Add A record: $DOMAIN → 152.42.232.39"
echo "   Add A record: $MAIN_DOMAIN → 152.42.232.39"
echo ""
echo "🔧 Useful commands:"
echo "   Check SSL: certbot certificates"
echo "   Renew SSL: certbot renew"
echo "   Nginx status: systemctl status nginx"
echo "   PM2 status: pm2 status" 