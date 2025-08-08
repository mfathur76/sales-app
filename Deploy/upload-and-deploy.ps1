Write-Host "📤 Upload and Deploy with Database Fix" -ForegroundColor Green

# Server details
$SERVER = "root@152.42.232.39"
$SERVER_PATH = "/opt/sales-app"

Write-Host "Uploading files to server..." -ForegroundColor Yellow

# Upload backend
Write-Host "Uploading backend..." -ForegroundColor Cyan
scp -r backend/ ${SERVER}:${SERVER_PATH}/

# Upload frontend
Write-Host "Uploading frontend..." -ForegroundColor Cyan
scp -r frontend/ ${SERVER}:${SERVER_PATH}/

# Upload scripts
Write-Host "Uploading scripts..." -ForegroundColor Cyan
scp emergency-db-fix.sh ${SERVER}:${SERVER_PATH}/
scp quick-db-fix.sh ${SERVER}:${SERVER_PATH}/
scp force-fix-database.sh ${SERVER}:${SERVER_PATH}/
scp deploy-bca-mandiri-fix.sh ${SERVER}:${SERVER_PATH}/

Write-Host "Files uploaded successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Now SSH to server and run:" -ForegroundColor Yellow
Write-Host "   ssh $SERVER" -ForegroundColor White
Write-Host "   cd $SERVER_PATH" -ForegroundColor White
Write-Host "   chmod +x emergency-db-fix.sh" -ForegroundColor White
Write-Host "   ./emergency-db-fix.sh" -ForegroundColor White
Write-Host ""
Write-Host "Atau jika masih error:" -ForegroundColor Yellow
Write-Host "   chmod +x deploy-bca-mandiri-fix.sh" -ForegroundColor White
Write-Host "   ./deploy-bca-mandiri-fix.sh" -ForegroundColor White

Read-Host "Press Enter to continue" 