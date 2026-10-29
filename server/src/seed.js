import bcrypt from 'bcryptjs';
import db from './db.js';
import { daysAgo } from './utils/dates.js';

// Runs once, only when the database is empty.
// It adds a demo user and sample data so every page has something to show.
export function seedIfEmpty() {
  const hasUsers = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (hasUsers > 0) return;

  console.log('Empty database found - adding demo data...');

  db.transaction(() => {
    // Demo login:  demo@stocksync.com  /  demo123
    const user = db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run('Demo Seller', 'demo@stocksync.com', bcrypt.hashSync('demo123', 10));
    const userId = user.lastInsertRowid;

    const addCategory = db.prepare('INSERT INTO categories (category_name) VALUES (?)');
    const category = {};
    for (const name of ['Electronics', 'Accessories', 'Clothing', 'Home', 'Stationery']) {
      category[name] = addCategory.run(name).lastInsertRowid;
    }

    const addSupplier = db.prepare('INSERT INTO suppliers (name, phone, email, address) VALUES (?, ?, ?, ?)');
    const tech = addSupplier.run('TechZone Traders', '0300-1234567', 'sales@techzone.pk', 'Hall Road, Lahore').lastInsertRowid;
    const style = addSupplier.run('Style Wholesale', '0321-7654321', 'orders@stylewholesale.pk', 'Liberty Market, Lahore').lastInsertRowid;
    const home = addSupplier.run('Home & Living Supplies', '0333-1112223', 'info@homeliving.pk', 'Anarkali Bazaar, Lahore').lastInsertRowid;

    // name, sku, category, supplier, cost, price, quantity, low-stock threshold
    const products = [
      ['Wireless Earbuds', 'EL-100', 'Electronics', tech, 1800, 2999, 24, 8],
      ['USB-C Cable 1m', 'EL-101', 'Electronics', tech, 150, 399, 85, 20],
      ['Power Bank 10000mAh', 'EL-102', 'Electronics', tech, 2200, 3499, 6, 8],
      ['Bluetooth Speaker', 'EL-103', 'Electronics', tech, 2500, 4200, 0, 5],
      ['Phone Case', 'AC-201', 'Accessories', tech, 120, 450, 60, 15],
      ['Leather Wallet', 'AC-202', 'Accessories', style, 600, 1299, 18, 6],
      ['Backpack', 'AC-203', 'Accessories', style, 1400, 2499, 4, 5],
      ['Cotton T-Shirt', 'CL-301', 'Clothing', style, 450, 999, 52, 15],
      ['Hoodie', 'CL-302', 'Clothing', style, 1200, 2299, 14, 6],
      ['Water Bottle 1L', 'HM-401', 'Home', home, 350, 799, 40, 10],
      ['Desk Lamp', 'HM-402', 'Home', home, 900, 1799, 9, 5],
      ['Notebook A5', 'ST-501', 'Stationery', home, 80, 199, 120, 30],
    ];
    const addProduct = db.prepare(
      `INSERT INTO products (name, sku, category_id, supplier_id, cost_price, selling_price, quantity, low_stock_threshold)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const p of products) {
      addProduct.run(p[0], p[1], category[p[2]], p[3], p[4], p[5], p[6], p[7]);
    }

    // Sample orders spread over the last 30 days.
    // (A tiny "random" generator with a fixed start, so everyone gets the same demo data.)
    let seed = 42;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const pick = (list) => list[Math.floor(random() * list.length)];

    const customers = ['Ayesha Khan', 'Bilal Ahmed', 'Fatima Noor', 'Hamza Ali', 'Sana Malik', 'Usman Tariq', 'Zainab Raza', 'Imran Sheikh', 'Hira Javed', 'Danish Butt'];
    const addOrder = db.prepare(
      'INSERT INTO orders (user_id, customer_name, order_date, status, total_amount, stock_deducted) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const addItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)');

    for (let i = 0; i < 40; i++) {
      let age = Math.floor(random() * 30); // how many days ago
      let status;
      if (age > 3) status = random() < 0.85 ? 'Completed' : 'Cancelled';
      else status = pick(['Pending', 'Pending', 'Processing', 'Completed']);

      // Make sure the newest few orders are Pending / Processing, so the dashboard has something to show.
      if (i < 6) {
        age = i % 3;
        status = i < 3 ? 'Pending' : 'Processing';
      }

      const order = addOrder.run(userId, pick(customers), daysAgo(age), status, 0, status === 'Processing' || status === 'Completed' ? 1 : 0);

      let total = 0;
      const itemCount = 1 + Math.floor(random() * 3);
      const used = new Set();
      for (let j = 0; j < itemCount; j++) {
        const productId = 1 + Math.floor(random() * products.length);
        if (used.has(productId)) continue; // do not repeat a product in one order
        used.add(productId);
        const quantity = 1 + Math.floor(random() * 3);
        const price = products[productId - 1][5];
        addItem.run(order.lastInsertRowid, productId, quantity, price);
        total += quantity * price;
      }
      db.prepare('UPDATE orders SET total_amount = ? WHERE order_id = ?').run(total, order.lastInsertRowid);
    }
  })();
}
