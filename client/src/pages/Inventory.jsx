import { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import StatCard from '../components/StatCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { StockBadge } from '../components/Badge.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../utils/api.js';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
];

export default function Inventory() {
  const toast = useToast();
  const [stock, setStock] = useState('all');
  const { data: allProducts, reload: reloadAll } = useFetch('/products');
  const { data: products, loading, reload } = useFetch(`/products?stock=${stock}`);
  const [adjusting, setAdjusting] = useState(null);

  // Numbers for the three small cards (calculated from the full list)
  const totalUnits = allProducts?.reduce((sum, p) => sum + p.quantity, 0) ?? 0;
  const lowCount = allProducts?.filter((p) => p.quantity > 0 && p.quantity <= p.low_stock_threshold).length ?? 0;
  const outCount = allProducts?.filter((p) => p.quantity === 0).length ?? 0;

  return (
    <>
      <PageHeader title="Inventory" subtitle="Check stock levels and make manual adjustments" />

      {lowCount + outCount > 0 && (
        <div className="alert alert-warning" role="alert">
          <i className="bi bi-exclamation-triangle-fill" />
          <span>
            <strong>{lowCount + outCount} product(s) need attention:</strong> {lowCount} low on stock, {outCount} sold out.
            Create a purchase order to restock.
          </span>
        </div>
      )}

      <section className="stats-grid three" aria-label="Stock summary">
        <StatCard icon="bi-boxes" label="Units in stock" value={totalUnits.toLocaleString()} />
        <StatCard icon="bi-exclamation-triangle" label="Low stock products" value={lowCount} tone="warning" />
        <StatCard icon="bi-x-octagon" label="Out of stock" value={outCount} tone="danger" />
      </section>

      <section className="card">
        <div className="tabs" role="tablist" aria-label="Stock filter">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={stock === f.value}
              className={`tab ${stock === f.value ? 'active' : ''}`}
              onClick={() => setStock(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {!products && loading ? (
          <p className="page-loading">Loading…</p>
        ) : products?.length === 0 ? (
          <EmptyState icon="bi-check2-circle" title="Nothing to show" text="No products match this filter." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th className="num">In stock</th>
                  <th className="num">Low stock level</th>
                  <th>Status</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {products?.map((p) => (
                  <tr key={p.product_id}>
                    <td><strong>{p.name}</strong></td>
                    <td><code>{p.sku}</code></td>
                    <td className="num">{p.quantity}</td>
                    <td className="num">{p.low_stock_threshold}</td>
                    <td><StockBadge product={p} /></td>
                    <td className="actions">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setAdjusting(p)}>
                        <i className="bi bi-sliders" /> Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {adjusting && (
        <AdjustForm
          product={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={() => {
            setAdjusting(null);
            toast.success('Stock updated');
            reload();
            reloadAll();
          }}
        />
      )}
    </>
  );
}

function AdjustForm({ product, onClose, onSaved }) {
  const [change, setChange] = useState(0);
  const [threshold, setThreshold] = useState(product.low_stock_threshold);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const newQuantity = product.quantity + Number(change || 0);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post(`/products/${product.product_id}/adjust`, { change, low_stock_threshold: threshold });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={`Adjust stock: ${product.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <div className="alert alert-danger" role="alert">{error}</div>}

          <p className="adjust-summary">
            Current stock: <strong>{product.quantity}</strong> → New stock:{' '}
            <strong className={newQuantity < 0 ? 'text-danger' : ''}>{newQuantity}</strong>
          </p>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="a-change">Add or remove units</label>
              <input
                id="a-change"
                type="number"
                step="1"
                min={-product.quantity}
                value={change}
                onChange={(e) => setChange(e.target.value)}
                required
              />
              <span className="hint">Use a minus sign to remove, e.g. -3</span>
            </div>
            <div className="field">
              <label htmlFor="a-threshold">Low stock level</label>
              <input
                id="a-threshold"
                type="number"
                min="0"
                step="1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                required
              />
              <span className="hint">Warn me when stock reaches this number</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || newQuantity < 0}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
