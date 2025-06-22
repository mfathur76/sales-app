#!/bin/bash

# Fix Prisma Installation Error
# Usage: ./fix-prisma.sh

set -e

echo "🔧 Fixing Prisma installation error..."

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

# Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check npm version
print_status "Checking npm version..."
NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# Clear npm cache
print_status "Clearing npm cache..."
npm cache clean --force

# Clear Prisma cache
print_status "Clearing Prisma cache..."
rm -rf ~/.cache/prisma
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma

# Remove node_modules and package-lock.json
print_status "Removing node_modules and package-lock.json..."
rm -rf node_modules
rm -f package-lock.json

# Install dependencies with verbose output
print_status "Installing dependencies..."
npm install --verbose

# If still fails, try with specific Prisma version
if [ $? -ne 0 ]; then
    print_warning "Standard install failed, trying with specific Prisma version..."
    
    # Install Prisma separately
    npm install prisma@6.10.1 --save-dev
    npm install @prisma/client@6.10.1
    
    # Generate Prisma client
    npx prisma generate
fi

# Test Prisma
print_status "Testing Prisma installation..."
if npx prisma --version; then
    print_status "✅ Prisma installed successfully!"
else
    print_error "❌ Prisma installation still failed"
    exit 1
fi

echo ""
print_status "Fix completed!"
echo ""
echo "📋 Next steps:"
echo "1. Run: npx prisma generate"
echo "2. Run: npx prisma migrate deploy"
echo "3. Test your application" 