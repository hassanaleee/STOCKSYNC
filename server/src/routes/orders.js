import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/errors.js';
import { today, isValidDate } from '../utils/dates.js';

const router = express.Router();
router.use(requireAuth);

// Allowed status changes. Anything else is rejected.
const NEXT_STATUS = {
  Pending: ['Processing', 'Cancelled'],
  Processing: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

function loadOrder(id) {
  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(id);
  if (!order) return null;
  order.items = db
    .prepare(
      `SELECT oi.*, p.name AS product_name, p.sku
       FROM order_items oi JOIN products p ON p.product_id = oi.product_id
       WHERE oi.order_id = ?`
    )
    .all(id);
  return order;
}

// Check the items sent by the browser. The PRICE always comes from the database,
// never from the browser (otherwise a user could send a fake price).
function buildItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'Add at least one product to the order');
  }

  const quantities = new Map(); // product_id -> total quantity (merges repeated products)
  for (const item of items) {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
      throw new HttpError(400, 'Every item needs a product and a quantity of at least 1');
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  const result = [];
  for (const [productId, quantity] of quantities) {
    const product = db
      .prepare('SELECT product_id, selling_price FROM products WHERE product_id = ? AND is_active = 1')
      .get(productId);
    if (!product) throw new HttpError(400, 'One of the products no longer exists');
    result.push({ product_id: productId, quantity, unit_price: product.selling_price });
  }
  return result;
}

function checkHeader(b) {
  if (!String(b.customer_name || '').trim()) throw new HttpError(400, 'Customer name is required');
  if (b.order_date && !isValidDate(b.order_date)) throw new HttpError(400, 'Order date is invalid');
}

function saveItems(orderId, items) {
  const insert = db.prepare(
    'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
  );
  let total = 0;
  for (const item of items) {
    insert.run(orderId, item.product_id, item.quantity, item.unit_price);
    total += item.quantity * item.unit_price;
  }
  db.prepare('UPDATE orders SET total_amount = ? WHERE order_id = ?').run(total, orderId);
}

// GET /api/orders?status=
router.get('/', (req, res) => {
  const { status = '' } = req.query;
  const where = status ? 'WHERE o.status = ?' : '';
  const rows = db
    .prepare(
      `SELECT o.*, (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = o.order_id) AS item_count
       FROM orders o ${where} ORDER BY o.order_date DESC, o.order_id DESC`
    )
    .all(...(status ? [status] : []));
  res.json(rows);
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const order = loadOrder(Number(req.params.id));
  if (!order) throw new HttpError(404, 'Order not found');
  res.json(order);
});

// POST /api/orders
router.post('/', (req, res) => {
  checkHeader(req.body);
  const items = buildItems(req.body.items);

  const create = db.transaction(() => {
    const result = db
      .prepare('INSERT INTO orders (user_id, customer_name, order_date, status) VALUES (?, ?, ?, ?)')
      .run(req.user.user_id, req.body.customer_name.trim(), req.body.order_date || today(), 'Pending');
    saveItems(result.lastInsertRowid, items);
    return result.lastInsertRowid;
  });

  res.status(201).json(loadOrder(create()));
});

// PUT /api/orders/:id   (only while the order is still Pending)
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const order = loadOrder(id);
  if (!order) throw new HttpError(404, 'Order not found');
  if (order.status !== 'Pending') throw new HttpError(400, 'Only Pending orders can be edited');

  checkHeader(req.body);
  const items = buildItems(req.body.items);

  db.transaction(() => {
    db.prepare('UPDATE orders SET customer_name = ?, order_date = ? WHERE order_id = ?').run(
      req.body.customer_name.trim(),
      req.body.order_date || order.order_date,
      id
    );
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);
    saveItems(id, items);
  })();

  res.json(loadOrder(id));
});

// PATCH /api/orders/:id/status   body: { status: 'Processing' }
router.patch('/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const order = loadOrder(id);
  if (!order) throw new HttpError(404, 'Order not found');

  const next = req.body.status;
  if (!NEXT_STATUS[order.status].includes(next)) {
    throw new HttpError(400, `A ${order.status} order cannot be changed to ${next}`);
  }

  // A transaction = all steps succeed together, or none of them happen.
  // If anything throws an error inside, the database goes back to how it was.
  db.transaction(() => {
    if (next === 'Processing') {
      // Take stock out. The "AND quantity >= ?" part blocks the update if stock is not enough.
      for (const item of order.items) {
        const result = db
          .prepare('UPDATE products SET quantity = quantity - ? WHERE product_id = ? AND quantity >= ?')
          .run(item.quantity, item.product_id, item.quantity);

        if (result.changes === 0) {
          const p = db.prepare('SELECT quantity FROM products WHERE product_id = ?').get(item.product_id);
          throw new HttpError(
            400,
            `Not enough stock for "${item.product_name}": ${p.quantity} available, ${item.quantity} needed`
          );
        }
      }
      db.prepare('UPDATE orders SET stock_deducted = 1 WHERE order_id = ?').run(id);
    }

    if (next === 'Cancelled' && order.stock_deducted) {
      // Stock was already taken out, so put it back.
      for (const item of order.items) {
        db.prepare('UPDATE products SET quantity = quantity + ? WHERE product_id = ?').run(
          item.quantity,
          item.product_id
        );
      }
      db.prepare('UPDATE orders SET stock_deducted = 0 WHERE order_id = ?').run(id);
    }

    db.prepare('UPDATE orders SET status = ? WHERE order_id = ?').run(next, id);
  })();

  res.json(loadOrder(id));
});

export default router;
