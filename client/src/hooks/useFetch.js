import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../utils/api.js';

// Loads data from the API when the component appears (and again when the url changes).
//   const { data, loading, error, reload } = useFetch('/products');
export function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lastRequest = useRef(0);

  const load = useCallback(async () => {
    const thisRequest = ++lastRequest.current;
    setLoading(true);
    try {
      const result = await api.get(url);
      // Ignore the answer if a newer request was started meanwhile.
      if (thisRequest === lastRequest.current) {
        setData(result);
        setError('');
      }
    } catch (err) {
      if (thisRequest === lastRequest.current) setError(err.message);
    } finally {
      if (thisRequest === lastRequest.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
