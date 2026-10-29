import { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../utils/api.js';

const EMPTY_SUPPLIER = { name: '', phone: '', email: '', address: '' };

export default function Suppliers() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const { data: suppliers, loading, reload } = useFetch(`/suppliers?q=${encodeURIComponent(search)}`);
  const [editing, setEditing] = useState(null);

  async function handleDelete(supplier) {
    if (!window.confirm(`Delete supplier "${supplier.name}"?`)) return;
    try {
      const result = await api.delete(`/suppliers/${supplier.supplier_id}`);
      toast.success(result.message);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Suppliers" subtitle="The people and companies you buy stock from">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({ ...EMPTY_SUPPLIER })}>
          <i className="bi bi-plus-lg" /> Add supplier
        </button>
      </PageHeader>

      <section className="card">
        <form className="filter-bar" role="search" onSubmit={(e) => e.preventDefault()}>
          <div className="field grow">
            <label htmlFor="s-search">Search suppliers</label>
            <input id="s-search" type="search" placeholder="Name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </form>

        {!suppliers && loading ? (
          <p className="page-loading">Loading suppliers…</p>
        ) : suppliers?.length === 0 ? (
          <EmptyState icon="bi-truck" title="No suppliers found" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th className="num">Products</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {suppliers?.map((s) => (
                  <tr key={s.supplier_id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.phone || '—'}</td>
                    <td>{s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : '—'}</td>
                    <td>{s.address || '—'}</td>
                    <td className="num">{s.product_count}</td>
                    <td className="actions">
                      <button type="button" className="icon-btn" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button type="button" className="icon-btn danger" onClick={() => handleDelete(s)} aria-label={`Delete ${s.name}`}>
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
        <SupplierForm
          supplier={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            toast.success('Supplier saved');
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function SupplierForm({ supplier, onClose, onSaved }) {
  const isNew = !supplier.supplier_id;
  const [form, setForm] = useState({
    name: supplier.name || '', phone: supplier.phone || '', email: supplier.email || '', address: supplier.address || '',
  });
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
      if (isNew) await api.post('/suppliers', form);
      else await api.put(`/suppliers/${supplier.supplier_id}`, form);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? 'Add supplier' : 'Edit supplier'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          <div className="form-grid">
            <div className="field span-2">
              <label htmlFor="sup-name" className="required">Supplier name</label>
              <input id="sup-name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="field">
              <label htmlFor="sup-phone">Contact number</label>
              <input id="sup-phone" name="phone" type="tel" value={form.phone} onChange={handleChange} pattern="[0-9+\-\s()]{7,20}" title="Digits, spaces, + and - only" placeholder="0300-1234567" />
            </div>
            <div className="field">
              <label htmlFor="sup-email">Email</label>
              <input id="sup-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="sales@example.com" />
            </div>
            <div className="field span-2">
              <label htmlFor="sup-address">Address</label>
              <textarea id="sup-address" name="address" rows="3" value={form.address} onChange={handleChange} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save supplier'}</button>
        </div>
      </form>
    </Modal>
  );
}
