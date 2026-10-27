import { v4 as uuid } from 'uuid';
import { dbGet, dbPut, dbScan, dbTransactPut, TABLES } from './dynamodb';
import { Product, ProductKind } from '../types';

const TABLE = TABLES.PRODUCTS;

export interface ProductInput {
  name: string;
  price: number;
  cost?: number;
  kind?: ProductKind;
  category?: string;
  sortOrder?: number;
  isActive?: boolean;
}

function toProduct(item: Record<string, any>): Product {
  return {
    id: item.id,
    name: item.name,
    price: item.price ?? 0,
    cost: item.cost,
    kind: item.kind === 'beli_jadi' ? 'beli_jadi' : 'produksi',
    category: item.category,
    sortOrder: item.sortOrder ?? 0,
    isActive: item.isActive !== false,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function buildItem(p: Product) {
  return { PK: `PRODUCT#${p.id}`, SK: 'PROFILE', ...p };
}

/** Sorted by sortOrder, then name. Inactive products are kept so old counts still resolve. */
export async function listProducts(includeInactive = false): Promise<Product[]> {
  const items = await dbScan(TABLE);
  return items
    .filter((i) => i.SK === 'PROFILE')
    .map(toProduct)
    .filter((p) => includeInactive || p.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function getProductById(id: string): Promise<Product | null> {
  const item = await dbGet(TABLE, { PK: `PRODUCT#${id}`, SK: 'PROFILE' });
  return item ? toProduct(item) : null;
}

function newProduct(data: ProductInput, sortOrder: number): Product {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    name: data.name.trim(),
    price: data.price,
    cost: data.cost,
    kind: data.kind === 'beli_jadi' ? 'beli_jadi' : 'produksi',
    category: data.category?.trim() || undefined,
    sortOrder: data.sortOrder ?? sortOrder,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function nextSortOrder(): Promise<number> {
  const all = await listProducts(true);
  return all.reduce((max, p) => Math.max(max, p.sortOrder), 0) + 1;
}

export async function createProduct(data: ProductInput): Promise<Product> {
  const product = newProduct(data, await nextSortOrder());
  await dbPut(TABLE, buildItem(product));
  return product;
}

/** All-or-nothing import, e.g. pasting the whole product list at once. */
export async function createProductsBatch(rows: ProductInput[]): Promise<Product[]> {
  const start = await nextSortOrder();
  const products = rows.map((r, i) => newProduct(r, start + i));
  await dbTransactPut(TABLE, products.map(buildItem));
  return products;
}

export async function updateProduct(id: string, updates: Partial<ProductInput>): Promise<Product | null> {
  const existing = await getProductById(id);
  if (!existing) return null;

  const next: Product = { ...existing, updatedAt: new Date().toISOString() };
  if (updates.name !== undefined) next.name = updates.name.trim();
  if (updates.price !== undefined) next.price = updates.price;
  if (updates.cost !== undefined) next.cost = updates.cost;
  if (updates.kind !== undefined) next.kind = updates.kind === 'beli_jadi' ? 'beli_jadi' : 'produksi';
  if (updates.category !== undefined) next.category = updates.category.trim() || undefined;
  if (updates.sortOrder !== undefined) next.sortOrder = updates.sortOrder;
  if (updates.isActive !== undefined) next.isActive = updates.isActive;

  await dbPut(TABLE, buildItem(next));
  return next;
}
