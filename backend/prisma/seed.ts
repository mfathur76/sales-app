import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {
      role: 'super_admin'
    },
    create: {
      username: 'admin',
      name: 'Administrator',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true
    }
  });

  console.log('✅ Admin user created:', admin.username);

  // Create sample outlets
  const outlets = [
    {
      code: 'OUTLET001',
      name: 'Outlet 1',
      password: await bcrypt.hash('outlet123', 10)
    },
    {
      code: 'OUTLET002',
      name: 'Outlet 2',
      password: await bcrypt.hash('outlet123', 10)
    }
  ];

  for (const outletData of outlets) {
    await prisma.outlet.upsert({
      where: { code: outletData.code },
      update: outletData,
      create: outletData
    });
  }

  console.log('✅ Sample outlets created');

  // Create expense categories
  const expenseCategories = [
    {
      name: 'Sayuran',
      description: 'Kategori untuk sayuran segar'
    },
    {
      name: 'Bumbu Dapur',
      description: 'Kategori untuk bumbu dapur'
    },
    {
      name: 'Buah',
      description: 'Kategori untuk buah-buahan'
    },
    {
      name: 'Operasional',
      description: 'Pengeluaran operasional outlet seperti listrik, air, gas'
    },
    {
      name: 'Transportasi',
      description: 'Pengeluaran transportasi dan pengiriman'
    },
    {
      name: 'Peralatan',
      description: 'Pengeluaran untuk peralatan dan perlengkapan'
    },
    {
      name: 'Gaji Karyawan',
      description: 'Pengeluaran untuk gaji dan upah karyawan'
    },
    {
      name: 'Lainnya',
      description: 'Pengeluaran lainnya yang tidak termasuk kategori di atas'
    }
  ];

  for (const categoryData of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name: categoryData.name },
      update: categoryData,
      create: categoryData
    });
  }

  console.log('✅ Expense categories created');

  // Create item masters
  const sayuranCategory = await prisma.expenseCategory.findUnique({
    where: { name: 'Sayuran' }
  });

  const bumbuCategory = await prisma.expenseCategory.findUnique({
    where: { name: 'Bumbu Dapur' }
  });

  const buahCategory = await prisma.expenseCategory.findUnique({
    where: { name: 'Buah' }
  });

  if (sayuranCategory && bumbuCategory && buahCategory) {
    const itemMasters = [
      {
        name: 'Wortel',
        categoryId: sayuranCategory.id,
        standardPrice: 4000,
        unit: 'kg'
      },
      {
        name: 'Kentang',
        categoryId: sayuranCategory.id,
        standardPrice: 14000,
        unit: 'kg'
      },
      {
        name: 'Jagung Manis',
        categoryId: sayuranCategory.id,
        standardPrice: 4375,
        unit: 'kg'
      },
      {
        name: 'Tomat',
        categoryId: sayuranCategory.id,
        standardPrice: 8000,
        unit: 'kg'
      },
      {
        name: 'Cabe Ceplus',
        categoryId: bumbuCategory.id,
        standardPrice: 27000,
        unit: 'kg'
      },
      {
        name: 'Bawang Merah',
        categoryId: bumbuCategory.id,
        standardPrice: 52000,
        unit: 'kg'
      },
      {
        name: 'Jeruk',
        categoryId: buahCategory.id,
        standardPrice: 15000,
        unit: 'kg'
      }
    ];

    for (const itemData of itemMasters) {
      await prisma.itemMaster.upsert({
        where: { name: itemData.name },
        update: itemData,
        create: itemData
      });
    }

    console.log('✅ Item masters created');
  }

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

  // Create sample expense data
  const wortelItem = await prisma.itemMaster.findUnique({
    where: { name: 'Wortel' }
  });

  const cabeItem = await prisma.itemMaster.findUnique({
    where: { name: 'Cabe Ceplus' }
  });

  const bawangItem = await prisma.itemMaster.findUnique({
    where: { name: 'Bawang Merah' }
  });

  const kentangItem = await prisma.itemMaster.findUnique({
    where: { name: 'Kentang' }
  });

  const jagungItem = await prisma.itemMaster.findUnique({
    where: { name: 'Jagung Manis' }
  });

  if (wortelItem && cabeItem && bawangItem && kentangItem && jagungItem) {
    const sampleExpenses = [
      {
        outlet: 'OUTLET001',
        itemId: wortelItem.id,
        date: new Date('2025-08-07'),
        quantity: 35,
        actualPrice: 4000,
        totalPrice: 140000,
        notes: 'Belanja pasar pagi',
        status: 'approved',
        createdBy: 'admin'
      },
      {
        outlet: 'OUTLET001',
        itemId: cabeItem.id,
        date: new Date('2025-08-07'),
        quantity: 6,
        actualPrice: 27000,
        totalPrice: 162000,
        notes: 'Belanja pasar pagi',
        status: 'approved',
        createdBy: 'admin'
      },
      {
        outlet: 'OUTLET001',
        itemId: bawangItem.id,
        date: new Date('2025-08-07'),
        quantity: 1,
        actualPrice: 52000,
        totalPrice: 52000,
        notes: 'Belanja pasar pagi',
        status: 'approved',
        createdBy: 'admin'
      },
      {
        outlet: 'OUTLET001',
        itemId: kentangItem.id,
        date: new Date('2025-08-07'),
        quantity: 35,
        actualPrice: 14000,
        totalPrice: 490000,
        notes: 'Belanja pasar pagi',
        status: 'approved',
        createdBy: 'admin'
      },
      {
        outlet: 'OUTLET001',
        itemId: jagungItem.id,
        date: new Date('2025-08-07'),
        quantity: 8,
        actualPrice: 4375,
        totalPrice: 35000,
        notes: 'Belanja pasar pagi',
        status: 'approved',
        createdBy: 'admin'
      }
    ];

    for (const expenseData of sampleExpenses) {
      await prisma.expense.create({
        data: expenseData
      });
    }

    console.log('✅ Sample expense data created');
  }

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