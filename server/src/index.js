import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import './db.js';
import { seedIfEmpty } from './seed.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import supplierRoutes from './routes/suppliers.js';
import orderRoutes from './routes/orders.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import reportRoutes from './routes/reports.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' })); // lets us read JSON sent by the browser

// Routes: each file handles one part of the app.
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', reportRoutes); // /api/dashboard and /api/reports/sales

// Unknown API address
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));

// Error handler: every "throw new HttpError(...)" ends up here.
app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

seedIfEmpty();

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`StockSync API running on http://localhost:${port}`);
});
