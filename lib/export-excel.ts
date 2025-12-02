// ============================================
// EXPORT EXCEL - CNC-Pilot
// ============================================

import * as XLSX from 'xlsx'

interface ExportOptions {
  filename?: string
  sheetName?: string
  title?: string
  companyName?: string
}

interface OrderData {
  order_number: string
  customer_name: string
  part_name?: string
  quantity?: number
  material?: string
  deadline?: string
  status?: string
  total_cost?: number
  material_cost?: number
  labor_cost?: number
  notes?: string
  created_at?: string
}

interface InventoryData {
  sku?: string
  name: string
  category?: string
  quantity: number
  unit: string
  location?: string
  low_stock_threshold?: number
  batch_number?: string
  created_at?: string
}

interface TimeLogData {
  order_number?: string
  user_name?: string
  start_time: string
  end_time?: string
  duration_hours?: number
  hourly_rate?: number
  total_cost?: number
  status?: string
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(date: string | Date | undefined): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pl-PL')
}

function formatDateTime(date: string | Date | undefined): string {
  if (!date) return ''
  return new Date(date).toLocaleString('pl-PL')
}

function getStatusLabel(status: string | undefined): string {
  const labels: Record<string, string> = {
    pending: 'Oczekujące',
    in_progress: 'W realizacji',
    completed: 'Zakończone',
    delayed: 'Opóźnione',
    cancelled: 'Anulowane',
    running: 'Trwa',
    paused: 'Wstrzymane',
  }
  return labels[status || ''] || status || ''
}

function addMetadata(ws: XLSX.WorkSheet, options: ExportOptions, dataStartRow: number): XLSX.WorkSheet {
  // Add title row
  if (options.title) {
    XLSX.utils.sheet_add_aoa(ws, [[options.title]], { origin: 'A1' })
  }

  // Add company name
  if (options.companyName) {
    XLSX.utils.sheet_add_aoa(ws, [[options.companyName]], { origin: 'A2' })
  }

  // Add generation date
  XLSX.utils.sheet_add_aoa(ws, [[`Wygenerowano: ${new Date().toLocaleString('pl-PL')}`]], {
    origin: `A${dataStartRow - 1}`,
  })

  return ws
}

function autoFitColumns(ws: XLSX.WorkSheet, data: unknown[][]): void {
  const colWidths: number[] = []

  data.forEach(row => {
    row.forEach((cell, colIndex) => {
      const cellLength = String(cell || '').length
      colWidths[colIndex] = Math.max(colWidths[colIndex] || 10, cellLength + 2)
    })
  })

  ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w, 50) }))
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

export function exportOrdersToExcel(orders: OrderData[], options: ExportOptions = {}): void {
  const headers = [
    'Nr zamówienia',
    'Klient',
    'Nazwa części',
    'Ilość',
    'Materiał',
    'Termin',
    'Status',
    'Koszt materiału',
    'Koszt pracy',
    'Wartość całkowita',
    'Uwagi',
    'Data utworzenia',
  ]

  const data = orders.map(order => [
    order.order_number,
    order.customer_name,
    order.part_name || '',
    order.quantity || '',
    order.material || '',
    formatDate(order.deadline),
    getStatusLabel(order.status),
    order.material_cost || '',
    order.labor_cost || '',
    order.total_cost || '',
    order.notes || '',
    formatDateTime(order.created_at),
  ])

  const allData = [headers, ...data]

  // Add summary row
  const totalValue = orders.reduce((sum, o) => sum + (o.total_cost || 0), 0)
  const totalMaterial = orders.reduce((sum, o) => sum + (o.material_cost || 0), 0)
  const totalLabor = orders.reduce((sum, o) => sum + (o.labor_cost || 0), 0)

  allData.push([])
  allData.push(['PODSUMOWANIE'])
  allData.push(['Liczba zamówień:', orders.length])
  allData.push(['Koszt materiałów:', totalMaterial, 'PLN'])
  allData.push(['Koszt pracy:', totalLabor, 'PLN'])
  allData.push(['Łączna wartość:', totalValue, 'PLN'])

  const ws = XLSX.utils.aoa_to_sheet(allData)
  autoFitColumns(ws, allData)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Zamówienia')

  XLSX.writeFile(wb, options.filename || 'zamowienia.xlsx')
}

