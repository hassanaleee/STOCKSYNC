import { useEffect } from 'react';

// A pop-up window. Put the form or content inside it as children.
export default function Modal({ title, onClose, wide = false, children }) {
  // Close when the Escape key is pressed.
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        // Close only when the dark background itself is clicked.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
