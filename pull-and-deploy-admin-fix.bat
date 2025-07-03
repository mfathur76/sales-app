@echo off
echo 🚀 Pulling and Deploying Admin Loading Fix from GitHub...

REM Set variables
set SERVER_IP=your-server-ip
set SSH_KEY=DOSSHKEY
set PROJECT_DIR=/var/www/sales-app

REM SSH into server and pull latest changes
echo 📥 Pulling latest changes from GitHub...
ssh -i %SSH_KEY% root@%SERVER_IP% "cd %PROJECT_DIR% && git pull origin main && cd frontend && npm install && npm run build && pm2 restart sales-frontend && pm2 restart sales-backend && pm2 status && echo ✅ Admin loading fix deployed successfully!"

if %ERRORLEVEL% EQU 0 (
    echo 🎉 Deployment completed successfully!
) else (
    echo ❌ Deployment failed
)

pause 