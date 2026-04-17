#!/usr/bin/env ts-node
/**
 * Migration script: Export SQLite (Prisma) data → DynamoDB
 *
 * Run AFTER deploying the Lambda stack:
 *   npx ts-node lambda/scripts/migrate-to-dynamodb.ts
 *
 * Requires:
 *   - .env with DATABASE_URL (SQLite) and AWS credentials
 *   - DynamoDB tables already created via `serverless deploy`
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const dynamoRaw = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });
const dynamo = DynamoDBDocumentClient.from(dynamoRaw, {
  marshallOptions: { removeUndefinedValues: true },
});

const stage = process.env.STAGE || 'prod';
const SERVICE = 'sales-app-api';

const TABLES = {
  OUTLETS:   process.env.OUTLETS_TABLE || `${SERVICE}-outlets-${stage}`,
  ADMINS:    process.env.ADMINS_TABLE || `${SERVICE}-admins-${stage}`,
  SALES:     process.env.SALES_TABLE || `${SERVICE}-sales-${stage}`,
  EXPENSES:  process.env.EXPENSES_TABLE || `${SERVICE}-expenses-${stage}`,
  CATEGORIES: process.env.EXPENSE_CATEGORIES_TABLE || `${SERVICE}-expense-categories-${stage}`,
  ITEMS:     process.env.ITEM_MASTERS_TABLE || `${SERVICE}-item-masters-${stage}`,
};

async function putItem(table: string, item: Record<string, unknown>) {
  await dynamo.send(new PutCommand({ TableName: table, Item: item }));
}

async function migrateOutlets() {
  console.log('\n🏪 Migrating Outlets...');
  const outlets = await prisma.outlet.findMany();

  for (const o of outlets) {
    await putItem(TABLES.OUTLETS, {
      PK: `OUTLET#${o.code}`,
      SK: 'PROFILE',
      code: o.code,
      name: o.name,
      password: o.password,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    });
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${outlets.length} outlets migrated`);
}

async function migrateAdmins() {
  console.log('\n👤 Migrating Admins...');
  const admins = await prisma.admin.findMany();

  for (const a of admins) {
    await putItem(TABLES.ADMINS, {
      PK: `ADMIN#${a.username}`,
      SK: 'PROFILE',
      id: a.id,
      username: a.username,
      name: a.name,
      password: a.password,
      role: a.role,
      isActive: a.isActive,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    });
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${admins.length} admins migrated`);
}

async function migrateSales() {
  console.log('\n💰 Migrating Sales...');
  const sales = await prisma.outletSale.findMany();

  for (const s of sales) {
    const dateStr = s.date.toISOString().split('T')[0];
    await putItem(TABLES.SALES, {
      PK: `SALE#${s.outlet}`,
      SK: `DATE#${dateStr}`,
      GSI_PK: 'ALL_SALES',
      GSI_SK: `DATE#${dateStr}#OUTLET#${s.outlet}`,
      outlet: s.outlet,
      date: dateStr,
      cash: s.cash,
      qris: s.qris,
      gojek: s.gojek,
      shopee: s.shopee,
      grab: s.grab,
      totalSales: s.totalSales,
      qrisBank: s.qrisBank,
      gojekBank: s.gojekBank,
      shopeeBank: s.shopeeBank,
      grabBank: s.grabBank,
      bcaBank: s.bcaBank,
      mandiriBank: s.mandiriBank,
      totalBank: s.totalBank,
      qrisPercent: s.qrisPercent,
      gojekPercent: s.gojekPercent,
      shopeePercent: s.shopeePercent,
      grabPercent: s.grabPercent,
      bcaPercent: s.bcaPercent,
      mandiriPercent: s.mandiriPercent,
      overallPercent: s.overallPercent,
      status: s.status,
      verifiedBy: s.verifiedBy ?? undefined,
      verifiedAt: s.verifiedAt?.toISOString(),
      notes: s.notes ?? undefined,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    });
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${sales.length} sale records migrated`);
}

async function migrateExpenseCategories() {
  console.log('\n📂 Migrating Expense Categories...');
  const categories = await prisma.expenseCategory.findMany();

  for (const c of categories) {
    await putItem(TABLES.CATEGORIES, {
      PK: `CATEGORY#${c.id}`,
      SK: 'PROFILE',
      id: c.id,
      name: c.name,
      description: c.description ?? undefined,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    });
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${categories.length} categories migrated`);
}

async function migrateItemMasters() {
  console.log('\n📦 Migrating Item Masters...');
  const items = await prisma.itemMaster.findMany();

  for (const i of items) {
    await putItem(TABLES.ITEMS, {
      PK: `ITEM#${i.id}`,
      SK: 'PROFILE',
      id: i.id,
      name: i.name,
      categoryId: i.categoryId,
      standardPrice: i.standardPrice ?? undefined,
      unit: i.unit,
      isActive: i.isActive,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    });
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${items.length} items migrated`);
}

async function migrateExpenses() {
  console.log('\n💸 Migrating Expenses...');
  const expenses = await prisma.expense.findMany();

  for (const e of expenses) {
    const dateStr = e.date.toISOString().split('T')[0];
    await putItem(TABLES.EXPENSES, {
      PK: `EXPENSE#${e.outlet}`,
      SK: `DATE#${dateStr}#ID#${e.id}`,
      id: e.id,
      outlet: e.outlet,
      itemId: e.itemId,
      date: dateStr,
      quantity: e.quantity,
      actualPrice: e.actualPrice,
      totalPrice: e.totalPrice,
      notes: e.notes ?? undefined,
      isCash: e.isCash,
      status: e.status,
      approvedBy: e.approvedBy ?? undefined,
      approvedAt: e.approvedAt?.toISOString(),
      rejectionReason: e.rejectionReason ?? undefined,
      createdBy: e.createdBy ?? undefined,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    });
    process.stdout.write('.');
  }
  console.log(`\n  ✅ ${expenses.length} expenses migrated`);
}

async function main() {
  console.log('🚀 Starting SQLite → DynamoDB migration...');
  console.log(`   Stage   : ${stage}`);
  console.log(`   Region  : ${process.env.AWS_REGION || 'ap-southeast-1'}`);
  console.log('   Tables  :', TABLES);

  try {
    await migrateOutlets();
    await migrateAdmins();
    await migrateSales();
    await migrateExpenseCategories();
    await migrateItemMasters();
    await migrateExpenses();

    console.log('\n✅ Migration completed successfully!');
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
