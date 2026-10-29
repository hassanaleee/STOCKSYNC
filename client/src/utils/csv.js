// Very small CSV helpers (no library needed).

// Turn rows into CSV text and download it as a file.
// headers: ['name', 'sku']   rows: [['Mouse', 'EL-1'], ...]
export function downloadCSV(filename, headers, rows) {
  const escape = (cell) => {
    const text = String(cell ?? '');
    // Wrap in quotes if the text has a comma, quote or new line.
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers, ...rows].map((row) => row.map(escape).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Turn CSV text into a list of objects using the first line as keys.
// "name,sku\nMouse,EL-1"  ->  [{ name: 'Mouse', sku: 'EL-1' }]
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  text = text.replace(/^\uFEFF/, ''); // remove the invisible BOM that Excel adds

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const filled = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (filled.length === 0) return [];

  const keys = filled[0].map((k) => k.trim().toLowerCase());
  return filled.slice(1).map((r) => Object.fromEntries(keys.map((key, i) => [key, (r[i] ?? '').trim()])));
}

// The column order used for both export and import of products.
export const PRODUCT_CSV_HEADERS = [
  'name',
  'sku',
  'category',
  'supplier',
  'cost_price',
  'selling_price',
  'quantity',
  'low_stock_threshold',
];

export function exportProducts(products) {
  downloadCSV(
    'stocksync-products.csv',
    PRODUCT_CSV_HEADERS,
    products.map((p) => [
      p.name,
      p.sku,
      p.category_name,
      p.supplier_name,
      p.cost_price,
      p.selling_price,
      p.quantity,
      p.low_stock_threshold,
    ])
  );
}
