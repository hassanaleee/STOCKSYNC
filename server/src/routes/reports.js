import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/errors.js';
import { today, daysAgo, isValidDate } from '../utils/dates.js';

const router = express.Router();
router.use(requireAuth);

// "Sales" = orders that are Processing or Completed (stock has been taken out for them).
const SALES = "o.status IN ('Processing', 'Completed')";

// GET /api/dashboard?days=30
router.get('/dashboard', (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
  const from = daysAgo(days - 1);
  const to = today();

  const sales = db
    .prepare(
      `SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS orders
       FROM orders o WHERE ${SALES} AND o.order_date BETWEEN ? AND ?`
    )
    .get(from, to);

  const totalProducts = db.prepare('SELECT COUNT(*) AS n FROM products WHERE is_active = 1').get().n;
  const pendingOrders = db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'Pending'").get().n;
  const lowStock = db
    .prepare('SELECT COUNT(*) AS n FROM products WHERE is_active = 1 AND quantity <= low_stock_threshold')
    .get().n;

  // Sales per day. We fill the days that had no sales with 0 so the chart has no gaps.
  const perDay = db
    .prepare(
      `SELECT order_date AS date, SUM(total_amount) AS total
       FROM orders o WHERE ${SALES} AND o.order_date BETWEEN ? AND ? GROUP BY order_date`
    )
    .all(from, to);
  const totalsByDate = Object.fromEntries(perDay.map((r) => [r.date, r.total]));
  const salesByDay = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgo(i);
    salesByDay.push({ date, total: totalsByDate[date] || 0 });
  }

  const statusCounts = db.prepare('SELECT status, COUNT(*) AS count FROM orders GROUP BY status').all();

  const topProducts = db
    .prepare(
      `SELECT p.name, SUM(oi.quantity) AS sold
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       JOIN products p ON p.product_id = oi.product_id
       WHERE ${SALES} AND o.order_date BETWEEN ? AND ?
       GROUP BY p.product_id ORDER BY sold DESC LIMIT 5`
    )
    .all(from, to);

  const lowStockProducts = db
    .prepare(
      `SELECT product_id, name, sku, quantity, low_stock_threshold FROM products
       WHERE is_active = 1 AND quantity <= low_stock_threshold ORDER BY quantity LIMIT 6`
    )
    .all();

  const recentOrders = db
    .prepare('SELECT order_id, customer_name, order_date, status, total_amount FROM orders ORDER BY order_id DESC LIMIT 6')
    .all();

  res.json({
    totalProducts,
    pendingOrders,
    lowStock,
    totalSales: sales.total,
    salesOrders: sales.orders,
    salesByDay,
    statusCounts,
    topProducts,
    lowStockProducts,
    recentOrders,
  });
});

// GET /api/reports/sales?from=2026-10-01&to=2026-10-26
router.get('/reports/sales', (req, res) => {
  const from = req.query.from || daysAgo(29);
  const to = req.query.to || today();
  if (!isValidDate(from) || !isValidDate(to)) throw new HttpError(400, 'Dates must look like 2026-10-26');
  if (from > to) throw new HttpError(400, '"From" date must be before the "To" date');

  const totals = db
    .prepare(
      `SELECT COALESCE(SUM(total_amount), 0) AS total_sales, COUNT(*) AS order_count
       FROM orders o WHERE ${SALES} AND o.order_date BETWEEN ? AND ?`
    )
    .get(from, to);

  const products = db
    .prepare(
      `SELECT p.product_id, p.name, p.sku,
              SUM(oi.quantity) AS units_sold,
              SUM(oi.quantity * oi.unit_price) AS revenue
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       JOIN products p ON p.product_id = oi.product_id
       WHERE ${SALES} AND o.order_date BETWEEN ? AND ?
       GROUP BY p.product_id ORDER BY revenue DESC`
    )
    .all(from, to);

  const orders = db
    .prepare(
      `SELECT order_id, customer_name, order_date, status, total_amount
       FROM orders o WHERE ${SALES} AND o.order_date BETWEEN ? AND ? ORDER BY order_date, order_id`
    )
    .all(from, to);

  res.json({
    from,
    to,
    totalSales: totals.total_sales,
    orderCount: totals.order_count,
    unitsSold: products.reduce((sum, p) => sum + p.units_sold, 0),
    products,
    orders,
  });
});

export default router;
