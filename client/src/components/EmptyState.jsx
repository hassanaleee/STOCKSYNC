// Shown instead of a table when there is nothing to display.
export default function EmptyState({ icon = 'bi-inbox', title, text }) {
  return (
    <div className="empty-state">
      <i className={`bi ${icon}`} aria-hidden="true" />
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
    </div>
  );
}
