// Small helpers to show money and dates nicely.

export function money(value) {
  return 'Rs ' + Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// "2026-10-26" (today, in the local time zone)
export function todayISO() {
  return daysAgoISO(0);
}

export function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "2026-10-26" -> "26 Oct 2026"
export function formatDate(text) {
  if (!text) return '';
  const [y, m, d] = text.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Which badge colour belongs to which status.
export const STATUS_TONE = {
  Pending: 'warning',
  Processing: 'info',
  Completed: 'success',
  Cancelled: 'danger',
  Draft: 'secondary',
  Ordered: 'info',
  Received: 'success',
};
