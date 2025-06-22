#!/bin/bash

echo "🚀 Deploying Updates to DO Server..."

# Server details
SERVER_IP="152.42.232.39"
SERVER_USER="root"
REMOTE_PATH="/var/www/sales-app"

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

# Check if we're in the project directory
if [ ! -f "backend/package.json" ]; then
    print_error "Backend package.json not found. Make sure you're in the project root directory"
    exit 1
fi

print_status "Starting deployment to $SERVER_IP..."

# 1. Copy updated files to server
print_status "Copying updated files to server..."

# Copy backend
print_status "Copying backend..."
scp -r backend/ $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

# Copy frontend
print_status "Copying frontend..."
scp -r frontend/ $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

# Copy config files
print_status "Copying config files..."
scp deploy.sh $SERVER_USER@$SERVER_IP:$REMOTE_PATH/ 2>/dev/null || true
scp docker-compose.yml $SERVER_USER@$SERVER_IP:$REMOTE_PATH/ 2>/dev/null || true

# 2. Run update script on server
print_status "Running update script on server..."
ssh $SERVER_USER@$SERVER_IP "cd $REMOTE_PATH && chmod +x update-app.sh && ./update-app.sh"

print_status "Deployment completed!"
echo ""
echo "🌐 Your updated application is accessible at:"
echo "   Frontend: http://152.42.232.39"
echo "   API Health: http://152.42.232.39/api/health"
echo ""
echo "🧪 Test the updated application"
echo ""
echo "📝 Remember to clear browser cache if changes don't appear:"
echo "   - Press F12 in browser"
echo "   - Right-click refresh button"
echo "   - Select 'Empty Cache and Hard Reload'" 