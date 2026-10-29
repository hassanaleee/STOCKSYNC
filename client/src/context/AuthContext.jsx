import { createContext, useContext, useEffect, useState } from 'react';
import { api, clearToken, getToken, saveToken } from '../utils/api.js';

// Context = a way to share data (here: the logged-in user) with every component
// without passing props down again and again.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // When the page loads, check if we already have a valid token (stay logged in after refresh).
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    saveToken(data.token);
    setUser(data.user);
  }

  async function register(name, email, password) {
    const data = await api.post('/auth/register', { name, email, password });
    saveToken(data.token);
    setUser(data.user);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
