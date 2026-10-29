import { STATUS_TONE } from '../utils/format.js';

// A small coloured label, e.g. "Pending" or "Low stock".
export default function Badge({ tone = 'secondary', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

// Badge for an order / purchase-order status.
export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status] || 'secondary'}>{status}</Badge>;
}

// Badge that shows how much stock a product has.
export function StockBadge({ product }) {
  if (product.quantity === 0) return <Badge tone="danger">Out of stock</Badge>;
  if (product.quantity <= product.low_stock_threshold) return <Badge tone="warning">Low stock</Badge>;
  return <Badge tone="success">In stock</Badge>;
}
