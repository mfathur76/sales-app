// This file is deprecated - using Prisma instead
// import sqlite3 from 'sqlite3';
// import path from 'path';

// const dbPath = path.join(__dirname, '../../data/sales.db');

// // Ensure database directory exists
// import fs from 'fs';
// const dbDir = path.dirname(dbPath);
// if (!fs.existsSync(dbDir)) {
//   fs.mkdirSync(dbDir, { recursive: true });
// }

// export const db = new sqlite3.Database(dbPath);

export function initializeDatabase(): void {
  // This function is deprecated - using Prisma migrations instead
  console.log('Database initialization is handled by Prisma migrations');
} 