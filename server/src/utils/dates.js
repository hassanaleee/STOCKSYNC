// Small helpers for dates. We store dates as text like "2026-10-26".

function pad(n) {
  return String(n).padStart(2, '0');
}

// Turn a Date object into "YYYY-MM-DD" using the local time zone.
export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today() {
  return toISODate(new Date());
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

export function isValidDate(text) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(text || ''));
}
