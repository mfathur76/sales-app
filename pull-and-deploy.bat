@echo off
echo ========================================
echo    PULL FROM GITHUB AND DEPLOY
echo ========================================
echo.

echo Step 1: Pulling latest code from GitHub...
echo.

echo Pulling from GitHub...
git pull origin main

echo.
echo Step 2: Uploading to server...
echo.

echo Uploading backend...
scp -i DOSSHKEY -r backend/ root@152.42.232.39:/opt/sales-app/

echo Uploading frontend...
scp -i DOSSHKEY -r frontend/ root@152.42.232.39:/opt/sales-app/

echo Uploading fix scripts...
scp -i DOSSHKEY emergency-db-fix.sh root@152.42.232.39:/opt/sales-app/
scp -i DOSSHKEY quick-db-fix.sh root@152.42.232.39:/opt/sales-app/
scp -i DOSSHKEY force-fix-database.sh root@152.42.232.39:/opt/sales-app/
scp -i DOSSHKEY deploy-bca-mandiri-fix.sh root@152.42.232.39:/opt/sales-app/

echo.
echo ========================================
echo    PULL AND UPLOAD COMPLETED!
echo ========================================
echo.
echo Next steps:
echo 1. SSH to server: ssh -i DOSSHKEY root@152.42.232.39
echo 2. Go to app directory: cd /opt/sales-app
echo 3. Run emergency fix: chmod +x emergency-db-fix.sh && ./emergency-db-fix.sh
echo.
echo If still error, try: ./deploy-bca-mandiri-fix.sh
echo.
pause 