// A small box with an icon, a label and a big number (used on Dashboard and Reports).
export default function StatCard({ icon, label, value, hint, tone = 'primary' }) {
  return (
    <article className="stat-card">
      <span className={`stat-icon tone-${tone}`}>
        <i className={`bi ${icon}`} aria-hidden="true" />
      </span>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {hint && <p className="stat-hint muted">{hint}</p>}
      </div>
    </article>
  );
}
