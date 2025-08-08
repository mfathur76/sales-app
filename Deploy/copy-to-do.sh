#!/bin/bash

echo "📁 Copying Sales App to DO Server..."

# Server details
SERVER_IP="152.42.232.39"
SERVER_USER="root"
LOCAL_PATH="."
REMOTE_PATH="/var/www/sales-app"

echo "🚀 Copying files to $SERVER_USER@$SERVER_IP:$REMOTE_PATH"

# Create remote directory
ssh $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_PATH"

# Copy backend files
echo "📦 Copying backend..."
scp -r backend/ $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

# Copy frontend files
echo "🎨 Copying frontend..."
scp -r frontend/ $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

# Copy configuration files
echo "⚙️  Copying config files..."
scp deploy.sh $SERVER_USER@$SERVER_IP:$REMOTE_PATH/
scp docker-compose.yml $SERVER_USER@$SERVER_IP:$REMOTE_PATH/ 2>/dev/null || true
scp README.md $SERVER_USER@$SERVER_IP:$REMOTE_PATH/ 2>/dev/null || true

echo "✅ Files copied successfully!"
echo ""
echo "📋 Next steps on DO server:"
echo "1. SSH to server: ssh root@152.42.232.39"
echo "2. Navigate: cd /var/www/sales-app"
echo "3. Install backend: cd backend && npm install"
echo "4. Install frontend: cd frontend && npm install"
echo "5. Build backend: cd backend && npm run build"
echo "6. Build frontend: cd frontend && npm run build"
echo "7. Start services: pm2 start backend/ecosystem.config.js"
echo "8. Configure nginx and restart" 