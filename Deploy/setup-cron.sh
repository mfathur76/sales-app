#!/bin/bash

# Setup Cron Jobs for Sales App
# Usage: ./setup-cron.sh

set -e

echo "🔧 Setting up automated cron jobs for Sales App..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create cron job entries
print_status "Creating cron job entries..."

# Daily backup at 2 AM
BACKUP_CRON="0 2 * * * cd $SCRIPT_DIR && ./maintenance.sh backup >> /var/log/sales-app-cron.log 2>&1"

# Weekly system update on Sunday at 3 AM
UPDATE_CRON="0 3 * * 0 cd $SCRIPT_DIR && ./maintenance.sh update >> /var/log/sales-app-cron.log 2>&1"

# Daily log cleanup at 4 AM
CLEAN_CRON="0 4 * * * cd $SCRIPT_DIR && ./maintenance.sh clean >> /var/log/sales-app-cron.log 2>&1"

# SSL certificate renewal check (Let's Encrypt auto-renews, but we can monitor)
SSL_CRON="0 5 * * * certbot renew --quiet --no-self-upgrade >> /var/log/sales-app-cron.log 2>&1"

# Add to current user's crontab
print_status "Adding cron jobs to current user's crontab..."

# Create temporary crontab file
TEMP_CRON=$(mktemp)

# Get existing crontab
crontab -l 2>/dev/null > $TEMP_CRON || true

# Add new cron jobs (avoid duplicates)
if ! grep -q "maintenance.sh backup" $TEMP_CRON; then
    echo "$BACKUP_CRON" >> $TEMP_CRON
    print_status "Added daily backup cron job"
fi

if ! grep -q "maintenance.sh update" $TEMP_CRON; then
    echo "$UPDATE_CRON" >> $TEMP_CRON
    print_status "Added weekly update cron job"
fi

if ! grep -q "maintenance.sh clean" $TEMP_CRON; then
    echo "$CLEAN_CRON" >> $TEMP_CRON
    print_status "Added daily log cleanup cron job"
fi

if ! grep -q "certbot renew" $TEMP_CRON; then
    echo "$SSL_CRON" >> $TEMP_CRON
    print_status "Added SSL renewal check cron job"
fi

# Install new crontab
crontab $TEMP_CRON

# Clean up
rm $TEMP_CRON

# Create log file
sudo touch /var/log/sales-app-cron.log
sudo chown $USER:$USER /var/log/sales-app-cron.log

print_status "Cron jobs setup completed!"
echo ""
echo "📋 Installed cron jobs:"
echo "  • Daily backup at 2:00 AM"
echo "  • Weekly system update at 3:00 AM (Sunday)"
echo "  • Daily log cleanup at 4:00 AM"
echo "  • SSL renewal check at 5:00 AM"
echo ""
echo "📝 Cron log file: /var/log/sales-app-cron.log"
echo ""
echo "🔍 To view cron jobs:"
echo "  crontab -l"
echo ""
echo "🔍 To view cron logs:"
echo "  tail -f /var/log/sales-app-cron.log"
echo ""
echo "❌ To remove cron jobs:"
echo "  crontab -r" 