'use server'

import { createClient } from '@/lib/supabase-server'
import { upsertEmbedding } from './embeddings'
import { logger } from '@/lib/logger'

const DELAY_MS = 100 // Rate limiting between API calls

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================
// POPULATE PRODUCT EMBEDDINGS
// ============================================

export async function populateProductEmbeddings(companyId: string): Promise<number> {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, category, description, specifications')
    .eq('company_id', companyId)
    .eq('is_active', true)

  if (!products) return 0

  let count = 0
  for (const p of products) {
    const text = [
      `Produkt: ${p.name}`,
      `SKU: ${p.sku}`,
      `Kategoria: ${p.category}`,
      p.description ? `Opis: ${p.description}` : '',
      p.specifications ? `Specyfikacja: ${JSON.stringify(p.specifications)}` : '',
    ].filter(Boolean).join('. ')

    const ok = await upsertEmbedding({
      companyId,
      sourceType: 'product',
      sourceId: p.id,
      contentText: text,
      contentSummary: `${p.name} (${p.sku})`,
      metadata: { category: p.category, sku: p.sku },
    })
    if (ok) count++
    await delay(DELAY_MS)
  }

  logger.info('[embedding-pipeline] Products populated', { companyId, count })
  return count
}

// ============================================
// POPULATE ORDER EMBEDDINGS
// ============================================

export async function populateOrderEmbeddings(companyId: string): Promise<number> {
  const supabase = await createClient()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, part_name, material, quantity, status, selling_price, deadline, created_at')
    .eq('company_id', companyId)
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: false })

  if (!orders) return 0

  let count = 0
  for (const o of orders) {
    const text = [
      `Zamówienie: ${o.order_number}`,
      `Klient: ${o.customer_name}`,
      `Część: ${o.part_name}`,
      o.material ? `Materiał: ${o.material}` : '',
      `Ilość: ${o.quantity}`,
      `Status: ${o.status}`,
      o.selling_price ? `Cena: ${o.selling_price} PLN` : '',
      o.deadline ? `Termin: ${o.deadline}` : '',
    ].filter(Boolean).join('. ')

    const ok = await upsertEmbedding({
      companyId,
      sourceType: 'order',
      sourceId: o.id,
      contentText: text,
      contentSummary: `${o.order_number} — ${o.part_name} (${o.customer_name})`,
      metadata: { status: o.status, customer: o.customer_name },
    })
    if (ok) count++
    await delay(DELAY_MS)
  }

  logger.info('[embedding-pipeline] Orders populated', { companyId, count })
  return count
}

// ============================================
// POPULATE CUSTOMER EMBEDDINGS
// ============================================

export async function populateCustomerEmbeddings(companyId: string): Promise<number> {
  const supabase = await createClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('id, customer_name, material, selling_price, status, created_at')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')

  if (!orders) return 0

  // Aggregate per customer
  const customers = new Map<string, {
    orderCount: number
    totalRevenue: number
    materials: Set<string>
    lastOrder: string
  }>()

  for (const o of orders) {
    const existing = customers.get(o.customer_name)
    if (existing) {
      existing.orderCount++
      existing.totalRevenue += Number(o.selling_price) || 0
      if (o.material) existing.materials.add(o.material)
      if (o.created_at > existing.lastOrder) existing.lastOrder = o.created_at
    } else {
      customers.set(o.customer_name, {
        orderCount: 1,
        totalRevenue: Number(o.selling_price) || 0,
        materials: o.material ? new Set([o.material]) : new Set(),
        lastOrder: o.created_at,
      })
    }
  }

  let count = 0
  for (const [name, data] of customers) {
    const text = [
      `Klient: ${name}`,
      `Liczba zamówień: ${data.orderCount}`,
      `Przychód: ${data.totalRevenue.toFixed(2)} PLN`,
      `Materiały: ${[...data.materials].join(', ') || 'brak'}`,
      `Ostatnie zamówienie: ${data.lastOrder}`,
    ].join('. ')

    // Use a deterministic ID based on customer name
    const customerId = Buffer.from(`customer:${companyId}:${name}`).toString('base64').slice(0, 32)

    const ok = await upsertEmbedding({
      companyId,
      sourceType: 'customer',
      sourceId: customerId,
      contentText: text,
      contentSummary: `${name} (${data.orderCount} zamówień, ${data.totalRevenue.toFixed(0)} PLN)`,
      metadata: { orderCount: data.orderCount, totalRevenue: data.totalRevenue },
    })
    if (ok) count++
    await delay(DELAY_MS)
  }

  logger.info('[embedding-pipeline] Customers populated', { companyId, count })
  return count
}

// ============================================
// POPULATE MACHINE EMBEDDINGS
// ============================================

export async function populateMachineEmbeddings(companyId: string): Promise<number> {
  const supabase = await createClient()
  const { data: machines } = await supabase
    .from('machines')
    .select('id, name, machine_type, status, description, specifications')
    .eq('company_id', companyId)

  if (!machines) return 0

  let count = 0
  for (const m of machines) {
    const text = [
      `Maszyna: ${m.name}`,
      `Typ: ${m.machine_type}`,
      `Status: ${m.status}`,
      m.description ? `Opis: ${m.description}` : '',
      m.specifications ? `Specyfikacja: ${JSON.stringify(m.specifications)}` : '',
    ].filter(Boolean).join('. ')

    const ok = await upsertEmbedding({
      companyId,
      sourceType: 'machine',
      sourceId: m.id,
      contentText: text,
      contentSummary: `${m.name} (${m.machine_type})`,
      metadata: { type: m.machine_type, status: m.status },
    })
    if (ok) count++
    await delay(DELAY_MS)
  }

  logger.info('[embedding-pipeline] Machines populated', { companyId, count })
  return count
}
