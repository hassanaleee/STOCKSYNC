import { createContext, useCallback, useContext, useState } from 'react';

// Small pop-up messages ("Product saved") shown in the top-right corner.
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message, type }]);
    // Remove it again after 4 seconds.
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);

  const toast = {
    success: (message) => show(message, 'success'),
    error: (message) => show(message, 'danger'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-area" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status">
            <i className={`bi ${t.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
