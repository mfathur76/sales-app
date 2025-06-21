import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'Administrator',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    }
  });

  console.log('✅ Admin user created:', admin.username);

  // Create sample sales data
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const sampleSales = [
    {
      outlet: 'OUTLET001',
      date: today,
      cash: 500000,
      qris: 300000,
      gojek: 200000,
      shopee: 150000,
      grab: 100000,
      totalSales: 1250000,
      status: 'pending'
    },
    {
      outlet: 'OUTLET002',
      date: today,
      cash: 400000,
      qris: 250000,
      gojek: 180000,
      shopee: 120000,
      grab: 80000,
      totalSales: 1030000,
      status: 'pending'
    },
    {
      outlet: 'OUTLET001',
      date: yesterday,
      cash: 450000,
      qris: 280000,
      gojek: 190000,
      shopee: 140000,
      grab: 90000,
      totalSales: 1150000,
      status: 'pending'
    },
    {
      outlet: 'OUTLET002',
      date: twoDaysAgo,
      cash: 600000,
      qris: 350000,
      gojek: 220000,
      shopee: 180000,
      grab: 120000,
      totalSales: 1470000,
      status: 'pending'
    }
  ];

  for (const saleData of sampleSales) {
    await prisma.outletSale.upsert({
      where: {
        outlet_date: {
          outlet: saleData.outlet,
          date: saleData.date
        }
      },
      update: saleData,
      create: saleData
    });
  }

  console.log('✅ Sample sales data created');

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 