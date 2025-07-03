@echo off
echo 📤 Upload and Deploy with Database Fix

REM Server details
set SERVER=root@152.42.232.39
set SERVER_PATH=/opt/sales-app

echo Uploading files to server...

REM Upload backend
echo Uploading backend...
scp -r backend/ %SERVER%:%SERVER_PATH%/

REM Upload frontend
echo Uploading frontend...
scp -r frontend/ %SERVER%:%SERVER_PATH%/

REM Upload scripts
echo Uploading scripts...
scp emergency-db-fix.sh %SERVER%:%SERVER_PATH%/
scp quick-db-fix.sh %SERVER%:%SERVER_PATH%/
scp force-fix-database.sh %SERVER%:%SERVER_PATH%/
scp deploy-bca-mandiri-fix.sh %SERVER%:%SERVER_PATH%/

echo Files uploaded successfully!
echo.
echo 🔧 Now SSH to server and run:
echo    ssh %SERVER%
echo    cd %SERVER_PATH%
echo    chmod +x emergency-db-fix.sh
echo    ./emergency-db-fix.sh
echo.
echo Atau jika masih error:
echo    chmod +x deploy-bca-mandiri-fix.sh
echo    ./deploy-bca-mandiri-fix.sh
pause 