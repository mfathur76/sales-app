#!/bin/bash

# Sales App Maintenance Script
# Usage: ./maintenance.sh [backup|update|logs|status]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}[HEADER]${NC} $1"
}

# Function to create backup
backup() {
    print_header "Creating Database Backup"
    
    # Create backup directory
    BACKUP_DIR="/var/backups/sales-app"
    sudo mkdir -p $BACKUP_DIR
    
    # Create timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="sales_backup_$TIMESTAMP.db"
    
    # Copy database
    if [ -f "backend/data/sales.db" ]; then
        sudo cp backend/data/sales.db "$BACKUP_DIR/$BACKUP_FILE"
        sudo chown $USER:$USER "$BACKUP_DIR/$BACKUP_FILE"
        
        print_status "Backup created: $BACKUP_FILE"
        
        # Keep only last 10 backups
        cd $BACKUP_DIR
        ls -t *.db | tail -n +11 | xargs -r rm
        print_status "Kept last 10 backups"
    else
        print_error "Database file not found"
        exit 1
    fi
}

# Function to update system
update() {
    print_header "Updating System"
    
    # Update system packages
    print_status "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    
    # Update Node.js if needed
    print_status "Checking Node.js version..."
    NODE_VERSION=$(node --version)
    print_status "Current Node.js version: $NODE_VERSION"
    
    # Update npm packages
    print_status "Updating npm packages..."
    cd backend
    npm update
    cd ../frontend
    npm update
    
    # Restart services
    print_status "Restarting services..."
    pm2 restart sales-backend
    sudo systemctl reload nginx
    
    print_status "System update completed"
}

# Function to show logs
logs() {
    print_header "Application Logs"
    
    echo ""
    print_status "PM2 Logs (last 50 lines):"
    pm2 logs sales-backend --lines 50
    
    echo ""
    print_status "Nginx Access Logs (last 20 lines):"
    sudo tail -n 20 /var/log/nginx/sales-app.access.log
    
    echo ""
    print_status "Nginx Error Logs (last 20 lines):"
    sudo tail -n 20 /var/log/nginx/sales-app.error.log
}

# Function to show status
status() {
    print_header "System Status"
    
    echo ""
    print_status "PM2 Status:"
    pm2 status
    
    echo ""
    print_status "Nginx Status:"
    sudo systemctl status nginx --no-pager -l
    
    echo ""
    print_status "Disk Usage:"
    df -h
    
    echo ""
    print_status "Memory Usage:"
    free -h
    
    echo ""
    print_status "CPU Usage:"
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print "CPU Usage: " $1 "%"}'
    
    echo ""
    print_status "Network Connections:"
    sudo netstat -tlnp | grep -E ':(80|443|3001)'
}

# Function to clean logs
clean_logs() {
    print_header "Cleaning Logs"
    
    # Clean PM2 logs
    pm2 flush
    
    # Clean nginx logs (keep last 1000 lines)
    sudo tail -n 1000 /var/log/nginx/sales-app.access.log > /tmp/access.log
    sudo mv /tmp/access.log /var/log/nginx/sales-app.access.log
    
    sudo tail -n 1000 /var/log/nginx/sales-app.error.log > /tmp/error.log
    sudo mv /tmp/error.log /var/log/nginx/sales-app.error.log
    
    print_status "Logs cleaned"
}

# Function to restart services
restart() {
    print_header "Restarting Services"
    
    print_status "Restarting backend..."
    pm2 restart sales-backend
    
    print_status "Reloading nginx..."
    sudo systemctl reload nginx
    
    print_status "Services restarted"
}

# Function to show help
show_help() {
    echo "Sales App Maintenance Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  backup    - Create database backup"
    echo "  update    - Update system and packages"
    echo "  logs      - Show application logs"
    echo "  status    - Show system status"
    echo "  clean     - Clean old logs"
    echo "  restart   - Restart all services"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 backup"
    echo "  $0 status"
    echo "  $0 logs"
}

# Main script logic
case "${1:-help}" in
    backup)
        backup
        ;;
    update)
        update
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    clean)
        clean_logs
        ;;
    restart)
        restart
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac 