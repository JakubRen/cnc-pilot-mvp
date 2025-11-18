// Export utilities for CSV and PDF

import { saveAs } from 'file-saver';
import Papa from 'papaparse';

// Export data to CSV
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: Record<keyof T, string>
) {
  const csv = Papa.unparse(data, {
    header: true,
    columns: headers ? Object.keys(headers) : undefined,
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for UTF-8 BOM
  saveAs(blob, `${filename}.csv`);
}

// Format date for export
export function formatDateForExport(date: string | Date): string {
  return new Date(date).toLocaleDateString('pl-PL');
}

// Format currency for export
export function formatCurrencyForExport(amount: number, currency = 'PLN'): string {
  return `${amount.toFixed(2)} ${currency}`;
}

// Download JSON
export function downloadJSON(data: any, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  saveAs(blob, `${filename}.json`);
}
