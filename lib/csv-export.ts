/**
 * CSV Export Utilities
 * Converts data to CSV format and triggers browser download
 */

export interface OrderExportData {
  order_number: string;
  customer_name: string;
  part_name?: string | null;
  quantity?: number | null;
  material?: string | null;
  deadline: string;
  status: string;
  total_cost?: number | null;
  created_at?: string;
  notes?: string | null;
}

/**
 * Converts array of orders to CSV format
 */
export function convertOrdersToCSV(orders: OrderExportData[]): string {
  if (orders.length === 0) {
    return 'Brak danych do eksportu';
  }

  // CSV Headers (Polish)
  const headers = [
    'Numer zamówienia',
    'Klient',
    'Nazwa części',
    'Ilość',
    'Materiał',
    'Termin',
    'Status',
    'Koszt (PLN)',
    'Data utworzenia',
    'Notatki',
  ];

  // Convert headers to CSV row
  const headerRow = headers.join(',');

  // Convert orders to CSV rows
  const dataRows = orders.map((order) => {
    return [
      escapeCSVValue(order.order_number),
      escapeCSVValue(order.customer_name),
      escapeCSVValue(order.part_name || '-'),
      order.quantity ?? '-',
      escapeCSVValue(order.material || '-'),
      formatDate(order.deadline),
      translateStatus(order.status),
      order.total_cost ? order.total_cost.toFixed(2) : '-',
      order.created_at ? formatDate(order.created_at) : '-',
      escapeCSVValue(order.notes || '-'),
    ].join(',');
  });

  // Combine headers and data
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Escapes CSV values (handles commas, quotes, newlines)
 */
function escapeCSVValue(value: string): string {
  if (!value) return '';

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Formats date to Polish format (DD.MM.YYYY)
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Translates status to Polish
 */
function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    pending: 'Oczekujące',
    in_progress: 'W realizacji',
    completed: 'Ukończone',
    delayed: 'Opóźnione',
    cancelled: 'Anulowane',
  };
  return translations[status] || status;
}

/**
 * Triggers browser download of CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for proper Excel UTF-8 encoding
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Main export function - converts orders to CSV and downloads
 */
export function exportOrdersToCSV(orders: OrderExportData[], filename?: string): void {
  const csvContent = convertOrdersToCSV(orders);

  // Generate filename with current date
  const date = new Date();
  const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const defaultFilename = `zamowienia_${dateString}.csv`;

  downloadCSV(csvContent, filename || defaultFilename);
}
