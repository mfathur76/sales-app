#!/bin/bash

echo "🔧 Force Fixing Database Readonly Error..."

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

# Stop backend first
print_status "Stopping backend..."
pm2 stop sales-backend

# Find and fix all database files
print_status "Finding all database files..."

# Find all .db files in the system
find /opt/sales-app -name "*.db" -type f 2>/dev/null | while read db_file; do
    print_status "Found database: $db_file"
    
    # Get directory
    db_dir=$(dirname "$db_file")
    
    # Fix directory permissions
    print_status "Fixing directory: $db_dir"
    chmod -R 755 "$db_dir" 2>/dev/null || sudo chmod -R 755 "$db_dir"
    chown -R $USER:$USER "$db_dir" 2>/dev/null || sudo chown -R $USER:$USER "$db_dir"
    
    # Fix database file permissions
    print_status "Fixing database file: $db_file"
    chmod 666 "$db_file" 2>/dev/null || sudo chmod 666 "$db_file"
    chown $USER:$USER "$db_file" 2>/dev/null || sudo chown $USER:$USER "$db_file"
    
    # Make sure it's writable
    ls -la "$db_file"
done

# Also check common locations
COMMON_DB_PATHS=(
    "/opt/sales-app/backend/prisma/data/sales.db"
    "/var/www/sales-app/backend/prisma/data/sales.db"
    "/opt/sales-app/backend/data/sales.db"
    "/var/www/sales-app/backend/data/sales.db"
    "/opt/sales-app/prisma/data/sales.db"
    "/var/www/sales-app/prisma/data/sales.db"
)

for db_path in "${COMMON_DB_PATHS[@]}"; do
    if [ -f "$db_path" ]; then
        print_status "Fixing common database: $db_path"
        db_dir=$(dirname "$db_path")
        
        # Fix directory
        chmod -R 755 "$db_dir" 2>/dev/null || sudo chmod -R 755 "$db_dir"
        chown -R $USER:$USER "$db_dir" 2>/dev/null || sudo chown -R $USER:$USER "$db_dir"
        
        # Fix file
        chmod 666 "$db_path" 2>/dev/null || sudo chmod 666 "$db_path"
        chown $USER:$USER "$db_path" 2>/dev/null || sudo chown $USER:$USER "$db_path"
        
        print_status "Permissions for $db_path:"
        ls -la "$db_path"
    else
        print_warning "Database not found: $db_path"
    fi
done

# Fix entire backend directory
print_status "Fixing entire backend directory permissions..."
cd /opt/sales-app/backend
chmod -R 755 . 2>/dev/null || sudo chmod -R 755 .
chown -R $USER:$USER . 2>/dev/null || sudo chown -R $USER:$USER .

# Fix prisma directory specifically
if [ -d "prisma" ]; then
    print_status "Fixing prisma directory..."
    chmod -R 755 prisma 2>/dev/null || sudo chmod -R 755 prisma
    chown -R $USER:$USER prisma 2>/dev/null || sudo chown -R $USER:$USER prisma
fi

# Create data directory if it doesn't exist
if [ ! -d "prisma/data" ]; then
    print_status "Creating prisma/data directory..."
    mkdir -p prisma/data 2>/dev/null || sudo mkdir -p prisma/data
    chmod 755 prisma/data 2>/dev/null || sudo chmod 755 prisma/data
    chown $USER:$USER prisma/data 2>/dev/null || sudo chown $USER:$USER prisma/data
fi

# Create database file if it doesn't exist
DB_FILE="prisma/data/sales.db"
if [ ! -f "$DB_FILE" ]; then
    print_status "Creating database file: $DB_FILE"
    touch "$DB_FILE" 2>/dev/null || sudo touch "$DB_FILE"
    chmod 666 "$DB_FILE" 2>/dev/null || sudo chmod 666 "$DB_FILE"
    chown $USER:$USER "$DB_FILE" 2>/dev/null || sudo chown $USER:$USER "$DB_FILE"
fi

# Test database write access
print_status "Testing database write access..."
if [ -w "$DB_FILE" ]; then
    print_status "✅ Database is writable"
else
    print_error "❌ Database is still not writable"
    print_status "Trying to force write access..."
    chmod 777 "$DB_FILE" 2>/dev/null || sudo chmod 777 "$DB_FILE"
fi

# Run database setup
print_status "Setting up database..."
npx prisma migrate deploy
npx prisma generate

# Test database connection
print_status "Testing database connection..."
npx prisma db pull

# Start backend
print_status "Starting backend..."
pm2 start sales-backend || pm2 restart sales-backend

print_status "Force database fix completed!"
echo ""
echo "📋 Final database status:"
echo "   - File: $DB_FILE"
echo "   - Permissions: $(ls -la "$DB_FILE" | awk '{print $1, $3, $4}')"
echo "   - Writable: $([ -w "$DB_FILE" ] && echo "Yes" || echo "No")"
echo ""
echo "📊 PM2 Status:"
pm2 status
echo ""
echo "📝 Check logs: pm2 logs sales-backend" 