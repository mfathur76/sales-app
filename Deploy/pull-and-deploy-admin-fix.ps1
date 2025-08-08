Write-Host "🚀 Pulling and Deploying Admin Loading Fix from GitHub..." -ForegroundColor Green

# Set variables
$SERVER_IP = "your-server-ip"
$SSH_KEY = "DOSSHKEY"
$PROJECT_DIR = "/var/www/sales-app"

# SSH into server and pull latest changes
Write-Host "📥 Pulling latest changes from GitHub..." -ForegroundColor Yellow
$sshCommand = "cd $PROJECT_DIR && git pull origin main && cd frontend && npm install && npm run build && pm2 restart sales-frontend && pm2 restart sales-backend && pm2 status && echo '✅ Admin loading fix deployed successfully!'"
$deployResult = ssh -i $SSH_KEY "root@${SERVER_IP}" $sshCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
}

Read-Host "Press Enter to exit" 