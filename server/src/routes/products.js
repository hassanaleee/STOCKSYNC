import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError, toNumber } from '../utils/errors.js';

const router = express.Router();
router.use(requireAuth); // every route in this file needs login

// One query we reuse: a product together with its category and supplier names.
const PRODUCT_SELECT = `
  SELECT p.*, c.category_name, s.name AS supplier_name
  FROM products p
  LEFT JOIN categories c ON c.category_id = p.category_id
  LEFT JOIN suppliers  s ON s.supplier_id = p.supplier_id
`;

function getProduct(id) {
  return db.prepare(`${PRODUCT_SELECT} WHERE p.product_id = ?`).get(id);
}

// Returns an error message if the product data is wrong, otherwise null.
function checkProduct(b) {
  if (!String(b.name || '').trim()) return 'Product name is required';
  if (!/^[A-Za-z0-9-]+$/.test(String(b.sku || '').trim())) {
    return 'SKU is required and can only contain letters, numbers and dashes';
  }
  const cost = toNumber(b.cost_price);
  const price = toNumber(b.selling_price);
  const qty = toNumber(b.quantity);
  const threshold = toNumber(b.low_stock_threshold);

  if (isNaN(cost) || cost < 0) return 'Cost price must be 0 or more';
  if (isNaN(price) || price < 0) return 'Selling price must be 0 or more';
  if (!Number.isInteger(qty) || qty < 0) return 'Quantity must be a whole number (0 or more)';
  if (!Number.isInteger(threshold) || threshold < 0) return 'Low stock threshold must be a whole number (0 or more)';
  return null;
}

// The form lets the user type a category name. Find it, or create it.
function findOrCreateCategory(name) {
  const clean = String(name || '').trim();
  if (!clean) return null;
  const found = db
    .prepare('SELECT category_id FROM categories WHERE LOWER(category_name) = LOWER(?)')
    .get(clean);
  if (found) return found.category_id;
  return db.prepare('INSERT INTO categories (category_name) VALUES (?)').run(clean).lastInsertRowid;
}

function supplierOrNull(value) {
  return value ? Number(value) : null;
}

