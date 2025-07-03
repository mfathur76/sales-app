@echo off
echo ========================================
echo    SALES APP DEPLOYMENT - WINDOWS
echo ========================================
echo.

echo Step 1: Uploading files to server...
echo.

echo Uploading backend...
scp -r backend/ root@152.42.232.39:/opt/sales-app/

echo Uploading frontend...
scp -r frontend/ root@152.42.232.39:/opt/sales-app/

echo Uploading fix scripts...
scp emergency-db-fix.sh root@152.42.232.39:/opt/sales-app/
scp quick-db-fix.sh root@152.42.232.39:/opt/sales-app/
scp force-fix-database.sh root@152.42.232.39:/opt/sales-app/
scp deploy-bca-mandiri-fix.sh root@152.42.232.39:/opt/sales-app/

echo.
echo ========================================
echo    UPLOAD COMPLETED!
echo ========================================
echo.
echo Next steps:
echo 1. SSH to server: ssh root@152.42.232.39
echo 2. Go to app directory: cd /opt/sales-app
echo 3. Run emergency fix: chmod +x emergency-db-fix.sh && ./emergency-db-fix.sh
echo.
echo If still error, try: ./deploy-bca-mandiri-fix.sh
echo.
pause 