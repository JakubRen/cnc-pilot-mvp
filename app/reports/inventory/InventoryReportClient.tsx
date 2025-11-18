'use client';

import { useState } from 'react';
import { exportToCSV } from '@/lib/reports/export-utils';
import type { InventoryReportData } from '@/lib/reports/inventory-report';

interface Props {
  items: InventoryReportData[];
  summary: any;
  categories: string[];
}

export default function InventoryReportClient({ items, summary, categories }: Props) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Apply filters
  let filteredItems = items;

  if (categoryFilter !== 'all') {
    filteredItems = filteredItems.filter((i) => i.category === categoryFilter);
  }

  if (lowStockOnly) {
    filteredItems = filteredItems.filter((i) => i.quantity < i.low_stock_threshold);
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredItems = filteredItems.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        i.sku.toLowerCase().includes(query)
    );
  }

  const handleExport = () => {
    const exportData = filteredItems.map((item) => ({
      'SKU': item.sku,
      'Nazwa': item.name,
      'Kategoria': item.category,
      'Ilość': item.quantity,
      'Jednostka': item.unit,
      'Próg niskiego stanu': item.low_stock_threshold,
      'Lokalizacja': item.location || '-',
      'Numer partii': item.batch_number || '-',
      'Utworzono': new Date(item.created_at).toLocaleDateString('pl-PL'),
      'Utworzone przez': item.creator_name || 'Unknown',
    }));

    exportToCSV(exportData, `magazyn_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div>
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">Wszystkie pozycje</p>
            <p className="text-2xl font-bold text-white">{summary.total_items}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">Niski stan</p>
            <p className="text-2xl font-bold text-red-400">{summary.low_stock_count}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">Kategorie</p>
            <p className="text-2xl font-bold text-blue-400">{summary.categories}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">Wartość całkowita</p>
            <p className="text-2xl font-bold text-green-400">-</p>
            <p className="text-xs text-slate-500 mt-1">Wymaga danych o kosztach</p>
          </div>
        </div>
      )}

      {/* Filters & Export */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Category Filter */}
          <div>
            <label className="text-slate-400 text-sm mr-2">Kategoria:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Wszystkie</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Low Stock Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="lowStockToggle"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
            />
            <label htmlFor="lowStockToggle" className="text-slate-300 text-sm cursor-pointer">
              Tylko niski stan
            </label>
          </div>

          {/* Search Input */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Szukaj po nazwie lub SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Nazwa
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Kategoria
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Ilość
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Próg
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Lokalizacja
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Partia
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredItems.map((item) => {
                const isLowStock = item.quantity < item.low_stock_threshold;
                return (
                  <tr key={item.id} className="hover:bg-slate-700/50 transition">
                    <td className="px-4 py-3 text-white font-mono text-sm">
                      {item.sku}
                    </td>
                    <td className="px-4 py-3 text-white">{item.name}</td>
                    <td className="px-4 py-3 text-slate-300">{item.category}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${
                          isLowStock ? 'text-red-400' : 'text-white'
                        }`}
                      >
                        {item.quantity} {item.unit}
                      </span>
                      {isLowStock && (
                        <span className="ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded">
                          Niski stan
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {item.low_stock_threshold} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {item.location || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-sm">
                      {item.batch_number || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-400">Brak pozycji spełniających kryteria filtrowania</p>
          </div>
        )}

        {/* Count */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-700">
          <p className="text-slate-400 text-sm">
            Wyświetlono <span className="text-white font-semibold">{filteredItems.length}</span> pozycji
          </p>
        </div>
      </div>
    </div>
  );
}
