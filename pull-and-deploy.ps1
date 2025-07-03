Write-Host "========================================" -ForegroundColor Green
Write-Host "    PULL FROM GITHUB AND DEPLOY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Step 1: Pulling latest code from GitHub..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Pulling from GitHub..." -ForegroundColor Cyan
git pull origin main

Write-Host ""
Write-Host "Step 2: Uploading to server..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Uploading backend..." -ForegroundColor Cyan
scp -i DOSSHKEY -r backend/ root@152.42.232.39:/opt/sales-app/

Write-Host "Uploading frontend..." -ForegroundColor Cyan
scp -i DOSSHKEY -r frontend/ root@152.42.232.39:/opt/sales-app/

Write-Host "Uploading fix scripts..." -ForegroundColor Cyan
scp -i DOSSHKEY emergency-db-fix.sh root@152.42.232.39:/opt/sales-app/
scp -i DOSSHKEY quick-db-fix.sh root@152.42.232.39:/opt/sales-app/
scp -i DOSSHKEY force-fix-database.sh root@152.42.232.39:/opt/sales-app/
scp -i DOSSHKEY deploy-bca-mandiri-fix.sh root@152.42.232.39:/opt/sales-app/

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "    PULL AND UPLOAD COMPLETED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. SSH to server: ssh -i DOSSHKEY root@152.42.232.39" -ForegroundColor White
Write-Host "2. Go to app directory: cd /opt/sales-app" -ForegroundColor White
Write-Host "3. Run emergency fix: chmod +x emergency-db-fix.sh && ./emergency-db-fix.sh" -ForegroundColor White
Write-Host ""
Write-Host "If still error, try: ./deploy-bca-mandiri-fix.sh" -ForegroundColor Yellow

Read-Host "Press Enter to continue" 