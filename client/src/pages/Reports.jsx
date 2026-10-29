import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { StatusBadge, StockBadge } from '../components/Badge.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../utils/api.js';
import { downloadCSV, exportProducts } from '../utils/csv.js';
import { daysAgoISO, formatDate, money, todayISO } from '../utils/format.js';

export default function Reports() {
  const toast = useToast();
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(todayISO());

  // Only ask the server when both dates are valid.
  const valid = from && to && from <= to;
  const { data: report, loading, error } = useFetch(valid ? `/reports/sales?from=${from}&to=${to}` : '/reports/sales');
  const { data: products } = useFetch('/products');

  const lowStock = products?.filter((p) => p.quantity <= p.low_stock_threshold) || [];

  function exportSales() {
    downloadCSV(
      `stocksync-sales-${report.from}-to-${report.to}.csv`,
      ['order_id', 'customer', 'date', 'status', 'total'],
      report.orders.map((o) => [o.order_id, o.customer_name, o.order_date, o.status, o.total_amount])
    );
  }

  async function exportAllProducts() {
    try {
      exportProducts(await api.get('/products'));
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="Sales summary and stock reports">
        <button type="button" className="btn btn-outline" onClick={exportAllProducts}>
          <i className="bi bi-download" /> Export products
        </button>
        <button type="button" className="btn btn-outline" onClick={exportSales} disabled={!report || !valid}>
          <i className="bi bi-download" /> Export sales
        </button>
      </PageHeader>

      <section className="card">
        <form className="filter-bar" onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label htmlFor="r-from">From</label>
            <input id="r-from" type="date" value={from} max={to || todayISO()} onChange={(e) => setFrom(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="r-to">To</label>
            <input id="r-to" type="date" value={to} min={from} max={todayISO()} onChange={(e) => setTo(e.target.value)} required />
          </div>
        </form>
      </section>

      {!valid && <div className="alert alert-warning">Please choose a valid date range.</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!report && loading && <p className="page-loading">Loading report…</p>}

      {report && valid && (
        <>
          <section className="stats-grid" aria-label="Sales summary">
            <StatCard icon="bi-cash-coin" label="Total sales" value={money(report.totalSales)} tone="success" />
            <StatCard icon="bi-bag-check" label="Orders" value={report.orderCount} />
            <StatCard icon="bi-box-seam" label="Products sold" value={report.unitsSold} hint="Total units" tone="info" />
            <StatCard
              icon="bi-receipt"
              label="Average order"
              value={money(report.orderCount ? report.totalSales / report.orderCount : 0)}
              tone="warning"
            />
          </section>

          <section className="grid-two">
            <article className="card">
              <header className="card-header"><h2>Product-wise sales</h2></header>
              {report.products.length === 0 ? (
                <EmptyState title="No sales in this period" />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Product</th><th className="num">Units sold</th><th className="num">Revenue</th></tr>
                    </thead>
                    <tbody>
                      {report.products.map((p) => (
                        <tr key={p.product_id}>
                          <td><strong>{p.name}</strong> <span className="muted small">{p.sku}</span></td>
                          <td className="num">{p.units_sold}</td>
                          <td className="num">{money(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article className="card">
              <header className="card-header"><h2>Revenue by product</h2></header>
              <div className="card-body chart-box">
                {report.products.length === 0 ? (
                  <EmptyState title="Nothing to chart" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={report.products.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                      <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--ink)', fontSize: 13 }}
                        formatter={(v) => [money(v), 'Revenue']}
                        cursor={{ fill: 'var(--bg-sunken)' }}
                      />
                      <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>
          </section>

          <section className="card">
            <header className="card-header"><h2>Orders in this period</h2></header>
            {report.orders.length === 0 ? (
              <EmptyState title="No orders in this period" />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th className="num">Total</th></tr>
                  </thead>
                  <tbody>
                    {report.orders.map((o) => (
                      <tr key={o.order_id}>
                        <td>#{o.order_id}</td>
                        <td>{o.customer_name}</td>
                        <td>{formatDate(o.order_date)}</td>
                        <td><StatusBadge status={o.status} /></td>
                        <td className="num">{money(o.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <section className="card">
        <header className="card-header"><h2>Current low-stock products</h2></header>
        {lowStock.length === 0 ? (
          <EmptyState icon="bi-check2-circle" title="No low-stock products" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>SKU</th><th className="num">In stock</th><th className="num">Low stock level</th><th>Status</th></tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.product_id}>
                    <td><strong>{p.name}</strong></td>
                    <td><code>{p.sku}</code></td>
                    <td className="num">{p.quantity}</td>
                    <td className="num">{p.low_stock_threshold}</td>
                    <td><StockBadge product={p} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
