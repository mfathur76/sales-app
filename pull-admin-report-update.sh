#!/bin/bash

echo "🚀 Pulling and Deploying Admin Report Table Header Update from GitHub..."

# Set variables
SERVER_IP="your-server-ip"
SSH_KEY="DOSSHKEY"
PROJECT_DIR="/var/www/sales-app"

# SSH into server and pull latest changes
echo "📥 Pulling latest changes from GitHub..."
ssh -i $SSH_KEY root@$SERVER_IP << 'EOF'
    cd /var/www/sales-app
    
    # Pull latest changes
    echo "🔄 Pulling from GitHub..."
    git pull origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully pulled latest changes"
    else
        echo "❌ Failed to pull from GitHub"
        exit 1
    fi
    
    # Install frontend dependencies if needed
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    
    # Build frontend
    echo "🔨 Building frontend..."
    npm run build
    
    # Restart PM2 processes
    echo "🔄 Restarting PM2 processes..."
    pm2 restart sales-frontend
    pm2 restart sales-backend
    
    # Check status
    echo "📊 PM2 Status:"
    pm2 status
    
    echo "✅ Admin Report table header update deployed successfully!"
    echo "🌐 Test URL: http://$(curl -s ifconfig.me)"
EOF

if [ $? -eq 0 ]; then
    echo "🎉 Deployment completed successfully!"
else
    echo "❌ Deployment failed"
    exit 1
fi 