// GET /api/products?q=&category=&stock=
router.get('/', (req, res) => {
  const { q = '', category = '', stock = 'all' } = req.query;
  const where = ['p.is_active = 1'];
  const params = [];

  if (q) {
    where.push('(p.name LIKE ? OR p.sku LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category) {
    where.push('p.category_id = ?');
    params.push(category);
  }
  if (stock === 'out') where.push('p.quantity = 0');
  if (stock === 'low') where.push('p.quantity > 0 AND p.quantity <= p.low_stock_threshold');
  if (stock === 'in') where.push('p.quantity > p.low_stock_threshold');

  const sql = `${PRODUCT_SELECT} WHERE ${where.join(' AND ')} ORDER BY p.name`;
  res.json(db.prepare(sql).all(...params));
});

// POST /api/products
router.post('/', (req, res) => {
  const b = req.body;
  const problem = checkProduct(b);
  if (problem) throw new HttpError(400, problem);

  const sku = b.sku.trim().toUpperCase();
  if (db.prepare('SELECT 1 FROM products WHERE sku = ?').get(sku)) {
    throw new HttpError(409, `SKU "${sku}" already exists`);
  }

  const result = db
    .prepare(
      `INSERT INTO products
       (name, sku, category_id, supplier_id, cost_price, selling_price, quantity, low_stock_threshold)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.name.trim(),
      sku,
      findOrCreateCategory(b.category_name),
      supplierOrNull(b.supplier_id),
      Number(b.cost_price),
      Number(b.selling_price),
      Number(b.quantity),
      Number(b.low_stock_threshold)
    );

  res.status(201).json(getProduct(result.lastInsertRowid));
});

// PUT /api/products/:id
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!getProduct(id)) throw new HttpError(404, 'Product not found');

  const b = req.body;
  const problem = checkProduct(b);
  if (problem) throw new HttpError(400, problem);

  const sku = b.sku.trim().toUpperCase();
  if (db.prepare('SELECT 1 FROM products WHERE sku = ? AND product_id != ?').get(sku, id)) {
    throw new HttpError(409, `SKU "${sku}" already exists`);
  }

  db.prepare(
    `UPDATE products SET name = ?, sku = ?, category_id = ?, supplier_id = ?,
     cost_price = ?, selling_price = ?, quantity = ?, low_stock_threshold = ?
     WHERE product_id = ?`
  ).run(
    b.name.trim(),
    sku,
    findOrCreateCategory(b.category_name),
    supplierOrNull(b.supplier_id),
    Number(b.cost_price),
    Number(b.selling_price),
    Number(b.quantity),
    Number(b.low_stock_threshold),
    id
  );

  res.json(getProduct(id));
});

// DELETE /api/products/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!getProduct(id)) throw new HttpError(404, 'Product not found');

  // If the product is already used in an order, we cannot erase it
  // (old orders would break). We hide it instead.
  const used = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM order_items WHERE product_id = ?) +
              (SELECT COUNT(*) FROM purchase_order_items WHERE product_id = ?) AS n`
    )
    .get(id, id).n;

  if (used > 0) {
    db.prepare('UPDATE products SET is_active = 0 WHERE product_id = ?').run(id);
    return res.json({ message: 'Product has order history, so it was archived instead of deleted' });
  }

  db.prepare('DELETE FROM products WHERE product_id = ?').run(id);
  res.json({ message: 'Product deleted' });
});

// POST /api/products/:id/adjust   body: { change: 5 or -3, low_stock_threshold? }
router.post('/:id/adjust', (req, res) => {
  const id = Number(req.params.id);
  const product = getProduct(id);
  if (!product) throw new HttpError(404, 'Product not found');

  const change = toNumber(req.body.change ?? 0);
  if (!Number.isInteger(change)) throw new HttpError(400, 'Adjustment must be a whole number');

  const newQuantity = product.quantity + change;
  if (newQuantity < 0) throw new HttpError(400, 'Stock cannot go below zero');

  let threshold = product.low_stock_threshold;
  if (req.body.low_stock_threshold !== undefined) {
    threshold = toNumber(req.body.low_stock_threshold);
    if (!Number.isInteger(threshold) || threshold < 0) {
      throw new HttpError(400, 'Low stock threshold must be a whole number (0 or more)');
    }
  }

  db.prepare('UPDATE products SET quantity = ?, low_stock_threshold = ? WHERE product_id = ?').run(
    newQuantity,
    threshold,
    id
  );
  res.json(getProduct(id));
});

// POST /api/products/import   body: { rows: [ {name, sku, category, supplier, ...} ] }
// Valid rows are saved. Bad rows are reported back with their line number.
router.post('/import', (req, res) => {
  const rows = req.body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new HttpError(400, 'The CSV file has no data rows');
  }

  const errors = [];
  let imported = 0;

  const run = db.transaction(() => {
    rows.forEach((row, index) => {
      const line = index + 2; // line 1 of the file is the header
      const data = { ...row, category_name: row.category };

      const problem = checkProduct(data);
      if (problem) return errors.push({ row: line, message: problem });

      const sku = data.sku.trim().toUpperCase();
      if (db.prepare('SELECT 1 FROM products WHERE sku = ?').get(sku)) {
        return errors.push({ row: line, message: `SKU "${sku}" already exists` });
      }

      let supplierId = null;
      if (String(row.supplier || '').trim()) {
        const supplier = db
          .prepare('SELECT supplier_id FROM suppliers WHERE LOWER(name) = LOWER(?)')
          .get(row.supplier.trim());
        if (!supplier) return errors.push({ row: line, message: `Supplier "${row.supplier}" not found` });
        supplierId = supplier.supplier_id;
      }

      db.prepare(
        `INSERT INTO products
         (name, sku, category_id, supplier_id, cost_price, selling_price, quantity, low_stock_threshold)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        data.name.trim(),
        sku,
        findOrCreateCategory(data.category_name),
        supplierId,
        Number(data.cost_price),
        Number(data.selling_price),
        Number(data.quantity),
        Number(data.low_stock_threshold)
      );
      imported++;
    });
  });
  run();

  res.json({ imported, errors });
});

export default router;
