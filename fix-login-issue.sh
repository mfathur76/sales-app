#!/bin/bash

echo "🔧 Fixing Login Issues on DO Server..."

# 1. Check if we're on the server
if [ ! -f "/var/www/sales-app/backend/package.json" ]; then
    echo "❌ This script should be run on the DO server"
    exit 1
fi

cd /var/www/sales-app/backend

echo "📋 Step 1: Checking environment variables..."
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found, creating from example..."
    cp env.production.example .env
    echo "✅ .env file created"
else
    echo "✅ .env file exists"
fi

echo "📋 Step 2: Checking database..."
if [ ! -f "data/sales.db" ]; then
    echo "⚠️  Database not found, initializing..."
    mkdir -p data
    npx prisma migrate deploy
    npx prisma generate
    npx prisma db seed
    echo "✅ Database initialized"
else
    echo "✅ Database exists"
fi

echo "📋 Step 3: Checking outlet data..."
OUTLET_COUNT=$(npx prisma studio --port 5555 --browser none 2>/dev/null | grep -c "Outlet" || echo "0")
if [ "$OUTLET_COUNT" -eq "0" ]; then
    echo "⚠️  No outlets found, initializing..."
    node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();
    
    async function initOutlets() {
        const outlets = [
            { code: 'RM001', name: 'Risol Mejik Kelinci Raya', password: 'rm0012024' },
            { code: 'RM002', name: 'Risol Mejik Ketileng', password: 'rm0022024' },
            { code: 'RM003', name: 'Risol Mejik Tlogosari', password: 'rm0032024' },
            { code: 'RM004', name: 'Risol Mejik Karyadi', password: 'rm0042024' }
        ];
        
        for (const outlet of outlets) {
            const existing = await prisma.outlet.findUnique({ where: { code: outlet.code } });
            if (!existing) {
                const hashedPassword = await bcrypt.hash(outlet.password, 10);
                await prisma.outlet.create({
                    data: {
                        code: outlet.code,
                        name: outlet.name,
                        password: hashedPassword
                    }
                });
                console.log('Created outlet:', outlet.code);
            }
        }
        await prisma.\$disconnect();
    }
    
    initOutlets().catch(console.error);
    "
    echo "✅ Outlets initialized"
else
    echo "✅ Outlets exist ($OUTLET_COUNT found)"
fi

echo "📋 Step 4: Restarting services..."
pm2 restart sales-app
sudo systemctl restart nginx

echo "📋 Step 5: Testing API endpoints..."
sleep 3

echo "Testing health check..."
curl -s http://localhost:3001/api/health | jq . || echo "Health check failed"

echo "Testing outlets endpoint..."
curl -s http://localhost:3001/api/auth/outlets | jq . || echo "Outlets endpoint failed"

echo "Testing login endpoint..."
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"outlet":"RM001","password":"rm0012024"}' | jq . || echo "Login endpoint failed"

echo "🎉 Fix completed!"
echo ""
echo "📝 Next steps:"
echo "1. Test the login page in your browser"
echo "2. Check browser console for any errors"
echo "3. Use the test-login.html file to debug further"
echo ""
echo "🔑 Default passwords:"
echo "RM001: rm0012024"
echo "RM002: rm0022024"
echo "RM003: rm0032024"
echo "RM004: rm0042024" 