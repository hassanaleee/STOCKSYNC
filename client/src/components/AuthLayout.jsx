import { Link } from 'react-router-dom';

// The two-column layout shared by the Login and Register pages.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-layout">
      <main className="auth-main">
        <Link className="auth-brand" to="/">
          <img src="/logo.svg" alt="StockSync logo" width="32" height="32" />
          <span>StockSync</span>
        </Link>

        <section className="auth-body">
          <header className="auth-heading">
            <h1>{title}</h1>
            <p className="muted">{subtitle}</p>
          </header>
          {children}
          <p className="auth-footnote">{footer}</p>
        </section>
      </main>

      <aside className="auth-aside">
        <div className="auth-aside-inner">
          <p className="auth-quote">One simple dashboard for your stock, orders and suppliers.</p>

          {/* An ordered list: the steps have a sequence */}
          <ol className="auth-steps">
            <li>Add your products and set a low-stock level.</li>
            <li>Record customer orders. Stock updates by itself.</li>
            <li>Restock from suppliers with purchase orders.</li>
            <li>Check sales in the reports page.</li>
          </ol>

          {/* A description list: term + value pairs */}
          <dl className="auth-stats">
            <div>
              <dt>7</dt>
              <dd>Modules</dd>
            </div>
            <div>
              <dt>0</dt>
              <dd>Overselling</dd>
            </div>
            <div>
              <dt>1</dt>
              <dd>Dashboard</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
