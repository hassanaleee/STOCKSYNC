import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The whole database is one file: server/stocksync.db (created automatically).
const db = new Database(path.join(__dirname, '..', 'stocksync.db'));

// Make SQLite enforce foreign keys (like PostgreSQL does by default).
db.pragma('foreign_keys = ON');

// Tables follow the "Database Design" section of the proposal.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    category_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    address     TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    product_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL,
    sku                 TEXT NOT NULL UNIQUE,
    category_id         INTEGER REFERENCES categories(category_id),
    supplier_id         INTEGER REFERENCES suppliers(supplier_id),
    cost_price          REAL NOT NULL CHECK (cost_price >= 0),
    selling_price       REAL NOT NULL CHECK (selling_price >= 0),
    quantity            INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
    is_active           INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    order_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER REFERENCES users(user_id),
    customer_name  TEXT NOT NULL,
    order_date     TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'Pending',
    total_amount   REAL NOT NULL DEFAULT 0,
    stock_deducted INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id      INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id    INTEGER NOT NULL REFERENCES products(product_id),
    quantity      INTEGER NOT NULL CHECK (quantity > 0),
    unit_price    REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    purchase_order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id       INTEGER NOT NULL REFERENCES suppliers(supplier_id),
    order_date        TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'Draft'
  );

  CREATE TABLE IF NOT EXISTS purchase_order_items (
    item_id           INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(purchase_order_id) ON DELETE CASCADE,
    product_id        INTEGER NOT NULL REFERENCES products(product_id),
    quantity          INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost         REAL NOT NULL
  );
`);

export default db;
