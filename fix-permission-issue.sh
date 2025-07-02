#!/bin/bash

echo "🔧 Fixing Permission Issues..."

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
    print_status "Running as root - good for fixing permissions"
else
    print_warning "Not running as root, some operations may fail"
fi

# Function to fix permissions for a directory
fix_permissions() {
    local dir_path="$1"
    if [ -d "$dir_path" ]; then
        print_status "Fixing permissions for: $dir_path"
        
        # Change ownership to current user
        chown -R $USER:$USER "$dir_path" 2>/dev/null || sudo chown -R $USER:$USER "$dir_path"
        
        # Set proper permissions
        chmod -R 755 "$dir_path" 2>/dev/null || sudo chmod -R 755 "$dir_path"
        
        # Make sure specific files are writable
        find "$dir_path" -type f -name "*.json" -exec chmod 644 {} \; 2>/dev/null || sudo find "$dir_path" -type f -name "*.json" -exec chmod 644 {} \;
        find "$dir_path" -type f -name "*.js" -exec chmod 644 {} \; 2>/dev/null || sudo find "$dir_path" -type f -name "*.js" -exec chmod 644 {} \;
        find "$dir_path" -type f -name "*.css" -exec chmod 644 {} \; 2>/dev/null || sudo find "$dir_path" -type f -name "*.css" -exec chmod 644 {} \;
        
        print_status "Permissions fixed for: $dir_path"
    else
        print_warning "Directory not found: $dir_path"
    fi
}

# Fix permissions for common paths
print_status "Fixing permissions for common directories..."

# Frontend build directory
fix_permissions "/var/www/sales-app/frontend/build"
fix_permissions "/opt/sales-app/frontend/build"
fix_permissions "./frontend/build"

# Nginx directories
fix_permissions "/var/www/html"
fix_permissions "/var/www/sales-app"

# Node modules (if they exist)
fix_permissions "/var/www/sales-app/frontend/node_modules"
fix_permissions "/opt/sales-app/frontend/node_modules"
fix_permissions "./frontend/node_modules"

# Specific file fixes
print_status "Fixing specific problematic files..."

# Remove problematic asset-manifest.json files
for manifest_path in \
    "/var/www/sales-app/frontend/build/asset-manifest.json" \
    "/opt/sales-app/frontend/build/asset-manifest.json" \
    "./frontend/build/asset-manifest.json"; do
    
    if [ -f "$manifest_path" ]; then
        print_status "Removing problematic file: $manifest_path"
        rm -f "$manifest_path" 2>/dev/null || sudo rm -f "$manifest_path"
    fi
done

# Clear npm cache
print_status "Clearing npm cache..."
npm cache clean --force 2>/dev/null || sudo npm cache clean --force

print_status "Permission fixes completed!"
echo ""
echo "📋 Next steps:"
echo "1. Try running your build command again"
echo "2. If still having issues, run: sudo chown -R \$USER:\$USER ."
echo "3. Then run: npm run build"
echo ""
echo "🔍 To check current permissions:"
echo "   ls -la frontend/build/" 