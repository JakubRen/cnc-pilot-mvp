import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { randomUUID } from 'crypto'
import ExcelJS from 'exceljs'

// In-memory store for generated files (1h TTL)
const fileStore = new Map<string, { buffer: Buffer; name: string; expiresAt: number }>()

function storeFile(name: string, buffer: Buffer): string {
  const fileId = randomUUID()
  fileStore.set(fileId, { buffer, name, expiresAt: Date.now() + 3600000 })
  // Cleanup expired entries
  for (const [key, val] of fileStore) {
    if (val.expiresAt < Date.now()) fileStore.delete(key)
  }
  return fileId
}

export function getStoredFile(fileId: string) {
  const entry = fileStore.get(fileId)
  if (!entry || entry.expiresAt < Date.now()) {
    fileStore.delete(fileId)
    return null
  }
  return entry
}

interface ReportResult {
  type: 'report'
  reportName: string
  rowCount: number
  summary: string
  csvUrl: string
  reportPageUrl: string
}

function emptyReport(name: string, pageUrl: string): ReportResult {
  return { type: 'report', reportName: name, rowCount: 0, summary: 'Brak danych', csvUrl: '', reportPageUrl: pageUrl }
}

// ============================================
// Excel builder helper
// ============================================
async function buildXlsx(
  sheetName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  columnWidths?: number[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'CNC-Pilot Express'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(sheetName)

  // Header row
  sheet.addRow(headers)
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } } // violet-600
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 24

  // Data rows
  for (const row of rows) {
    sheet.addRow(row.map(v => v ?? ''))
  }

  // Zebra striping
  for (let i = 2; i <= rows.length + 1; i++) {
    const row = sheet.getRow(i)
    if (i % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } } // violet-50
    }
    row.alignment = { vertical: 'middle' }
  }

  // Column widths — auto or provided
  sheet.columns.forEach((col, idx) => {
    if (columnWidths && columnWidths[idx]) {
      col.width = columnWidths[idx]
    } else {
      // Auto-width: max of header length and longest data value
      const headerLen = headers[idx]?.length || 10
      let maxLen = headerLen
      for (const row of rows) {
        const val = row[idx]
        const len = val != null ? String(val).length : 0
        if (len > maxLen) maxLen = len
      }
      col.width = Math.min(Math.max(maxLen + 2, 10), 40)
    }
  })

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }]

  // Auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

// ============================================
// Status translation
// ============================================
const STATUS_PL: Record<string, string> = {
  pending: 'Oczekujące',
  in_progress: 'W realizacji',
  completed: 'Ukończone',
  delayed: 'Opóźnione',
  cancelled: 'Anulowane',
}

function statusPL(status: string | null | undefined): string {
  return status ? (STATUS_PL[status] || status) : ''
}

