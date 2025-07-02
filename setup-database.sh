#!/bin/bash

echo "🗄️ Setting up Database..."

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

# Find backend directory
BACKEND_DIR=""
for dir in \
    "/opt/sales-app/backend" \
    "/var/www/sales-app/backend" \
    "./backend"; do
    
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        BACKEND_DIR="$dir"
        print_status "Found backend at: $BACKEND_DIR"
        break
    fi
done

if [ -z "$BACKEND_DIR" ]; then
    print_error "Backend directory not found!"
    exit 1
fi

# Change to backend directory
cd "$BACKEND_DIR"

# Fix permissions first
print_status "Fixing permissions..."
sudo chown -R $USER:$USER .
sudo chmod -R 755 .

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

# Push database schema
print_status "Pushing database schema..."
npx prisma db push

# Run migrations
print_status "Running database migrations..."
npm run migrate

# Seed database if seed script exists
if [ -f "prisma/seed.ts" ]; then
    print_status "Seeding database..."
    npm run seed
fi

# Verify database connection
print_status "Verifying database connection..."
npx prisma db pull

print_status "Database setup completed!"
echo ""
echo "📋 Database status:"
echo "   - Schema: Pushed"
echo "   - Migrations: Applied"
echo "   - Connection: Verified"
echo ""
echo "🔄 Restarting backend..."
pm2 restart sales-backend

echo "✅ Database setup completed successfully!"
echo "📊 Check status: pm2 status"
echo "📝 Check logs: pm2 logs sales-backend" 