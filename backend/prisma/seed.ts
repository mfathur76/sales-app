import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const password = 'admin123'; // Ganti setelah login pertama!
  const name = 'Administrator';

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Upsert admin user
  const admin = await prisma.admin.upsert({
    where: { username },
    update: {},
    create: {
      username,
      name,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    },
  });

  console.log('Admin user created:', admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 