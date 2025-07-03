@echo off
echo 🚀 Deploying Admin Loading Fix...

REM Set variables
set SERVER_IP=your-server-ip
set SSH_KEY=DOSSHKEY
set FRONTEND_DIR=/var/www/sales-app/frontend

REM Upload the fixed App.js file
echo 📤 Uploading fixed App.js...
scp -i %SSH_KEY% frontend\src\App.js root@%SERVER_IP%:%FRONTEND_DIR%/src/App.js

if %ERRORLEVEL% EQU 0 (
    echo ✅ App.js uploaded successfully
) else (
    echo ❌ Failed to upload App.js
    pause
    exit /b 1
)

REM SSH into server and restart frontend
echo 🔧 Restarting frontend...
ssh -i %SSH_KEY% root@%SERVER_IP% "cd %FRONTEND_DIR% && npm run build && pm2 restart sales-frontend && pm2 status && echo ✅ Admin loading fix deployed successfully!"

if %ERRORLEVEL% EQU 0 (
    echo 🎉 Deployment completed!
) else (
    echo ❌ Deployment failed
)

pause 