export function exportInventoryToExcel(items: InventoryData[], options: ExportOptions = {}): void {
  const headers = [
    'SKU',
    'Nazwa',
    'Kategoria',
    'Ilość',
    'Jednostka',
    'Lokalizacja',
    'Min. stan',
    'Nr partii',
    'Status',
    'Data dodania',
  ]

  const data = items.map(item => [
    item.sku || '',
    item.name,
    item.category || '',
    item.quantity,
    item.unit,
    item.location || '',
    item.low_stock_threshold || '',
    item.batch_number || '',
    item.quantity <= (item.low_stock_threshold || 0) ? 'NISKI STAN' : 'OK',
    formatDateTime(item.created_at),
  ])

  const allData = [headers, ...data]

  // Add summary
  const lowStockCount = items.filter(i => i.quantity <= (i.low_stock_threshold || 0)).length

  allData.push([])
  allData.push(['PODSUMOWANIE'])
  allData.push(['Liczba pozycji:', items.length])
  allData.push(['Niski stan:', lowStockCount])

  const ws = XLSX.utils.aoa_to_sheet(allData)
  autoFitColumns(ws, allData)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Magazyn')

  XLSX.writeFile(wb, options.filename || 'magazyn.xlsx')
}

export function exportTimeLogsToExcel(logs: TimeLogData[], options: ExportOptions = {}): void {
  const headers = [
    'Zamówienie',
    'Pracownik',
    'Start',
    'Koniec',
    'Czas (godz.)',
    'Stawka/h',
    'Koszt',
    'Status',
  ]

  const data = logs.map(log => [
    log.order_number || '',
    log.user_name || '',
    formatDateTime(log.start_time),
    formatDateTime(log.end_time),
    log.duration_hours?.toFixed(2) || '',
    log.hourly_rate || '',
    log.total_cost?.toFixed(2) || '',
    getStatusLabel(log.status),
  ])

  const allData = [headers, ...data]

  // Add summary
  const totalHours = logs.reduce((sum, l) => sum + (l.duration_hours || 0), 0)
  const totalCost = logs.reduce((sum, l) => sum + (l.total_cost || 0), 0)

  allData.push([])
  allData.push(['PODSUMOWANIE'])
  allData.push(['Liczba wpisów:', logs.length])
  allData.push(['Łączny czas:', `${totalHours.toFixed(2)} godz.`])
  allData.push(['Łączny koszt:', `${totalCost.toFixed(2)} PLN`])

  const ws = XLSX.utils.aoa_to_sheet(allData)
  autoFitColumns(ws, allData)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Czas pracy')

  XLSX.writeFile(wb, options.filename || 'czas-pracy.xlsx')
}

// Generic export function
export function exportToExcel(
  data: Record<string, unknown>[],
  columns: { key: string; header: string; format?: (value: unknown) => string }[],
  options: ExportOptions = {}
): void {
  const headers = columns.map(col => col.header)
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key]
      return col.format ? col.format(value) : value ?? ''
    })
  )

  const allData = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(allData)
  autoFitColumns(ws, allData)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Dane')

  XLSX.writeFile(wb, options.filename || 'export.xlsx')
}

// Export to CSV (simpler format)
export function exportToCSV(
  data: Record<string, unknown>[],
  columns: { key: string; header: string; format?: (value: unknown) => string }[],
  filename = 'export.csv'
): void {
  const headers = columns.map(col => col.header)
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key]
      return col.format ? col.format(value) : value ?? ''
    })
  )

  const allData = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(allData)
  const csv = XLSX.utils.sheet_to_csv(ws)

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