// ============================================
// Report 1: Orders
// ============================================
export async function generateOrdersReport(
  companyId: string,
  params: { status?: string; customer_name?: string; date_from?: string; date_to?: string }
): Promise<ReportResult> {
  const supabase = await createClient()
  let q = supabase
    .from('orders')
    .select('order_number, customer_name, part_name, material, quantity, status, deadline, selling_price, total_cost, margin_percent, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (params.status) q = q.eq('status', params.status)
  if (params.customer_name) q = q.ilike('customer_name', `%${params.customer_name}%`)
  if (params.date_from) q = q.gte('created_at', params.date_from)
  if (params.date_to) q = q.lte('created_at', params.date_to)

  const { data: orders, error } = await q
  if (error) { logger.error('[report-tools] orders error', { error }); return emptyReport('Zamówienia', '/reports/orders') }

  const rows = orders || []
  const totalValue = rows.reduce((sum, o) => sum + (Number(o.selling_price) || 0), 0)

  const headers = ['Nr zamówienia', 'Klient', 'Część', 'Materiał', 'Ilość', 'Status', 'Termin', 'Cena sprzedaży', 'Koszt', 'Marża %', 'Data utworzenia']
  const dataRows = rows.map(o => [
    o.order_number, o.customer_name, o.part_name, o.material,
    Number(o.quantity) || 0, statusPL(o.status), o.deadline?.slice(0, 10) || '',
    Number(o.selling_price) || 0, Number(o.total_cost) || 0,
    Number(o.margin_percent) || 0, o.created_at?.slice(0, 10) || '',
  ])

  const buffer = await buildXlsx('Zamówienia', headers, dataRows)

  const filterDesc = [params.status, params.customer_name, params.date_from].filter(Boolean).join(', ') || 'wszystkie'
  const fileId = storeFile(`zamowienia_${filterDesc}.xlsx`, buffer)

  const queryParams = new URLSearchParams()
  if (params.status) queryParams.set('status', params.status)

  return {
    type: 'report',
    reportName: `Zamówienia (${filterDesc})`,
    rowCount: rows.length,
    summary: `${rows.length} zamówień, łączna wartość: ${totalValue.toFixed(2)} PLN`,
    csvUrl: `/api/ai/reports/${fileId}`,
    reportPageUrl: `/reports/orders${queryParams.toString() ? '?' + queryParams : ''}`,
  }
}

// ============================================
// Report 2: Inventory
// ============================================
export async function generateInventoryReport(
  companyId: string,
  params: { category?: string; low_stock_only?: boolean }
): Promise<ReportResult> {
  const supabase = await createClient()
  let q = supabase
    .from('products')
    .select('name, sku, category, unit, manufacturer, inventory_locations(location_code, quantity, available_quantity, low_stock_threshold)')
    .eq('company_id', companyId)
    .eq('is_active', true)

  if (params.category) q = q.eq('category', params.category)

  const { data: products, error } = await q
  if (error) { logger.error('[report-tools] inventory error', { error }); return emptyReport('Magazyn', '/reports/inventory') }

  let rows = (products || []).map(p => {
    const locs = (p.inventory_locations as Array<{ location_code: string; quantity: number; available_quantity: number; low_stock_threshold: number }>) || []
    const totalQty = locs.reduce((s, l) => s + (Number(l.quantity) || 0), 0)
    const available = locs.reduce((s, l) => s + (Number(l.available_quantity) || 0), 0)
    const threshold = locs[0]?.low_stock_threshold || 0
    const isLow = threshold > 0 && available <= threshold
    const location = locs.map(l => l.location_code).filter(Boolean).join(', ')
    return { name: p.name, sku: p.sku, category: p.category, unit: p.unit, manufacturer: p.manufacturer, totalQty, available, threshold, isLow, location }
  })

  if (params.low_stock_only) rows = rows.filter(r => r.isLow)

  const lowCount = rows.filter(r => r.isLow).length
  const headers = ['Nazwa', 'SKU', 'Kategoria', 'Jednostka', 'Producent', 'Ilość', 'Dostępne', 'Próg niski', 'Niski stan', 'Lokalizacja']
  const dataRows = rows.map(r => [
    r.name, r.sku, r.category, r.unit, r.manufacturer,
    r.totalQty, r.available, r.threshold, r.isLow ? 'TAK' : '', r.location,
  ])

  const buffer = await buildXlsx('Magazyn', headers, dataRows)
  const fileId = storeFile('magazyn.xlsx', buffer)

  return {
    type: 'report',
    reportName: params.low_stock_only ? 'Magazyn — niskie stany' : 'Magazyn',
    rowCount: rows.length,
    summary: `${rows.length} produktów${lowCount > 0 ? `, ${lowCount} z niskim stanem` : ''}`,
    csvUrl: `/api/ai/reports/${fileId}`,
    reportPageUrl: '/reports/inventory',
  }
}

// ============================================
// Report 3: Costs
// ============================================
export async function generateCostsReport(
  companyId: string,
  params: { date_from?: string; date_to?: string }
): Promise<ReportResult> {
  const supabase = await createClient()
  let q = supabase
    .from('orders')
    .select('order_number, customer_name, part_name, quantity, status, material_cost, labor_cost, overhead_cost, total_cost, selling_price, margin_percent, margin_amount, estimated_hours')
    .eq('company_id', companyId)
    .not('total_cost', 'is', null)
    .order('created_at', { ascending: false })

  if (params.date_from) q = q.gte('created_at', params.date_from)
  if (params.date_to) q = q.lte('created_at', params.date_to)

  const { data: orders, error } = await q
  if (error) { logger.error('[report-tools] costs error', { error }); return emptyReport('Koszty', '/reports/costs') }

  const rows = orders || []
  const totalCost = rows.reduce((s, o) => s + (Number(o.total_cost) || 0), 0)
  const totalRevenue = rows.reduce((s, o) => s + (Number(o.selling_price) || 0), 0)
  const totalProfit = totalRevenue - totalCost

  const headers = ['Nr zamówienia', 'Klient', 'Część', 'Ilość', 'Status', 'Materiał PLN', 'Robocizna PLN', 'Narzut PLN', 'Koszt PLN', 'Cena sprzedaży PLN', 'Marża %', 'Zysk PLN', 'Szac. godziny']
  const dataRows = rows.map(o => [
    o.order_number, o.customer_name, o.part_name,
    Number(o.quantity) || 0, statusPL(o.status),
    Number(o.material_cost) || 0, Number(o.labor_cost) || 0, Number(o.overhead_cost) || 0,
    Number(o.total_cost) || 0, Number(o.selling_price) || 0,
    Number(o.margin_percent) || 0, Number(o.margin_amount) || 0,
    Number(o.estimated_hours) || 0,
  ])

  const buffer = await buildXlsx('Koszty', headers, dataRows)
  const period = params.date_from || params.date_to ? `${params.date_from || '...'} — ${params.date_to || '...'}` : 'cały okres'
  const fileId = storeFile(`koszty_${period}.xlsx`, buffer)

  return {
    type: 'report',
    reportName: `Koszty (${period})`,
    rowCount: rows.length,
    summary: `${rows.length} zamówień. Koszty: ${totalCost.toFixed(0)} PLN, przychód: ${totalRevenue.toFixed(0)} PLN, zysk: ${totalProfit.toFixed(0)} PLN`,
    csvUrl: `/api/ai/reports/${fileId}`,
    reportPageUrl: '/reports/costs',
  }
}

// ============================================
// Report 4: Customer History
// ============================================
export async function generateCustomerReport(
  companyId: string,
  params: { customer_name: string }
): Promise<ReportResult> {
  const supabase = await createClient()
  const { data: orders, error } = await supabase
    .from('orders')
    .select('order_number, part_name, material, quantity, status, deadline, selling_price, total_cost, margin_percent, created_at')
    .eq('company_id', companyId)
    .ilike('customer_name', `%${params.customer_name}%`)
    .order('created_at', { ascending: false })

  if (error) { logger.error('[report-tools] customer error', { error }); return emptyReport(`Klient: ${params.customer_name}`, '/customers') }

  const rows = orders || []
  const totalRevenue = rows.reduce((s, o) => s + (Number(o.selling_price) || 0), 0)
  const materials = [...new Set(rows.map(o => o.material).filter(Boolean))]

  const headers = ['Nr zamówienia', 'Część', 'Materiał', 'Ilość', 'Status', 'Termin', 'Cena sprzedaży', 'Koszt', 'Marża %', 'Data']
  const dataRows = rows.map(o => [
    o.order_number, o.part_name, o.material,
    Number(o.quantity) || 0, statusPL(o.status), o.deadline?.slice(0, 10) || '',
    Number(o.selling_price) || 0, Number(o.total_cost) || 0,
    Number(o.margin_percent) || 0, o.created_at?.slice(0, 10) || '',
  ])

  const buffer = await buildXlsx(`Klient ${params.customer_name}`, headers, dataRows)
  const fileId = storeFile(`klient_${params.customer_name}.xlsx`, buffer)

  return {
    type: 'report',
    reportName: `Historia klienta: ${params.customer_name}`,
    rowCount: rows.length,
    summary: `${rows.length} zamówień, przychód: ${totalRevenue.toFixed(0)} PLN, materiały: ${materials.join(', ') || 'brak'}`,
    csvUrl: `/api/ai/reports/${fileId}`,
    reportPageUrl: '/customers',
  }
}

// ============================================
// Report 5: Deadlines
// ============================================
export async function generateDeadlinesReport(
  companyId: string,
  params: { days_ahead?: number }
): Promise<ReportResult> {
  const supabase = await createClient()
  const daysAhead = params.days_ahead ?? 14
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)

  const { data: orders, error } = await supabase
    .from('orders')
    .select('order_number, customer_name, part_name, quantity, status, deadline, selling_price, estimated_hours')
    .eq('company_id', companyId)
    .in('status', ['pending', 'in_progress'])
    .lte('deadline', cutoff.toISOString().slice(0, 10))
    .order('deadline', { ascending: true })

  if (error) { logger.error('[report-tools] deadlines error', { error }); return emptyReport('Zagrożone terminy', '/reports/orders') }

  const rows = orders || []
  const now = new Date()
  const overdue = rows.filter(o => new Date(o.deadline) < now).length

  const headers = ['Nr zamówienia', 'Klient', 'Część', 'Ilość', 'Status', 'Termin', 'Dni do terminu', 'Cena', 'Szac. godziny']
  const dataRows = rows.map(o => {
    const days = Math.ceil((new Date(o.deadline).getTime() - now.getTime()) / 86400000)
    return [
      o.order_number, o.customer_name, o.part_name,
      Number(o.quantity) || 0, statusPL(o.status), o.deadline?.slice(0, 10) || '',
      days, Number(o.selling_price) || 0, Number(o.estimated_hours) || 0,
    ]
  })

  const buffer = await buildXlsx('Zagrożone terminy', headers, dataRows)
  const fileId = storeFile('zagr_terminy.xlsx', buffer)

  return {
    type: 'report',
    reportName: `Zagrożone terminy (${daysAhead} dni)`,
    rowCount: rows.length,
    summary: `${rows.length} zamówień z terminem w ${daysAhead} dni${overdue > 0 ? `, ${overdue} przeterminowanych` : ''}`,
    csvUrl: `/api/ai/reports/${fileId}`,
    reportPageUrl: '/reports/orders',
  }
}
