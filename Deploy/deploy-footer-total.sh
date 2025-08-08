#!/bin/bash

echo "🚀 Deploying Footer Total to Admin Report..."

# Set variables
SERVER_IP="your-server-ip"
SSH_KEY="DOSSHKEY"
FRONTEND_DIR="/var/www/sales-app/frontend"

# Upload the updated AdminReport files
echo "📤 Uploading updated AdminReport files..."
scp -i $SSH_KEY frontend/src/components/AdminReport.js root@$SERVER_IP:$FRONTEND_DIR/src/components/AdminReport.js
scp -i $SSH_KEY frontend/src/components/AdminReport.css root@$SERVER_IP:$FRONTEND_DIR/src/components/AdminReport.css

if [ $? -eq 0 ]; then
    echo "✅ AdminReport files uploaded successfully"
else
    echo "❌ Failed to upload AdminReport files"
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
    
    echo "✅ Footer total added to Admin Report successfully!"
    echo "🔧 Changes made:"
    echo "   - Added table footer with totals for all columns"
    echo "   - Staff and Admin totals for each payment method"
    echo "   - Grand totals for Staff and Admin"
    echo "   - Total difference calculation"
    echo "   - Styled footer with distinct colors"
EOF

echo "🎉 Deployment completed!" 