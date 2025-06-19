import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../data/sales.db');

// Ensure database directory exists
import fs from 'fs';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath);

export function initializeDatabase(): void {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS outlet_sales (
      outlet TEXT NOT NULL,
      date DATE NOT NULL,
      cash REAL NOT NULL DEFAULT 0,
      qris REAL NOT NULL DEFAULT 0,
      gojek REAL NOT NULL DEFAULT 0,
      shopee REAL NOT NULL DEFAULT 0,
      grab REAL NOT NULL DEFAULT 0,
      total_sales REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (outlet, date)
    )
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Outlet sales table created or already exists');
    }
  });

  // Create trigger to update updated_at timestamp
  const createTriggerSQL = `
    CREATE TRIGGER IF NOT EXISTS update_outlet_sales_updated_at 
    AFTER UPDATE ON outlet_sales
    BEGIN
      UPDATE outlet_sales SET updated_at = CURRENT_TIMESTAMP WHERE outlet = NEW.outlet AND date = NEW.date;
    END
  `;

  db.run(createTriggerSQL, (err) => {
    if (err) {
      console.error('Error creating trigger:', err);
    } else {
      console.log('Update trigger created or already exists');
    }
  });

  // Create trigger to calculate total_sales
  const createTotalTriggerSQL = `
    CREATE TRIGGER IF NOT EXISTS calculate_outlet_sales_total 
    AFTER INSERT ON outlet_sales
    BEGIN
      UPDATE outlet_sales 
      SET total_sales = NEW.cash + NEW.qris + NEW.gojek + NEW.shopee + NEW.grab 
      WHERE outlet = NEW.outlet AND date = NEW.date;
    END
  `;

  db.run(createTotalTriggerSQL, (err) => {
    if (err) {
      console.error('Error creating total trigger:', err);
    } else {
      console.log('Total calculation trigger created or already exists');
    }
  });

  // Create trigger to update total_sales on update
  const createUpdateTotalTriggerSQL = `
    CREATE TRIGGER IF NOT EXISTS update_outlet_sales_total 
    AFTER UPDATE ON outlet_sales
    BEGIN
      UPDATE outlet_sales 
      SET total_sales = NEW.cash + NEW.qris + NEW.gojek + NEW.shopee + NEW.grab 
      WHERE outlet = NEW.outlet AND date = NEW.date;
    END
  `;

  db.run(createUpdateTotalTriggerSQL, (err) => {
    if (err) {
      console.error('Error creating update total trigger:', err);
    } else {
      console.log('Update total trigger created or already exists');
    }
  });
} 