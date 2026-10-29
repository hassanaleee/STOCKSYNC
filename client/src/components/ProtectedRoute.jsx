import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Wrap a page with this and it can only be opened after login.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="page-loading">Loading…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// The opposite: login / register pages are not shown to someone already logged in.
export function PublicOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <p className="page-loading">Loading…</p>;
  if (user) return <Navigate to="/" replace />;
  return children;
}
