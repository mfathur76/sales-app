# Debug Server Issues

## 1. Check Server Status

```bash
# Check if Node.js process is running
pm2 status

# Check if nginx is running
sudo systemctl status nginx

# Check nginx logs
sudo tail -f /var/log/nginx/sales-app.error.log
sudo tail -f /var/log/nginx/sales-app.access.log

# Check application logs
pm2 logs sales-app
```

## 2. Check Database

```bash
# Check if database exists
ls -la /var/www/sales-app/backend/data/

# Check database content
cd /var/www/sales-app/backend
npx prisma studio
```

## 3. Test API Endpoints

```bash
# Test health check
curl http://localhost:3001/api/health

# Test get outlets
curl http://localhost:3001/api/auth/outlets

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"outlet":"RM001","password":"rm0012024"}'
```

## 4. Check Environment Variables

```bash
# Check if .env file exists
ls -la /var/www/sales-app/backend/.env

# Check environment variables
cd /var/www/sales-app/backend
cat .env
```

## 5. Restart Services

```bash
# Restart the application
pm2 restart sales-app

# Restart nginx
sudo systemctl restart nginx

# Check firewall
sudo ufw status
```

## 6. Common Issues

### Issue 1: CORS Error
- Check if CORS is properly configured in backend
- Check nginx CORS headers

### Issue 2: Database Connection
- Check if database file exists
- Check if Prisma migrations are applied
- Check database permissions

### Issue 3: JWT Secret
- Check if JWT_SECRET is set in .env
- Check if JWT token is being generated correctly

### Issue 4: Outlet Data
- Check if outlets are initialized
- Check if passwords are hashed correctly

## 7. Quick Fix Commands

```bash
# Reinitialize database
cd /var/www/sales-app/backend
npx prisma migrate reset --force
npx prisma generate
npx prisma db seed

# Restart everything
pm2 restart all
sudo systemctl restart nginx
``` 