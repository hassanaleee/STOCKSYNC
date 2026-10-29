import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { formatDate, money } from '../utils/format.js';

const STATUS_COLORS = { Pending: '#d97706', Processing: '#0891b2', Completed: '#16a34a', Cancelled: '#dc2626' };
const tooltipStyle = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--ink)',
  fontSize: 13,
};

export default function Dashboard() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const { data, loading, error } = useFetch(`/dashboard?days=${days}`);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <p className="page-loading">{loading ? 'Loading dashboard…' : ''}</p>;

  // "2026-10-26" -> "26 Oct" for the chart axis
  const chartData = data.salesByDay.map((d) => ({ ...d, label: formatDate(d.date).slice(0, -5) }));

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Sales and stock summary for the last ${days} days`}>
        <div className="field-inline">
          <label htmlFor="period">Period</label>
          <select id="period" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </PageHeader>

      {/* Welcome card: the picture is "floated" so the text wraps around it */}
      <article className="card welcome clearfix">
        <img src="/images/welcome.svg" alt="Illustration of stacked boxes" width="140" height="122" />
        <h2>Welcome back, {user.name.split(' ')[0]}!</h2>
        <p>
          {data.pendingOrders > 0
            ? `You have ${data.pendingOrders} pending order${data.pendingOrders > 1 ? 's' : ''} waiting to be processed.`
            : 'All orders are processed. Nice work.'}{' '}
          {data.lowStock > 0
            ? `${data.lowStock} product${data.lowStock > 1 ? 's are' : ' is'} low on stock or sold out.`
            : 'Your stock levels look healthy.'}
        </p>
        <div className="quick-links">
          <Link to="/orders" className="btn btn-primary">
            <i className="bi bi-plus-lg" /> New order
          </Link>
          <Link to="/products" className="btn btn-outline">
            <i className="bi bi-box-seam" /> Products
          </Link>
          <Link to="/purchase-orders" className="btn btn-outline">
            <i className="bi bi-cart-plus" /> Restock
          </Link>
        </div>
      </article>

      <section className="stats-grid" aria-label="Summary">
        <StatCard icon="bi-box-seam" label="Active products" value={data.totalProducts} />
        <StatCard icon="bi-hourglass-split" label="Pending orders" value={data.pendingOrders} tone="warning" />
        <StatCard icon="bi-exclamation-triangle" label="Low stock" value={data.lowStock} tone="danger" hint="Includes sold out" />
        <StatCard
          icon="bi-cash-coin"
          label={`Sales (${days} days)`}
          value={money(data.totalSales)}
          hint={`${data.salesOrders} orders`}
          tone="success"
        />
      </section>

      <section className="grid-two">
        <article className="card">
          <header className="card-header">
            <h2>Sales overview</h2>
          </header>
          <div className="card-body chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [money(v), 'Sales']} />
                <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} fill="url(#salesFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card">
          <header className="card-header">
            <h2>Order status</h2>
          </header>
          <div className="card-body chart-box">
            {data.statusCounts.length === 0 ? (
              <EmptyState title="No orders yet" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.statusCounts} dataKey="count" nameKey="status" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
                      {data.statusCounts.map((s) => (
                        <Cell key={s.status} fill={STATUS_COLORS[s.status]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="legend">
                  {data.statusCounts.map((s) => (
                    <li key={s.status}>
                      <span className="legend-dot" style={{ background: STATUS_COLORS[s.status] }} />
                      {s.status} <strong>{s.count}</strong>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </article>
      </section>

      <section className="grid-three">
        <article className="card">
          <header className="card-header">
            <h2>Top selling products</h2>
          </header>
          <div className="card-body chart-box">
            {data.topProducts.length === 0 ? (
              <EmptyState title="No sales in this period" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.topProducts} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Units sold']} cursor={{ fill: 'var(--bg-sunken)' }} />
                  <Bar dataKey="sold" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="card">
          <header className="card-header">
            <h2>Low stock alerts</h2>
            <Link to="/inventory">View all</Link>
          </header>
          {data.lowStockProducts.length === 0 ? (
            <EmptyState icon="bi-check2-circle" title="Nothing is running low" />
          ) : (
            <ul className="list">
              {data.lowStockProducts.map((p) => (
                <li key={p.product_id}>
                  <div>
                    <strong>{p.name}</strong>
                    <span className="muted small">{p.sku}</span>
                  </div>
                  <span className={p.quantity === 0 ? 'text-danger' : 'text-warning'}>
                    {p.quantity === 0 ? 'Sold out' : `${p.quantity} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card">
          <header className="card-header">
            <h2>Recent orders</h2>
            <Link to="/orders">View all</Link>
          </header>
          {data.recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <ul className="list">
              {data.recentOrders.map((o) => (
                <li key={o.order_id}>
                  <div>
                    <strong>{o.customer_name}</strong>
                    <span className="muted small">
                      #{o.order_id} · {formatDate(o.order_date)}
                    </span>
                  </div>
                  <div className="list-right">
                    <span>{money(o.total_amount)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </>
  );
}
