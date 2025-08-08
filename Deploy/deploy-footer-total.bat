@echo off
echo 🚀 Deploying Footer Total to Admin Report...

REM Set variables
set SERVER_IP=your-server-ip
set SSH_KEY=DOSSHKEY
set FRONTEND_DIR=/var/www/sales-app/frontend

REM Upload the updated AdminReport files
echo 📤 Uploading updated AdminReport files...
scp -i %SSH_KEY% frontend\src\components\AdminReport.js root@%SERVER_IP%:%FRONTEND_DIR%/src/components/AdminReport.js
scp -i %SSH_KEY% frontend\src\components\AdminReport.css root@%SERVER_IP%:%FRONTEND_DIR%/src/components/AdminReport.css

if %ERRORLEVEL% EQU 0 (
    echo ✅ AdminReport files uploaded successfully
) else (
    echo ❌ Failed to upload AdminReport files
    pause
    exit /b 1
)

REM SSH into server and restart frontend
echo 🔧 Restarting frontend...
ssh -i %SSH_KEY% root@%SERVER_IP% "cd %FRONTEND_DIR% && npm run build && pm2 restart sales-frontend && pm2 status && echo ✅ Footer total added to Admin Report successfully!"

if %ERRORLEVEL% EQU 0 (
    echo 🎉 Deployment completed!
) else (
    echo ❌ Deployment failed
)

pause 