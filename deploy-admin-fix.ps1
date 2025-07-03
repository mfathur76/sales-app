Write-Host "🚀 Deploying Admin Loading Fix..." -ForegroundColor Green

# Set variables
$SERVER_IP = "your-server-ip"
$SSH_KEY = "DOSSHKEY"
$FRONTEND_DIR = "/var/www/sales-app/frontend"

# Upload the fixed App.js file
Write-Host "📤 Uploading fixed App.js..." -ForegroundColor Yellow
$uploadResult = scp -i $SSH_KEY frontend/src/App.js "root@${SERVER_IP}:${FRONTEND_DIR}/src/App.js"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ App.js uploaded successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to upload App.js" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# SSH into server and restart frontend
Write-Host "🔧 Restarting frontend..." -ForegroundColor Yellow
$sshCommand = "cd $FRONTEND_DIR && npm run build && pm2 restart sales-frontend && pm2 status && echo '✅ Admin loading fix deployed successfully!'"
$deployResult = ssh -i $SSH_KEY "root@${SERVER_IP}" $sshCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 Deployment completed!" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
}

Read-Host "Press Enter to exit" 