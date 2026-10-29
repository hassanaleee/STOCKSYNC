import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/errors.js';
import { today } from '../utils/dates.js';

const router = express.Router();
router.use(requireAuth);

function loadPO(id) {
  const po = db
    .prepare(
      `SELECT po.*, s.name AS supplier_name
       FROM purchase_orders po JOIN suppliers s ON s.supplier_id = po.supplier_id
       WHERE po.purchase_order_id = ?`
    )
    .get(id);
  if (!po) return null;
  po.items = db
    .prepare(
      `SELECT i.*, p.name AS product_name, p.sku
       FROM purchase_order_items i JOIN products p ON p.product_id = i.product_id
       WHERE i.purchase_order_id = ?`
    )
    .all(id);
  po.total_cost = po.items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);
  return po;
}

// GET /api/purchase-orders
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT po.*, s.name AS supplier_name,
              (SELECT COALESCE(SUM(quantity), 0) FROM purchase_order_items WHERE purchase_order_id = po.purchase_order_id) AS item_count,
              (SELECT COALESCE(SUM(quantity * unit_cost), 0) FROM purchase_order_items WHERE purchase_order_id = po.purchase_order_id) AS total_cost
       FROM purchase_orders po JOIN suppliers s ON s.supplier_id = po.supplier_id
       ORDER BY po.purchase_order_id DESC`
    )
    .all();
  res.json(rows);
});

// GET /api/purchase-orders/:id
router.get('/:id', (req, res) => {
  const po = loadPO(Number(req.params.id));
  if (!po) throw new HttpError(404, 'Purchase order not found');
  res.json(po);
});

// POST /api/purchase-orders   body: { supplier_id, items: [{product_id, quantity, unit_cost}] }
router.post('/', (req, res) => {
  const supplierId = Number(req.body.supplier_id);
  if (!db.prepare('SELECT 1 FROM suppliers WHERE supplier_id = ?').get(supplierId)) {
    throw new HttpError(400, 'Please choose a supplier');
  }

  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'Add at least one product');
  }
  for (const item of items) {
    const product = db.prepare('SELECT 1 FROM products WHERE product_id = ?').get(Number(item.product_id));
    if (!product) throw new HttpError(400, 'One of the products does not exist');
    if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
      throw new HttpError(400, 'Quantity must be at least 1');
    }
    if (isNaN(Number(item.unit_cost)) || Number(item.unit_cost) < 0 || item.unit_cost === '') {
      throw new HttpError(400, 'Unit cost must be 0 or more');
    }
  }

  const create = db.transaction(() => {
    const result = db
      .prepare('INSERT INTO purchase_orders (supplier_id, order_date, status) VALUES (?, ?, ?)')
      .run(supplierId, today(), 'Draft');
    const insert = db.prepare(
      'INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_cost) VALUES (?, ?, ?, ?)'
    );
    for (const item of items) {
      insert.run(result.lastInsertRowid, Number(item.product_id), Number(item.quantity), Number(item.unit_cost));
    }
    return result.lastInsertRowid;
  });

  res.status(201).json(loadPO(create()));
});

// PATCH /api/purchase-orders/:id/status   Draft -> Ordered -> Received
router.patch('/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const po = loadPO(id);
  if (!po) throw new HttpError(404, 'Purchase order not found');

  const next = req.body.status;
  const allowed = { Draft: 'Ordered', Ordered: 'Received' };
  if (allowed[po.status] !== next) {
    throw new HttpError(400, `A ${po.status} purchase order cannot be changed to ${next}`);
  }

  db.transaction(() => {
    // "WHERE status = ..." makes sure only ONE request can win.
    // That is how we stop the same order from adding stock twice.
    const result = db
      .prepare('UPDATE purchase_orders SET status = ? WHERE purchase_order_id = ? AND status = ?')
      .run(next, id, po.status);
    if (result.changes === 0) throw new HttpError(400, 'This purchase order was already updated');

    if (next === 'Received') {
      for (const item of po.items) {
        db.prepare('UPDATE products SET quantity = quantity + ? WHERE product_id = ?').run(
          item.quantity,
          item.product_id
        );
      }
    }
  })();

  res.json(loadPO(id));
});

// DELETE /api/purchase-orders/:id   (Draft only)
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const po = loadPO(id);
  if (!po) throw new HttpError(404, 'Purchase order not found');
  if (po.status !== 'Draft') throw new HttpError(400, 'Only Draft purchase orders can be deleted');

  db.prepare('DELETE FROM purchase_orders WHERE purchase_order_id = ?').run(id);
  res.json({ message: 'Purchase order deleted' });
});

export default router;
