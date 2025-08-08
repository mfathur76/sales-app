#!/bin/bash

echo "🔧 Fixing Database Permission Issues..."

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
if [[ $EUID -eq 0 ]]; then
    print_status "Running as root - good for fixing database permissions"
else
    print_warning "Not running as root, some operations may fail"
fi

# Common database paths
DB_PATHS=(
    "/opt/sales-app/backend/prisma/data/sales.db"
    "/var/www/sales-app/backend/prisma/data/sales.db"
    "./backend/prisma/data/sales.db"
    "/opt/sales-app/backend/data/sales.db"
    "/var/www/sales-app/backend/data/sales.db"
    "./backend/data/sales.db"
)

# Function to fix database permissions
fix_database_permissions() {
    local db_path="$1"
    
    if [ -f "$db_path" ]; then
        print_status "Fixing permissions for database: $db_path"
        
        # Get the directory containing the database
        local db_dir=$(dirname "$db_path")
        
        # Fix directory permissions
        chmod 755 "$db_dir" 2>/dev/null || sudo chmod 755 "$db_dir"
        chown $USER:$USER "$db_dir" 2>/dev/null || sudo chown $USER:$USER "$db_dir"
        
        # Fix database file permissions
        chmod 644 "$db_path" 2>/dev/null || sudo chmod 644 "$db_path"
        chown $USER:$USER "$db_path" 2>/dev/null || sudo chown $USER:$USER "$db_path"
        
        # Make sure the file is writable
        chmod 666 "$db_path" 2>/dev/null || sudo chmod 666 "$db_path"
        
        print_status "Database permissions fixed: $db_path"
        
        # Test if database is writable
        if sqlite3 "$db_path" "SELECT 1;" >/dev/null 2>&1; then
            print_status "Database is accessible and writable"
        else
            print_warning "Database might still have issues"
        fi
    else
        print_warning "Database file not found: $db_path"
    fi
}

# Function to create database if it doesn't exist
create_database_if_missing() {
    local db_path="$1"
    local db_dir=$(dirname "$db_path")
    
    if [ ! -f "$db_path" ]; then
        print_status "Creating database directory: $db_dir"
        mkdir -p "$db_dir" 2>/dev/null || sudo mkdir -p "$db_dir"
        
        print_status "Creating database file: $db_path"
        touch "$db_path" 2>/dev/null || sudo touch "$db_path"
        
        # Set proper permissions for new database
        chmod 666 "$db_path" 2>/dev/null || sudo chmod 666 "$db_path"
        chown $USER:$USER "$db_path" 2>/dev/null || sudo chown $USER:$USER "$db_path"
        
        print_status "Database created: $db_path"
    fi
}

# Fix permissions for all possible database paths
print_status "Checking and fixing database permissions..."

for db_path in "${DB_PATHS[@]}"; do
    create_database_if_missing "$db_path"
    fix_database_permissions "$db_path"
done

# Fix prisma directory permissions
print_status "Fixing Prisma directory permissions..."

PRISMA_DIRS=(
    "/opt/sales-app/backend/prisma"
    "/var/www/sales-app/backend/prisma"
    "./backend/prisma"
)

for prisma_dir in "${PRISMA_DIRS[@]}"; do
    if [ -d "$prisma_dir" ]; then
        print_status "Fixing permissions for: $prisma_dir"
        chmod -R 755 "$prisma_dir" 2>/dev/null || sudo chmod -R 755 "$prisma_dir"
        chown -R $USER:$USER "$prisma_dir" 2>/dev/null || sudo chown -R $USER:$USER "$prisma_dir"
    fi
done

# Fix data directory permissions
print_status "Fixing data directory permissions..."

DATA_DIRS=(
    "/opt/sales-app/backend/data"
    "/var/www/sales-app/backend/data"
    "./backend/data"
)

for data_dir in "${DATA_DIRS[@]}"; do
    if [ -d "$data_dir" ]; then
        print_status "Fixing permissions for: $data_dir"
        chmod -R 755 "$data_dir" 2>/dev/null || sudo chmod -R 755 "$data_dir"
        chown -R $USER:$USER "$data_dir" 2>/dev/null || sudo chown -R $USER:$USER "$data_dir"
    fi
done

print_status "Database permission fixes completed!"
echo ""
echo "📋 Next steps:"
echo "1. Restart the backend: pm2 restart sales-backend"
echo "2. Check logs: pm2 logs sales-backend"
echo "3. Test database connection"
echo ""
echo "🔍 To verify database is working:"
echo "   cd /opt/sales-app/backend"
echo "   npx prisma db push"
echo "   npm run migrate" 