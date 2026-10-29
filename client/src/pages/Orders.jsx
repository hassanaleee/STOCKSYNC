import { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../utils/api.js';
import { formatDate, money, todayISO } from '../utils/format.js';

const STATUS_TABS = ['All', 'Pending', 'Processing', 'Completed', 'Cancelled'];

export default function Orders() {
  const toast = useToast();
  const [status, setStatus] = useState('All');
  const { data: orders, loading, reload } = useFetch(status === 'All' ? '/orders' : `/orders?status=${status}`);
  const [formOrder, setFormOrder] = useState(null); // order form: {} = new, order = edit
  const [viewing, setViewing] = useState(null); // order details

  async function changeStatus(order, next) {
    if (next === 'Cancelled' && !window.confirm(`Cancel order #${order.order_id}?`)) return;
    try {
      await api.patch(`/orders/${order.order_id}/status`, { status: next });
      toast.success(`Order #${order.order_id} is now ${next}`);
      reload();
    } catch (err) {
      // For example: "Not enough stock for ..."
      toast.error(err.message);
    }
  }

  async function openOrder(order, mode) {
    try {
      const full = await api.get(`/orders/${order.order_id}`); // the list does not contain the items
      if (mode === 'view') setViewing(full);
      else setFormOrder(full);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Orders" subtitle="Create customer orders and move them through the workflow">
        <button type="button" className="btn btn-primary" onClick={() => setFormOrder({})}>
          <i className="bi bi-plus-lg" /> New order
        </button>
      </PageHeader>

      <section className="card">
        <div className="tabs" role="tablist" aria-label="Order status">
          {STATUS_TABS.map((s) => (
            <button key={s} type="button" role="tab" aria-selected={status === s} className={`tab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
              {s}
            </button>
          ))}
        </div>

        {!orders && loading ? (
          <p className="page-loading">Loading orders…</p>
        ) : orders?.length === 0 ? (
          <EmptyState icon="bi-bag" title="No orders here" text="Create a new order to get started." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th className="num">Items</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders?.map((o) => (
                  <tr key={o.order_id}>
                    <td><strong>#{o.order_id}</strong></td>
                    <td>{o.customer_name}</td>
                    <td>{formatDate(o.order_date)}</td>
                    <td className="num">{o.item_count}</td>
                    <td className="num">{money(o.total_amount)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="actions left">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => openOrder(o, 'view')}>View</button>
                      {o.status === 'Pending' && (
                        <>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => openOrder(o, 'edit')}>Edit</button>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => changeStatus(o, 'Processing')}>Process</button>
                          <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => changeStatus(o, 'Cancelled')}>Cancel</button>
                        </>
                      )}
                      {o.status === 'Processing' && (
                        <>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => changeStatus(o, 'Completed')}>Complete</button>
                          <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => changeStatus(o, 'Cancelled')}>Cancel</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOrder && (
        <OrderForm
          order={formOrder}
          onClose={() => setFormOrder(null)}
          onSaved={() => {
            toast.success(formOrder.order_id ? 'Order updated' : 'Order created');
            setFormOrder(null);
            reload();
          }}
        />
      )}

      {viewing && (
        <Modal title={`Order #${viewing.order_id}`} onClose={() => setViewing(null)}>
          <div className="modal-body">
            <dl className="details">
              <div><dt>Customer</dt><dd>{viewing.customer_name}</dd></div>
              <div><dt>Date</dt><dd>{formatDate(viewing.order_date)}</dd></div>
              <div><dt>Status</dt><dd><StatusBadge status={viewing.status} /></dd></div>
            </dl>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Subtotal</th></tr>
                </thead>
                <tbody>
                  {viewing.items.map((i) => (
                    <tr key={i.order_item_id}>
                      <td>{i.product_name} <span className="muted small">({i.sku})</span></td>
                      <td className="num">{i.quantity}</td>
                      <td className="num">{money(i.unit_price)}</td>
                      <td className="num">{money(i.quantity * i.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan="3">Total</td><td className="num">{money(viewing.total_amount)}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-primary" onClick={() => setViewing(null)}>Close</button>
          </div>
        </Modal>
      )}
    </>
  );
}

// Form to create a new order or edit a Pending one.
function OrderForm({ order, onClose, onSaved }) {
  const isNew = !order.order_id;
  const { data: products } = useFetch('/products');

  const [customer, setCustomer] = useState(order.customer_name || '');
  const [date, setDate] = useState(order.order_date || todayISO());
  const [items, setItems] = useState(
    order.items ? order.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })) : [{ product_id: '', quantity: 1 }]
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateItem(index, field, value) {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }
  function addItem() {
    setItems([...items, { product_id: '', quantity: 1 }]);
  }
  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  // Live total shown to the user (the server calculates the real one again)
  const total = items.reduce((sum, item) => {
    const product = products?.find((p) => p.product_id === Number(item.product_id));
    return sum + (product ? product.selling_price * Number(item.quantity || 0) : 0);
  }, 0);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const body = { customer_name: customer, order_date: date, items };
    try {
      if (isNew) await api.post('/orders', body);
      else await api.put(`/orders/${order.order_id}`, body);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? 'New order' : `Edit order #${order.order_id}`} onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <div className="alert alert-danger" role="alert">{error}</div>}

          <div className="form-grid">
            <div className="field">
              <label htmlFor="o-customer" className="required">Customer name</label>
              <input id="o-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="o-date" className="required">Order date</label>
              <input id="o-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <fieldset className="items-box">
            <legend>Products</legend>
            {items.map((item, index) => (
              <div className="item-row" key={index}>
                <div className="field grow">
                  <label htmlFor={`o-product-${index}`} className="sr-only">Product</label>
                  <select id={`o-product-${index}`} value={item.product_id} onChange={(e) => updateItem(index, 'product_id', e.target.value)} required>
                    <option value="">Choose a product…</option>
                    {products?.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.name} — {money(p.selling_price)} ({p.quantity} in stock)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field qty">
                  <label htmlFor={`o-qty-${index}`} className="sr-only">Quantity</label>
                  <input id={`o-qty-${index}`} type="number" min="1" step="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} required />
                </div>
                <button type="button" className="icon-btn danger" onClick={() => removeItem(index)} disabled={items.length === 1} aria-label="Remove this product">
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" onClick={addItem}>
              <i className="bi bi-plus" /> Add another product
            </button>
          </fieldset>

          <p className="total-line">Order total: <strong>{money(total)}</strong></p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create order' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
