import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/errors.js';

// Put this before any route that needs a logged-in user.
// The browser sends:  Authorization: Bearer <token>
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) throw new HttpError(401, 'Please log in first');

  try {
    // If the token is fake or expired, jwt.verify throws an error.
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    throw new HttpError(401, 'Your session has expired. Please log in again');
  }
}
