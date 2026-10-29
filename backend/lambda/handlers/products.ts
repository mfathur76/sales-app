import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  listProducts,
  createProduct,
  createProductsBatch,
  updateProduct,
  ProductInput,
} from '../services/productService';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import {
  ok, created, badRequest, unauthorized, forbidden, notFound, serverError, preflight,
} from '../utils/response';
import { JwtUser } from '../types';

const MAX_BATCH_ROWS = 100; // DynamoDB transaction limit

function getUser(event: APIGatewayProxyEvent): JwtUser | null {
  const token = extractBearerToken(event.headers['Authorization'] || event.headers['authorization']);
  return verifyToken(token);
}

function isAmount(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

/** Returns an error message, or null when the row is valid. */
function validate(p: any, partial: boolean): string | null {
  if ((!partial || p.name !== undefined) && (!p.name || !String(p.name).trim())) return 'Nama produk wajib diisi';
  if ((!partial || p.price !== undefined) && !isAmount(p.price)) return 'Harga jual tidak valid';
  if (p.cost !== undefined && p.cost !== null && !isAmount(p.cost)) return 'Harga modal tidak valid';
  if (p.resellerPrice !== undefined && p.resellerPrice !== null && !isAmount(p.resellerPrice)) return 'Harga reseller tidak valid';
  if (p.kind !== undefined && p.kind !== 'produksi' && p.kind !== 'beli_jadi') return 'Jenis produk tidak valid';
  if (p.category !== undefined && p.category !== null && typeof p.category !== 'string') return 'Kategori tidak valid';
  if (p.packOf !== undefined && p.packOf !== null && typeof p.packOf !== 'string') return 'Produk pcs untuk pack tidak valid';
  if (p.packOf && !(Number.isInteger(p.packSize) && p.packSize >= 2)) return 'Isi pack harus bilangan bulat 2 atau lebih';
  return null;
}

/** A pack is made of an existing piece product that is not itself a pack (and not the pack). */
async function isPieceProduct(pieceId: string, packId?: string): Promise<boolean> {
  const piece = (await listProducts(true)).find((p) => p.id === pieceId);
  return Boolean(piece && piece.id !== packId && !piece.packOf);
}

function pick(p: any): ProductInput {
  return {
    name: p.name,
    price: p.price,
    cost: p.cost ?? undefined,
    resellerPrice: p.resellerPrice ?? undefined,
    kind: p.kind,
    category: typeof p.category === 'string' ? p.category : undefined,
    packOf: p.packOf === null ? '' : typeof p.packOf === 'string' ? p.packOf : undefined,
    packSize: Number.isInteger(p.packSize) ? p.packSize : undefined,
    sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : undefined,
    isActive: typeof p.isActive === 'boolean' ? p.isActive : undefined,
  };
}

/** GET /api/products?all=1 — `all` (admin) includes inactive products */
export async function getProducts(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const all = event.queryStringParameters?.all === '1' && user.type === 'admin';
    return ok(await listProducts(all));
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/products — admin only */
export async function createProductHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Hanya admin yang boleh mengatur produk');

  try {
    const body = JSON.parse(event.body || '{}');
    const err = validate(body, false);
    if (err) return badRequest(err);
    if (body.packOf && !(await isPieceProduct(body.packOf))) return badRequest('Produk pcs untuk pack tidak valid');
    return created(await createProduct(pick(body)), 'Produk berhasil ditambahkan');
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/products/batch — admin only. Body: { products: [{ name, price, cost?, kind? }] } */
export async function createProductsBatchHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Hanya admin yang boleh mengatur produk');

  try {
    const { products } = JSON.parse(event.body || '{}');
    if (!Array.isArray(products) || products.length === 0) return badRequest('Daftar produk kosong');
    if (products.length > MAX_BATCH_ROWS) return badRequest(`Maksimal ${MAX_BATCH_ROWS} produk sekali import`);

    for (let i = 0; i < products.length; i++) {
      const err = validate(products[i], false);
      if (err) return badRequest(`Baris ${i + 1}: ${err}`);
    }
    return created(await createProductsBatch(products.map(pick)), `${products.length} produk berhasil diimport`);
  } catch (err) {
    return serverError(err);
  }
}

/** PUT /api/products/{id} — admin only. Deactivate with { isActive: false } instead of deleting. */
export async function updateProductHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Hanya admin yang boleh mengatur produk');

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Product id path parameter is required');

  try {
    const body = JSON.parse(event.body || '{}');
    const err = validate(body, true);
    if (err) return badRequest(err);
    if (body.packOf && !(await isPieceProduct(body.packOf, id))) return badRequest('Produk pcs untuk pack tidak valid');

    const product = await updateProduct(id, pick(body));
    if (!product) return notFound('Produk tidak ditemukan');
    return ok(product, 'Produk berhasil diperbarui');
  } catch (err) {
    return serverError(err);
  }
}
