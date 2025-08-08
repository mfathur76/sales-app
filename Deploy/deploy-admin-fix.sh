#!/bin/bash

echo "🚀 Deploying Admin Loading Fix..."

# Set variables
SERVER_IP="your-server-ip"
SSH_KEY="DOSSHKEY"
FRONTEND_DIR="/var/www/sales-app/frontend"

# Upload the fixed App.js file
echo "📤 Uploading fixed App.js..."
scp -i $SSH_KEY frontend/src/App.js root@$SERVER_IP:$FRONTEND_DIR/src/App.js

if [ $? -eq 0 ]; then
    echo "✅ App.js uploaded successfully"
else
    echo "❌ Failed to upload App.js"
    exit 1
fi

# SSH into server and restart frontend
echo "🔧 Restarting frontend..."
ssh -i $SSH_KEY root@$SERVER_IP << 'EOF'
    cd /var/www/sales-app/frontend
    
    # Build the frontend
    echo "🔨 Building frontend..."
    npm run build
    
    # Restart PM2 process
    echo "🔄 Restarting PM2 frontend process..."
    pm2 restart sales-frontend
    
    # Check status
    echo "📊 PM2 Status:"
    pm2 status
    
    echo "✅ Admin loading fix deployed successfully!"
EOF

echo "🎉 Deployment completed!" 