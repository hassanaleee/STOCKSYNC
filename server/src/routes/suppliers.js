import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/errors.js';

const router = express.Router();
router.use(requireAuth);

const LIST_SQL = `
  SELECT s.*,
         (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.supplier_id AND p.is_active = 1) AS product_count
  FROM suppliers s
`;

function checkSupplier(b) {
  if (!String(b.name || '').trim()) return 'Supplier name is required';
  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return 'Please enter a valid email';
  if (b.phone && !/^[0-9+\-\s()]{7,20}$/.test(b.phone)) return 'Phone number looks invalid';
  return null;
}

// GET /api/suppliers?q=
router.get('/', (req, res) => {
  const q = req.query.q || '';
  const rows = db
    .prepare(`${LIST_SQL} WHERE s.name LIKE ? OR s.email LIKE ? OR s.phone LIKE ? ORDER BY s.name`)
    .all(`%${q}%`, `%${q}%`, `%${q}%`);
  res.json(rows);
});

// POST /api/suppliers
router.post('/', (req, res) => {
  const b = req.body;
  const problem = checkSupplier(b);
  if (problem) throw new HttpError(400, problem);

  const result = db
    .prepare('INSERT INTO suppliers (name, phone, email, address) VALUES (?, ?, ?, ?)')
    .run(b.name.trim(), b.phone || null, b.email || null, b.address || null);

  res.status(201).json(db.prepare(`${LIST_SQL} WHERE s.supplier_id = ?`).get(result.lastInsertRowid));
});

// PUT /api/suppliers/:id
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM suppliers WHERE supplier_id = ?').get(id)) {
    throw new HttpError(404, 'Supplier not found');
  }
  const b = req.body;
  const problem = checkSupplier(b);
  if (problem) throw new HttpError(400, problem);

  db.prepare('UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ? WHERE supplier_id = ?').run(
    b.name.trim(),
    b.phone || null,
    b.email || null,
    b.address || null,
    id
  );
  res.json(db.prepare(`${LIST_SQL} WHERE s.supplier_id = ?`).get(id));
});

// DELETE /api/suppliers/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);

  // A supplier that has purchase orders must stay (history).
  const hasOrders = db.prepare('SELECT 1 FROM purchase_orders WHERE supplier_id = ?').get(id);
  if (hasOrders) {
    throw new HttpError(400, 'This supplier has purchase orders, so it cannot be deleted');
  }

  // Products of this supplier simply become "no supplier".
  db.transaction(() => {
    db.prepare('UPDATE products SET supplier_id = NULL WHERE supplier_id = ?').run(id);
    db.prepare('DELETE FROM suppliers WHERE supplier_id = ?').run(id);
  })();

  res.json({ message: 'Supplier deleted' });
});

export default router;
