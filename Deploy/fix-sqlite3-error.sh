#!/bin/bash

echo "🔧 Fixing sqlite3 Module Error..."

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

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Make sure you're in the backend directory"
    exit 1
fi

print_status "Installing sqlite3 package..."
npm install sqlite3

print_status "Installing @types/sqlite3 for TypeScript..."
npm install --save-dev @types/sqlite3

print_status "Cleaning node_modules and reinstalling..."
rm -rf node_modules package-lock.json
npm install

print_status "Generating Prisma client..."
npx prisma generate

print_status "Building backend..."
npm run build

if [ $? -eq 0 ]; then
    print_status "✅ Build successful!"
    print_status "Restarting backend..."
    pm2 restart sales-backend
    
    print_status "✅ Backend restarted successfully!"
    echo ""
    echo "📊 PM2 Status:"
    pm2 status
else
    print_error "❌ Build failed!"
    echo ""
    echo "🔍 Check the error messages above"
    exit 1
fi 