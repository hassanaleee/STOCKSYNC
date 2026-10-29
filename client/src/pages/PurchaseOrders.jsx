import { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../utils/api.js';
import { formatDate, money } from '../utils/format.js';

export default function PurchaseOrders() {
  const toast = useToast();
  const { data: orders, loading, reload } = useFetch('/purchase-orders');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);

  async function changeStatus(po, next) {
    const message = next === 'Received' ? 'Mark as received? This adds the quantities to your stock.' : null;
    if (message && !window.confirm(message)) return;
    try {
      await api.patch(`/purchase-orders/${po.purchase_order_id}/status`, { status: next });
      toast.success(`Purchase order #${po.purchase_order_id} is now ${next}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(po) {
    if (!window.confirm(`Delete draft purchase order #${po.purchase_order_id}?`)) return;
    try {
      await api.delete(`/purchase-orders/${po.purchase_order_id}`);
      toast.success('Purchase order deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleView(po) {
    try {
      setViewing(await api.get(`/purchase-orders/${po.purchase_order_id}`));
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Purchase orders" subtitle="Order stock from your suppliers and receive it into inventory">
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          <i className="bi bi-plus-lg" /> New purchase order
        </button>
      </PageHeader>

      <section className="card">
        {!orders && loading ? (
          <p className="page-loading">Loading…</p>
        ) : orders?.length === 0 ? (
          <EmptyState icon="bi-cart-plus" title="No purchase orders yet" text="Create one to restock a product." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PO</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th className="num">Units</th>
                  <th className="num">Total cost</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders?.map((po) => (
                  <tr key={po.purchase_order_id}>
                    <td><strong>#{po.purchase_order_id}</strong></td>
                    <td>{po.supplier_name}</td>
                    <td>{formatDate(po.order_date)}</td>
                    <td className="num">{po.item_count}</td>
                    <td className="num">{money(po.total_cost)}</td>
                    <td><StatusBadge status={po.status} /></td>
                    <td className="actions left">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => handleView(po)}>View</button>
                      {po.status === 'Draft' && (
                        <>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => changeStatus(po, 'Ordered')}>Mark ordered</button>
                          <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(po)}>Delete</button>
                        </>
                      )}
                      {po.status === 'Ordered' && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => changeStatus(po, 'Received')}>Receive stock</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {creating && (
        <PurchaseOrderForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            toast.success('Purchase order created as Draft');
            setCreating(false);
            reload();
          }}
        />
      )}

      {viewing && (
        <Modal title={`Purchase order #${viewing.purchase_order_id}`} onClose={() => setViewing(null)}>
          <div className="modal-body">
            <dl className="details">
              <div><dt>Supplier</dt><dd>{viewing.supplier_name}</dd></div>
              <div><dt>Date</dt><dd>{formatDate(viewing.order_date)}</dd></div>
              <div><dt>Status</dt><dd><StatusBadge status={viewing.status} /></dd></div>
            </dl>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th className="num">Qty</th><th className="num">Unit cost</th><th className="num">Subtotal</th></tr>
                </thead>
                <tbody>
                  {viewing.items.map((i) => (
                    <tr key={i.item_id}>
                      <td>{i.product_name} <span className="muted small">({i.sku})</span></td>
                      <td className="num">{i.quantity}</td>
                      <td className="num">{money(i.unit_cost)}</td>
                      <td className="num">{money(i.quantity * i.unit_cost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan="3">Total</td><td className="num">{money(viewing.total_cost)}</td></tr>
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

function PurchaseOrderForm({ onClose, onSaved }) {
  const { data: suppliers } = useFetch('/suppliers');
  const { data: products } = useFetch('/products');

  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 10, unit_cost: '' }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateItem(index, field, value) {
    setItems(items.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      // When a product is chosen, fill in its cost price automatically.
      if (field === 'product_id') {
        const product = products.find((p) => p.product_id === Number(value));
        updated.unit_cost = product ? product.cost_price : '';
      }
      return updated;
    }));
  }

  const total = items.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unit_cost || 0), 0);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/purchase-orders', { supplier_id: supplierId, items });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="New purchase order" onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <div className="alert alert-danger" role="alert">{error}</div>}

          <div className="field">
            <label htmlFor="po-supplier" className="required">Supplier</label>
            <select id="po-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              <option value="">Choose a supplier…</option>
              {suppliers?.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}
            </select>
          </div>

          <fieldset className="items-box">
            <legend>Products to order</legend>
            {items.map((item, index) => (
              <div className="item-row" key={index}>
                <div className="field grow">
                  <label htmlFor={`po-product-${index}`} className="sr-only">Product</label>
                  <select id={`po-product-${index}`} value={item.product_id} onChange={(e) => updateItem(index, 'product_id', e.target.value)} required>
                    <option value="">Choose a product…</option>
                    {products?.map((p) => <option key={p.product_id} value={p.product_id}>{p.name} ({p.quantity} in stock)</option>)}
                  </select>
                </div>
                <div className="field qty">
                  <label htmlFor={`po-qty-${index}`} className="sr-only">Quantity</label>
                  <input id={`po-qty-${index}`} type="number" min="1" step="1" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} required />
                </div>
                <div className="field qty">
                  <label htmlFor={`po-cost-${index}`} className="sr-only">Unit cost</label>
                  <input id={`po-cost-${index}`} type="number" min="0" step="0.01" placeholder="Unit cost" value={item.unit_cost} onChange={(e) => updateItem(index, 'unit_cost', e.target.value)} required />
                </div>
                <button type="button" className="icon-btn danger" onClick={() => setItems(items.filter((_, i) => i !== index))} disabled={items.length === 1} aria-label="Remove this product">
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setItems([...items, { product_id: '', quantity: 10, unit_cost: '' }])}>
              <i className="bi bi-plus" /> Add another product
            </button>
          </fieldset>

          <p className="total-line">Total cost: <strong>{money(total)}</strong></p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create purchase order'}</button>
        </div>
      </form>
    </Modal>
  );
}
