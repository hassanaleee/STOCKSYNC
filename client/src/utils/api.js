// All communication with the Express server goes through this file.
// Usage:  const products = await api.get('/products');

export function getToken() {
  return localStorage.getItem('token');
}
export function saveToken(token) {
  localStorage.setItem('token', token);
}
export function clearToken() {
  localStorage.removeItem('token');
}

async function request(method, url, body) {
  const token = getToken();

  const response = await fetch('/api' + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Send the login token so the server knows who we are.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Token expired or invalid: clear it and go to the login page.
    if (response.status === 401 && token) {
      clearToken();
      window.location.href = '/login';
    }
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  delete: (url) => request('DELETE', url),
};
