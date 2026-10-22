import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { signToken } from '../utils/jwt';
import { dbGet, dbPut, dbUpdate, dbDelete, dbScan, TABLES } from './dynamodb';
import { Admin } from '../types';

const TABLE = TABLES.ADMINS;

function toAdmin(item: Record<string, any>): Omit<Admin, 'password'> & { password?: string } {
  return {
    id: item.id,
    username: item.username,
    name: item.name,
    password: item.password,
    role: item.role,
    isActive: item.isActive ?? true,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function loginAdmin(username: string, password: string) {
  const item = await dbGet(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' });

  if (!item) throw new Error('Username atau password salah');

  if (!item.isActive) throw new Error('Akun admin tidak aktif');

  const valid = await bcrypt.compare(password, item.password);
  if (!valid) throw new Error('Username atau password salah');

  const token = signToken({
    username: item.username,
    name: item.name,
    role: item.role,
    type: 'admin',
  });

  return {
    success: true,
    message: 'Login berhasil',
    data: { token, username: item.username, name: item.name, role: item.role },
  };
}

export async function getAdminByUsername(username: string) {
  const item = await dbGet(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' });
  if (!item) return null;
  const admin = toAdmin(item);
  const { password: _pw, ...safe } = admin;
  return safe;
}

export async function getAllAdmins() {
  const items = await dbScan(TABLE);
  return items
    .filter((i) => i.SK === 'PROFILE')
    .map((i) => {
      const { password: _pw, ...safe } = toAdmin(i);
      return safe;
    })
    .sort((a, b) => a.username.localeCompare(b.username));
}

export async function createAdmin(data: {
  username: string;
  name: string;
  password: string;
  role?: string;
}) {
  const existing = await dbGet(TABLE, { PK: `ADMIN#${data.username}`, SK: 'PROFILE' });
  if (existing) throw new Error(`Admin with username ${data.username} already exists`);

  const hashed = await bcrypt.hash(data.password, 10);
  const now = new Date().toISOString();

  const item = {
    PK: `ADMIN#${data.username}`,
    SK: 'PROFILE',
    id: uuid(),
    username: data.username,
    name: data.name,
    password: hashed,
    role: data.role || 'admin',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await dbPut(TABLE, item);
  const { password: _pw, ...safe } = toAdmin(item);
  return safe;
}

export async function updateAdmin(
  username: string,
  updates: { name?: string; role?: string; isActive?: boolean },
) {
  const existing = await dbGet(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' });
  if (!existing) throw new Error('Admin not found');

  const payload: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.role !== undefined) payload.role = updates.role;
  if (updates.isActive !== undefined) payload.isActive = updates.isActive;

  const updated = await dbUpdate(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' }, payload);
  if (!updated) throw new Error('Failed to update admin');

  const { password: _pw, ...safe } = toAdmin(updated as any);
  return safe;
}

export async function deleteAdmin(username: string) {
  const existing = await dbGet(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' });
  if (!existing) throw new Error('Admin not found');

  await dbDelete(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' });
  return { message: `Admin ${username} deleted successfully` };
}

export async function changePassword(
  username: string,
  oldPassword: string,
  newPassword: string,
) {
  const item = await dbGet(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' });
  if (!item) throw new Error('Admin not found');

  const valid = await bcrypt.compare(oldPassword, item.password);
  if (!valid) throw new Error('Password lama tidak sesuai');

  const hashed = await bcrypt.hash(newPassword, 10);
  await dbUpdate(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' }, {
    password: hashed,
    updatedAt: new Date().toISOString(),
  });

  return { success: true, message: 'Password berhasil diubah' };
}
