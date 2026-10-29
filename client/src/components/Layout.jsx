import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Menu items. Each group becomes a heading + a list.
const MENU = [
  {
    heading: 'Main',
    links: [
      { to: '/', label: 'Dashboard', icon: 'bi-speedometer2', end: true },
      { to: '/products', label: 'Products', icon: 'bi-box-seam' },
      { to: '/inventory', label: 'Inventory', icon: 'bi-clipboard-data' },
      { to: '/orders', label: 'Orders', icon: 'bi-bag-check' },
    ],
  },
  {
    heading: 'Supply',
    links: [
      { to: '/suppliers', label: 'Suppliers', icon: 'bi-truck' },
      { to: '/purchase-orders', label: 'Purchase Orders', icon: 'bi-cart-plus' },
    ],
  },
  {
    heading: 'Insights',
    links: [{ to: '/reports', label: 'Reports', icon: 'bi-bar-chart-line' }],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'light');

  // Close the sidebar (on phones) whenever we go to another page.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Semantic HTML: aside = side content, nav = main navigation */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <NavLink to="/" className="brand">
          <img src="/logo.svg" alt="" width="32" height="32" />
          <span>StockSync</span>
        </NavLink>

        <nav aria-label="Main navigation">
          {MENU.map((group) => (
            <section key={group.heading}>
              <h2 className="nav-heading">{group.heading}</h2>
              <ul className="nav-list">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <NavLink to={link.to} end={link.end} className="nav-link">
                      <i className={`bi ${link.icon}`} aria-hidden="true" />
                      <span>{link.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
      </aside>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="app-body">
        <header className="topbar" id="app-header">
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <i className="bi bi-list" />
          </button>

          {/* A real GET form: submitting it opens /products?q=your-text */}
          <form className="topbar-search hide-mobile" role="search" action="/products" method="get">
            <i className="bi bi-search" aria-hidden="true" />
            <input type="search" name="q" placeholder="Search products by name or SKU…" aria-label="Search products" />
          </form>

          <div className="topbar-right">
            <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Switch light / dark theme">
              <i className={`bi ${theme === 'light' ? 'bi-moon-stars' : 'bi-sun'}`} />
            </button>

            {/* <details> gives us an open/close dropdown with no JavaScript */}
            <details className="user-menu">
              <summary>
                <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
                <span className="user-name hide-mobile">{user.name}</span>
                <i className="bi bi-chevron-down hide-mobile" aria-hidden="true" />
              </summary>
              <div className="dropdown">
                <p className="dropdown-info">
                  <strong>{user.name}</strong>
                  <span className="muted">{user.email}</span>
                </p>
                <button type="button" className="dropdown-item" onClick={logout}>
                  <i className="bi bi-box-arrow-right" /> Log out
                </button>
              </div>
            </details>
          </div>
        </header>

        <main id="main-content">
          <Outlet />
        </main>

        <footer className="site-footer">
          <p>
            © 2026 StockSync · Web Development project,{' '}
            {/* Absolute URL: full address with https:// and the domain */}
            <a href="https://lahore.comsats.edu.pk" target="_blank" rel="noreferrer">
              COMSATS University Lahore
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
