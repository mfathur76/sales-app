Write-Host "🚀 Deploying Footer Total to Admin Report..." -ForegroundColor Green

# Set variables
$SERVER_IP = "your-server-ip"
$SSH_KEY = "DOSSHKEY"
$FRONTEND_DIR = "/var/www/sales-app/frontend"

# Upload the updated AdminReport files
Write-Host "📤 Uploading updated AdminReport files..." -ForegroundColor Yellow
$uploadResult1 = scp -i $SSH_KEY frontend/src/components/AdminReport.js "root@${SERVER_IP}:${FRONTEND_DIR}/src/components/AdminReport.js"
$uploadResult2 = scp -i $SSH_KEY frontend/src/components/AdminReport.css "root@${SERVER_IP}:${FRONTEND_DIR}/src/components/AdminReport.css"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ AdminReport files uploaded successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to upload AdminReport files" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# SSH into server and restart frontend
Write-Host "🔧 Restarting frontend..." -ForegroundColor Yellow
$sshCommand = "cd $FRONTEND_DIR && npm run build && pm2 restart sales-frontend && pm2 status && echo '✅ Footer total added to Admin Report successfully!'"
$deployResult = ssh -i $SSH_KEY "root@${SERVER_IP}" $sshCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 Deployment completed!" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
}

Read-Host "Press Enter to exit" 