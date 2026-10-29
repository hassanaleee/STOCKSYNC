import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/errors.js';

const router = express.Router();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Make a token that is valid for 7 days. It stores the user's id and name.
function makeToken(user) {
  return jwt.sign(
    { user_id: user.user_id, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Never send the password hash back to the browser.
function publicUser(user) {
  return { user_id: user.user_id, name: user.name, email: user.email };
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  // Server-side validation (HTML5 validation in the browser can be bypassed).
  if (name.length < 2) throw new HttpError(400, 'Please enter your name');
  if (!emailPattern.test(email)) throw new HttpError(400, 'Please enter a valid email address');
  if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');

  const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email);
  if (existing) throw new HttpError(409, 'An account with this email already exists');

  // Hash the password. We never store the real password.
  const passwordHash = bcrypt.hashSync(password, 10);

  const result = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, passwordHash);

  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(result.lastInsertRowid);
  res.status(201).json({ token: makeToken(user), user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Same message for "no such email" and "wrong password" (safer).
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HttpError(401, 'Incorrect email or password');
  }

  res.json({ token: makeToken(user), user: publicUser(user) });
});

// GET /api/auth/me  (needs a token) - the frontend uses this to stay logged in after refresh
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.user_id);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  res.json({ user: publicUser(user) });
});

export default router;
