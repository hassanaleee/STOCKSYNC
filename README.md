# StockSync

Inventory and Order Management System for small online sellers.
Web Development project - React + Node.js/Express + SQL database.

## How to run

You need **Node.js 20 or newer** (check with `node -v`). Open a terminal in this folder:

```
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

* `npm install` installs everything (root, server and client) in one go.
* `npm run dev` starts the API (port 4000) and the React app (port 5173) together.
* Demo login: **demo@stocksync.com** / **demo123** (or create your own on the Register page).
* The database file `server/stocksync.db` is created automatically with sample data.
  To start again from scratch, stop the app, delete that file and run `npm run dev` again.

## Folder structure

```
stocksync/
  server/                 Backend (Node.js + Express + SQLite)
    src/index.js            starts the server, connects the route files
    src/db.js               creates the tables
    src/seed.js             demo data for the first run
    src/middleware/auth.js  checks the login token (JWT)
    src/routes/             one file per feature: auth, products, orders, ...
  client/                 Frontend (React + Vite)
    src/pages/              one file per page (Login, Dashboard, Products, ...)
    src/components/         reusable parts (Layout, Modal, Badge, ...)
    src/context/            logged-in user + toast messages
    src/styles/             all CSS (base, layout, components, auth)
```

## What is working

* **Authentication**: register, login, logout, passwords hashed with bcrypt, JWT token, protected pages.
* **Dashboard**: totals, sales chart, order-status chart, top products, low-stock list, recent orders.
* **Products**: add / edit / delete, search, filter by category and stock, unique SKU, CSV import and export.
* **Inventory**: stock levels, low-stock warnings, manual adjustments, low-stock level per product.
* **Orders**: create / edit (while Pending), Pending -> Processing -> Completed, Cancel.
  Stock is taken out on Processing and given back if a Processing order is cancelled.
  An order cannot be processed if stock is not enough.
* **Suppliers**: add / edit / delete / search, products linked to suppliers.
* **Purchase orders**: Draft -> Ordered -> Received. Receiving adds stock, only once.
* **Reports**: date range, total sales, orders, units sold, product-wise table, CSV export.

## Differences from the proposal (be ready to explain)

* **Database**: SQLite instead of PostgreSQL, so nothing extra has to be installed.
  The tables and relations are the same as in the proposal's database design.
  Only `server/src/db.js` and the `db.prepare(...)` calls would change to move to PostgreSQL.
* **Backend** is Node.js + Express (as in the proposal), not FastAPI.
* **Charts** use Recharts, **icons** use Bootstrap Icons, **UI design** is based on the Metis template.
* Roles (admin / staff) are listed under "future enhancements" in the proposal, so they are not included.

See `LECTURE_CONCEPTS.md` for where each lecture concept is used.
