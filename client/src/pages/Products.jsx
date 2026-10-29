import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { StockBadge } from '../components/Badge.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../utils/api.js';
import { exportProducts, parseCSV, PRODUCT_CSV_HEADERS } from '../utils/csv.js';
import { money } from '../utils/format.js';

const EMPTY_PRODUCT = {
  name: '', sku: '', category_name: '', supplier_id: '',
  cost_price: '', selling_price: '', quantity: 0, low_stock_threshold: 5,
};

export default function Products() {
  const toast = useToast();
  const fileInput = useRef(null);

  // The filters live in the web address (?q=...&category=...&stock=...)
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const stock = params.get('stock') || 'all';

  const query = new URLSearchParams({ q, category, stock }).toString();
  const { data: products, loading, reload } = useFetch(`/products?${query}`);
  const { data: categories, reload: reloadCategories } = useFetch('/categories');
  const { data: suppliers } = useFetch('/suppliers');

  const [editing, setEditing] = useState(null); // null = closed, {} = form open
  const [importResult, setImportResult] = useState(null);

  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value && value !== 'all') next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    try {
      const result = await api.delete(`/products/${product.product_id}`);
      toast.success(result.message);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleExport() {
    try {
      // Export ALL products, not only the filtered ones.
      exportProducts(await api.get('/products'));
    } catch (err) {
      toast.error(err.message);
    }
  }

  function handleFileChosen(event) {
    const file = event.target.files[0];
    event.target.value = ''; // so choosing the same file again still works
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rows = parseCSV(reader.result);
        const missing = PRODUCT_CSV_HEADERS.filter((h) => rows.length && !(h in rows[0]) && h !== 'category' && h !== 'supplier');
        if (missing.length) {
          toast.error(`CSV is missing these columns: ${missing.join(', ')}`);
          return;
        }
        const result = await api.post('/products/import', { rows });
        setImportResult(result);
        reload();
        reloadCategories();
      } catch (err) {
        toast.error(err.message);
      }
    };
    reader.readAsText(file);
  }

  return (
    <>
      <PageHeader title="Products" subtitle="Add, edit and search the items you sell">
        <button type="button" className="btn btn-outline" onClick={() => fileInput.current.click()}>
          <i className="bi bi-upload" /> Import CSV
        </button>
        <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={handleFileChosen} />
        <button type="button" className="btn btn-outline" onClick={handleExport}>
          <i className="bi bi-download" /> Export CSV
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({ ...EMPTY_PRODUCT })}>
          <i className="bi bi-plus-lg" /> Add product
        </button>
      </PageHeader>

      <section className="card">
        {/* Search + filters. A GET form: the values go into the address bar. */}
        <form className="filter-bar" role="search" method="get" onSubmit={(e) => e.preventDefault()}>
          <div className="field grow">
            <label htmlFor="f-search">Search</label>
            <input
              id="f-search"
              type="search"
              name="q"
              placeholder="Name or SKU…"
              value={q}
              onChange={(e) => setFilter('q', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="f-category">Category</label>
            <select id="f-category" value={category} onChange={(e) => setFilter('category', e.target.value)}>
              <option value="">All categories</option>
              {categories?.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-stock">Stock</label>
            <select id="f-stock" value={stock} onChange={(e) => setFilter('stock', e.target.value)}>
              <option value="all">All</option>
              <option value="in">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </div>
        </form>

        {!products && loading ? (
          <p className="page-loading">Loading products…</p>
        ) : products?.length === 0 ? (
          <EmptyState icon="bi-box-seam" title="No products found" text="Try a different search, or add a new product." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Supplier</th>
                  <th className="num">Cost</th>
                  <th className="num">Price</th>
                  <th className="num">Stock</th>
                  <th>Status</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {products?.map((p) => (
                  <tr key={p.product_id}>
                    <td><code>{p.sku}</code></td>
                    <td>
                      <strong>{p.name}</strong>
                      <span className="muted small block">{p.category_name || 'No category'}</span>
                    </td>
                    <td>{p.supplier_name || <span className="muted">—</span>}</td>
                    <td className="num">{money(p.cost_price)}</td>
                    <td className="num">{money(p.selling_price)}</td>
                    <td className="num">{p.quantity}</td>
                    <td><StockBadge product={p} /></td>
                    <td className="actions">
                      <button type="button" className="icon-btn" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button type="button" className="icon-btn danger" onClick={() => handleDelete(p)} aria-label={`Delete ${p.name}`}>
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <ProductForm
          product={editing}
          categories={categories || []}
          suppliers={suppliers || []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
            reloadCategories();
          }}
        />
      )}

      {importResult && (
        <Modal title="Import finished" onClose={() => setImportResult(null)}>
          <div className="modal-body">
            <p>
              <strong>{importResult.imported}</strong> product(s) imported.{' '}
              {importResult.errors.length > 0 && <strong className="text-danger">{importResult.errors.length} row(s) skipped:</strong>}
            </p>
            {importResult.errors.length > 0 && (
              <ul className="error-list">
                {importResult.errors.map((e) => (
                  <li key={e.row}>Line {e.row}: {e.message}</li>
                ))}
              </ul>
            )}
            <p className="muted small">
              Expected columns: <code>{PRODUCT_CSV_HEADERS.join(', ')}</code>. Tip: use “Export CSV” to get a ready template.
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-primary" onClick={() => setImportResult(null)}>Done</button>
          </div>
        </Modal>
      )}
    </>
  );
}

// The add / edit form (shown inside a modal)
function ProductForm({ product, categories, suppliers, onClose, onSaved }) {
  const isNew = !product.product_id;
  const [form, setForm] = useState({ ...product, supplier_id: product.supplier_id ?? '', category_name: product.category_name ?? '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isNew) await api.post('/products', form);
      else await api.put(`/products/${product.product_id}`, form);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? 'Add product' : 'Edit product'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <div className="alert alert-danger" role="alert">{error}</div>}

          <div className="form-grid">
            <div className="field span-2">
              <label htmlFor="p-name" className="required">Product name</label>
              <input id="p-name" name="name" value={form.name} onChange={handleChange} required />
            </div>

            <div className="field">
              <label htmlFor="p-sku" className="required">SKU</label>
              <input
                id="p-sku"
                name="sku"
                value={form.sku}
                onChange={handleChange}
                pattern="[A-Za-z0-9\-]+"
                title="Letters, numbers and dashes only"
                placeholder="e.g. EL-105"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="p-category">Category</label>
              {/* datalist: pick an existing category or type a new one */}
              <input id="p-category" name="category_name" value={form.category_name} onChange={handleChange} list="category-options" placeholder="Choose or type" />
              <datalist id="category-options">
                {categories.map((c) => <option key={c.category_id} value={c.category_name} />)}
              </datalist>
            </div>

            <div className="field">
              <label htmlFor="p-cost" className="required">Cost price (Rs)</label>
              <input id="p-cost" name="cost_price" type="number" min="0" step="0.01" value={form.cost_price} onChange={handleChange} required />
            </div>

            <div className="field">
              <label htmlFor="p-price" className="required">Selling price (Rs)</label>
              <input id="p-price" name="selling_price" type="number" min="0" step="0.01" value={form.selling_price} onChange={handleChange} required />
            </div>

            <div className="field">
              <label htmlFor="p-qty" className="required">Stock quantity</label>
              <input id="p-qty" name="quantity" type="number" min="0" step="1" value={form.quantity} onChange={handleChange} required />
            </div>

            <div className="field">
              <label htmlFor="p-threshold" className="required">Low stock level</label>
              <input id="p-threshold" name="low_stock_threshold" type="number" min="0" step="1" value={form.low_stock_threshold} onChange={handleChange} required />
            </div>

            <div className="field span-2">
              <label htmlFor="p-supplier">Supplier</label>
              <select id="p-supplier" name="supplier_id" value={form.supplier_id} onChange={handleChange}>
                <option value="">No supplier</option>
                {suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Add product' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
