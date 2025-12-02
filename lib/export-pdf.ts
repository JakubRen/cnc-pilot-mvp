// ============================================
// EXPORT PDF - CNC-Pilot
// ============================================

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Rozszerzenie typu jsPDF dla autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number
    }
  }
}

interface ExportOptions {
  title: string
  subtitle?: string
  companyName?: string
  generatedBy?: string
  filename?: string
}

interface OrderData {
  order_number: string
  customer_name: string
  part_name?: string
  quantity?: number
  deadline?: string
  status?: string
  total_cost?: number
  material?: string
}

interface InventoryData {
  sku?: string
  name: string
  category?: string
  quantity: number
  unit: string
  location?: string
  low_stock_threshold?: number
}

interface TimeLogData {
  order_number?: string
  user_name?: string
  start_time: string
  end_time?: string
  duration_hours?: number
  hourly_rate?: number
  total_cost?: number
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(date: string | Date | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pl-PL')
}

function formatDateTime(date: string | Date | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleString('pl-PL')
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return '-'
  return `${value.toFixed(2)} PLN`
}

function getStatusLabel(status: string | undefined): string {
  const labels: Record<string, string> = {
    pending: 'Oczekujące',
    in_progress: 'W realizacji',
    completed: 'Zakończone',
    delayed: 'Opóźnione',
    cancelled: 'Anulowane',
  }
  return labels[status || ''] || status || '-'
}

function addHeader(doc: jsPDF, options: ExportOptions) {
  const pageWidth = doc.internal.pageSize.getWidth()

  // Logo/Title
  doc.setFontSize(20)
  doc.setTextColor(59, 130, 246) // blue-500
  doc.text('CNC-Pilot', 14, 20)

  // Company name
  if (options.companyName) {
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139) // slate-500
    doc.text(options.companyName, 14, 28)
  }

  // Title
  doc.setFontSize(16)
  doc.setTextColor(30, 41, 59) // slate-800
  doc.text(options.title, 14, 42)

  // Subtitle
  if (options.subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(options.subtitle, 14, 50)
  }

  // Date
  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text(`Wygenerowano: ${new Date().toLocaleString('pl-PL')}`, pageWidth - 14, 20, { align: 'right' })

  if (options.generatedBy) {
    doc.text(`Przez: ${options.generatedBy}`, pageWidth - 14, 26, { align: 'right' })
  }

  return 55 // Return Y position after header
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()

    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Strona ${i} z ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
    doc.text('© CNC-Pilot', 14, pageHeight - 10)
  }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

export function exportOrdersToPDF(orders: OrderData[], options: ExportOptions): void {
  const doc = new jsPDF()
  const startY = addHeader(doc, options)

  const tableData = orders.map(order => [
    order.order_number,
    order.customer_name,
    order.part_name || '-',
    order.quantity?.toString() || '-',
    formatDate(order.deadline),
    getStatusLabel(order.status),
    formatCurrency(order.total_cost),
  ])

  autoTable(doc, {
    startY,
    head: [['Nr zamówienia', 'Klient', 'Część', 'Ilość', 'Termin', 'Status', 'Wartość']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25, halign: 'right' },
    },
  })

  // Summary
  const totalValue = orders.reduce((sum, o) => sum + (o.total_cost || 0), 0)
  const finalY = doc.lastAutoTable?.finalY || startY + 20

  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text(`Razem zamówień: ${orders.length}`, 14, finalY + 10)
  doc.text(`Łączna wartość: ${formatCurrency(totalValue)}`, 14, finalY + 18)

  addFooter(doc)
  doc.save(options.filename || 'zamowienia.pdf')
}

export function exportInventoryToPDF(items: InventoryData[], options: ExportOptions): void {
  const doc = new jsPDF()
  const startY = addHeader(doc, options)

  const tableData = items.map(item => [
    item.sku || '-',
    item.name,
    item.category || '-',
    `${item.quantity} ${item.unit}`,
    item.location || '-',
    item.low_stock_threshold ? `${item.low_stock_threshold} ${item.unit}` : '-',
    item.quantity <= (item.low_stock_threshold || 0) ? '⚠️ Niski' : '✓ OK',
  ])

  autoTable(doc, {
    startY,
    head: [['SKU', 'Nazwa', 'Kategoria', 'Stan', 'Lokalizacja', 'Min. stan', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
  })

  // Summary
  const lowStockCount = items.filter(i => i.quantity <= (i.low_stock_threshold || 0)).length
  const finalY = doc.lastAutoTable?.finalY || startY + 20

  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text(`Razem pozycji: ${items.length}`, 14, finalY + 10)
  doc.text(`Niski stan: ${lowStockCount}`, 14, finalY + 18)

  addFooter(doc)
  doc.save(options.filename || 'magazyn.pdf')
}

export function exportTimeLogsToPDF(logs: TimeLogData[], options: ExportOptions): void {
  const doc = new jsPDF()
  const startY = addHeader(doc, options)

  const tableData = logs.map(log => [
    log.order_number || '-',
    log.user_name || '-',
    formatDateTime(log.start_time),
    formatDateTime(log.end_time),
    log.duration_hours?.toFixed(2) || '-',
    formatCurrency(log.hourly_rate),
    formatCurrency(log.total_cost),
  ])

  autoTable(doc, {
    startY,
    head: [['Zamówienie', 'Pracownik', 'Start', 'Koniec', 'Godz.', 'Stawka/h', 'Koszt']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
  })

  // Summary
  const totalHours = logs.reduce((sum, l) => sum + (l.duration_hours || 0), 0)
  const totalCost = logs.reduce((sum, l) => sum + (l.total_cost || 0), 0)
  const finalY = doc.lastAutoTable?.finalY || startY + 20

  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text(`Razem wpisów: ${logs.length}`, 14, finalY + 10)
  doc.text(`Łączny czas: ${totalHours.toFixed(2)} godz.`, 14, finalY + 18)
  doc.text(`Łączny koszt: ${formatCurrency(totalCost)}`, 14, finalY + 26)

  addFooter(doc)
  doc.save(options.filename || 'czas-pracy.pdf')
}

// Generic table export
export function exportTableToPDF(
  data: Record<string, unknown>[],
  columns: { key: string; header: string; format?: (value: unknown) => string }[],
  options: ExportOptions
): void {
  const doc = new jsPDF()
  const startY = addHeader(doc, options)

  const headers = columns.map(col => col.header)
  const tableData = data.map(row =>
    columns.map(col => {
      const value = row[col.key]
      return col.format ? col.format(value) : String(value ?? '-')
    })
  )

  autoTable(doc, {
    startY,
    head: [headers],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
  })

  addFooter(doc)
  doc.save(options.filename || 'export.pdf')
}
