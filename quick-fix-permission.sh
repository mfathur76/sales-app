#!/bin/bash

echo "🔧 Quick Fix for Permission Issue..."

# Fix ownership and permissions
echo "Fixing ownership..."
sudo chown -R $USER:$USER /opt/sales-app/frontend/

echo "Fixing permissions..."
sudo chmod -R 755 /opt/sales-app/frontend/

echo "Removing problematic build directory..."
sudo rm -rf /opt/sales-app/frontend/build

echo "✅ Permission issue fixed! You can now run npm run build" 