'use server'

import { createClient } from '@/lib/supabase-server'
import { createHash } from 'crypto'
import { upsertEmbedding } from './embeddings'
import { logger } from '@/lib/logger'

const DELAY_MS = 100 // Rate limiting between API calls

function deterministicUUID(input: string): string {
  const hash = createHash('md5').update(input).digest('hex')
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================
// POPULATE PRODUCT EMBEDDINGS (enriched)
// ============================================

export async function populateProductEmbeddings(companyId: string): Promise<number> {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, category, description, specifications, unit, default_unit_cost, manufacturer')
    .eq('company_id', companyId)
    .eq('is_active', true)

  if (!products?.length) return 0

  // Fetch inventory locations for stock levels
  const productIds = products.map(p => p.id)
  const { data: locations } = await supabase
    .from('inventory_locations')
    .select('product_id, location_code, quantity, available_quantity, low_stock_threshold')
    .in('product_id', productIds)

  // Map locations by product_id
  const locationMap = new Map<string, typeof locations>()
  for (const loc of locations || []) {
    const arr = locationMap.get(loc.product_id) || []
    arr.push(loc)
    locationMap.set(loc.product_id, arr)
  }

  let count = 0
  for (const p of products) {
    const locs = locationMap.get(p.id) || []
    const totalQty = locs.reduce((sum, l) => sum + Number(l.quantity || 0), 0)
    const totalAvailable = locs.reduce((sum, l) => sum + Number(l.available_quantity || 0), 0)
    const isLowStock = locs.some(l => l.low_stock_threshold && Number(l.available_quantity) <= Number(l.low_stock_threshold))
    const locationCodes = locs.map(l => l.location_code).filter(Boolean)

    const text = [
      `Produkt: ${p.name}`,
      `SKU: ${p.sku}`,
      `Kategoria: ${p.category}`,
      p.unit ? `Jednostka: ${p.unit}` : '',
      p.default_unit_cost ? `Cena jednostkowa: ${p.default_unit_cost} PLN` : '',
      p.manufacturer ? `Producent: ${p.manufacturer}` : '',
      totalQty > 0 ? `Stan magazynowy: ${totalQty} (dostępne: ${totalAvailable})` : 'Stan magazynowy: brak',
      isLowStock ? 'UWAGA: Niski stan magazynowy!' : '',
      locationCodes.length ? `Lokalizacja: ${locationCodes.join(', ')}` : '',
      p.description ? `Opis: ${p.description}` : '',
      p.specifications ? `Specyfikacja: ${JSON.stringify(p.specifications)}` : '',
    ].filter(Boolean).join('. ')

    const stockInfo = totalQty > 0 ? `, stan: ${totalAvailable}${isLowStock ? ' NISKI' : ''}` : ''
    const ok = await upsertEmbedding({
      companyId,
      sourceType: 'product',
      sourceId: p.id,
      contentText: text,
      contentSummary: `${p.name} (${p.sku}${stockInfo})`,
      metadata: { category: p.category, sku: p.sku, quantity: totalQty, available: totalAvailable, lowStock: isLowStock },
    })
    if (ok) count++
    await delay(DELAY_MS)
  }

  logger.info('[embedding-pipeline] Products populated', { companyId, count })
  return count
}

// ============================================
// POPULATE ORDER EMBEDDINGS (enriched)
// ============================================

export async function populateOrderEmbeddings(companyId: string): Promise<number> {
  const supabase = await createClient()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, part_name, material, quantity, status, selling_price, deadline, created_at, notes, material_cost, labor_cost, overhead_cost, total_cost, margin_percent, estimated_hours')
    .eq('company_id', companyId)
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: false })

  if (!orders?.length) return 0

  // Fetch order items for all orders
  const orderIds = orders.map(o => o.id)
  const { data: allItems } = await supabase
    .from('order_items')
    .select('order_id, part_name, quantity, material')
    .in('order_id', orderIds)

  const itemsMap = new Map<string, typeof allItems>()
  for (const item of allItems || []) {
    const arr = itemsMap.get(item.order_id) || []
    arr.push(item)
    itemsMap.set(item.order_id, arr)
  }

  let count = 0
  for (const o of orders) {
    const items = itemsMap.get(o.id) || []
    const now = new Date()
    const deadlineDate = o.deadline ? new Date(o.deadline) : null
    const daysUntilDeadline = deadlineDate ? Math.ceil((deadlineDate.getTime() - now.getTime()) / 86400000) : null
    const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0 && o.status !== 'completed' && o.status !== 'cancelled'
    const isUrgent = daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 3 && o.status !== 'completed'

    const timelineInfo = deadlineDate
      ? isOverdue ? `PRZETERMINOWANE (${Math.abs(daysUntilDeadline!)} dni po terminie)`
      : isUrgent ? `PILNE (${daysUntilDeadline} dni do terminu)`
      : `${daysUntilDeadline} dni do terminu`
      : ''

    const costBreakdown = o.total_cost
      ? [
          o.material_cost ? `materiał: ${o.material_cost} PLN` : '',
          o.labor_cost ? `robocizna: ${o.labor_cost} PLN` : '',
          o.overhead_cost ? `narzut: ${o.overhead_cost} PLN` : '',
          `razem: ${o.total_cost} PLN`,
          o.selling_price ? `cena sprzedaży: ${o.selling_price} PLN` : '',
          o.margin_percent ? `marża: ${o.margin_percent}%` : '',
        ].filter(Boolean).join(', ')
      : ''

    const itemsList = items.length > 1
      ? `Pozycje (${items.length}): ${items.map(i => `${i.part_name} x${i.quantity}${i.material ? ` [${i.material}]` : ''}`).join('; ')}`
      : ''

    const text = [
      `Zamówienie: ${o.order_number}`,
      `Klient: ${o.customer_name}`,
      `Część: ${o.part_name}`,
      o.material ? `Materiał: ${o.material}` : '',
      `Ilość: ${o.quantity}`,
      `Status: ${o.status}`,
      timelineInfo ? `Termin: ${o.deadline} (${timelineInfo})` : '',
      o.estimated_hours ? `Szacowany czas: ${o.estimated_hours}h` : '',
      costBreakdown ? `Koszty: ${costBreakdown}` : '',
      itemsList,
      o.notes ? `Notatki: ${o.notes}` : '',
    ].filter(Boolean).join('. ')

    const statusEmoji = isOverdue ? ' PRZETERMINOWANE' : isUrgent ? ' PILNE' : ''
    const ok = await upsertEmbedding({
      companyId,
      sourceType: 'order',
      sourceId: o.id,
      contentText: text,
      contentSummary: `${o.order_number} — ${o.part_name} (${o.customer_name})${statusEmoji}`,
      metadata: { status: o.status, customer: o.customer_name, sellingPrice: Number(o.selling_price) || 0, totalCost: Number(o.total_cost) || 0 },
    })
    if (ok) count++
    await delay(DELAY_MS)
  }

  logger.info('[embedding-pipeline] Orders populated', { companyId, count })
  return count
}

// ============================================
// POPULATE CUSTOMER EMBEDDINGS (enriched)
// ============================================

export async function populateCustomerEmbeddings(companyId: string): Promise<number> {
  const supabase = await createClient()

  // Fetch customer records
  const { data: customerRecords } = await supabase
    .from('customers')
    .select('id, name, email, phone, nip, city, notes')
    .eq('company_id', companyId)

  // Fetch orders for aggregation
  const { data: orders } = await supabase
    .from('orders')
    .select('id, customer_name, material, selling_price, total_cost, status, deadline, created_at')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')

  if (!orders) return 0

  // Aggregate per customer
  const customers = new Map<string, {
    orderCount: number
    totalRevenue: number
    totalCost: number
    materials: Set<string>
    lastOrder: string
    firstOrder: string
    statuses: Map<string, number>
    overdueCount: number
  }>()

  const now = new Date()
  for (const o of orders) {
    const existing = customers.get(o.customer_name)
    const isOverdue = o.deadline && new Date(o.deadline) < now && o.status !== 'completed'

    if (existing) {
      existing.orderCount++
      existing.totalRevenue += Number(o.selling_price) || 0
      existing.totalCost += Number(o.total_cost) || 0
      if (o.material) existing.materials.add(o.material)
      if (o.created_at > existing.lastOrder) existing.lastOrder = o.created_at
      if (o.created_at < existing.firstOrder) existing.firstOrder = o.created_at
      existing.statuses.set(o.status, (existing.statuses.get(o.status) || 0) + 1)
      if (isOverdue) existing.overdueCount++
    } else {
      customers.set(o.customer_name, {
        orderCount: 1,
        totalRevenue: Number(o.selling_price) || 0,
        totalCost: Number(o.total_cost) || 0,
        materials: o.material ? new Set([o.material]) : new Set(),
        lastOrder: o.created_at,
        firstOrder: o.created_at,
        statuses: new Map([[o.status, 1]]),
        overdueCount: isOverdue ? 1 : 0,
      })
    }
  }

  // Map customer records by name for contact info
  const contactMap = new Map<string, (typeof customerRecords extends (infer T)[] | null ? T : never)>()
  for (const c of customerRecords || []) {
    contactMap.set(c.name, c)
  }

  let count = 0
  for (const [name, data] of customers) {
    const contact = contactMap.get(name)
    const avgOrderValue = data.orderCount > 0 ? data.totalRevenue / data.orderCount : 0
    const daysBetweenFirstAndLast = (new Date(data.lastOrder).getTime() - new Date(data.firstOrder).getTime()) / 86400000
    const orderFrequencyDays = data.orderCount > 1 ? Math.round(daysBetweenFirstAndLast / (data.orderCount - 1)) : 0

    const text = [
      `Klient: ${name}`,
      contact?.email ? `Email: ${contact.email}` : '',
      contact?.phone ? `Telefon: ${contact.phone}` : '',
      contact?.nip ? `NIP: ${contact.nip}` : '',
      contact?.city ? `Miasto: ${contact.city}` : '',
      `Liczba zamówień: ${data.orderCount}`,
      `Przychód: ${data.totalRevenue.toFixed(2)} PLN`,
      `Średnia wartość zamówienia: ${avgOrderValue.toFixed(2)} PLN`,
      orderFrequencyDays > 0 ? `Częstotliwość: co ~${orderFrequencyDays} dni` : '',
      `Materiały: ${[...data.materials].join(', ') || 'brak'}`,
      `Statusy: ${Array.from(data.statuses.entries()).map(([s, n]) => `${s}: ${n}`).join(', ')}`,
      data.overdueCount > 0 ? `UWAGA: ${data.overdueCount} przeterminowanych zamówień` : '',
      `Ostatnie zamówienie: ${data.lastOrder}`,
      contact?.notes ? `Notatki: ${contact.notes}` : '',
    ].filter(Boolean).join('. ')

    const customerId = contact?.id || deterministicUUID(`customer:${companyId}:${name}`)
    const freqInfo = orderFrequencyDays > 0 ? `, co ~${orderFrequencyDays} dni` : ''

    const ok = await upsertEmbedding({
      companyId,
      sourceType: 'customer',
      sourceId: customerId,
      contentText: text,
      contentSummary: `${name} (${data.orderCount} zamówień, ${data.totalRevenue.toFixed(0)} PLN${freqInfo})`,
      metadata: { orderCount: data.orderCount, totalRevenue: data.totalRevenue, avgOrderValue, materials: [...data.materials] },
    })
    if (ok) count++
    await delay(DELAY_MS)
  }

  logger.info('[embedding-pipeline] Customers populated', { companyId, count })
  return count
}

// ============================================
// POPULATE MACHINE EMBEDDINGS (enriched)
// ============================================

export async function populateMachineEmbeddings(companyId: string): Promise<number> {
  const supabase = await createClient()
  const { data: machines } = await supabase
    .from('machines')
    .select('id, name, code, manufacturer, model, serial_number, status, location, specifications, notes, next_maintenance_date, last_maintenance_date')
    .eq('company_id', companyId)

  if (!machines?.length) return 0

  // Fetch maintenance logs
  const machineIds = machines.map(m => m.id)
  const { data: logs } = await supabase
    .from('maintenance_logs')
    .select('machine_id, status, total_cost, completed_at')
    .in('machine_id', machineIds)
    .eq('status', 'completed')

  const logMap = new Map<string, { count: number; totalCost: number; lastDate: string }>()
  for (const log of logs || []) {
    const existing = logMap.get(log.machine_id)
    if (existing) {
      existing.count++
      existing.totalCost += Number(log.total_cost) || 0
      if (log.completed_at && log.completed_at > existing.lastDate) existing.lastDate = log.completed_at
    } else {
      logMap.set(log.machine_id, {
        count: 1,
        totalCost: Number(log.total_cost) || 0,
        lastDate: log.completed_at || '',
      })
    }
  }

  const now = new Date()
  let count = 0
  for (const m of machines) {
    const maint = logMap.get(m.id)
    const nextMaint = m.next_maintenance_date ? new Date(m.next_maintenance_date) : null
    const daysToMaint = nextMaint ? Math.ceil((nextMaint.getTime() - now.getTime()) / 86400000) : null
    const maintOverdue = daysToMaint !== null && daysToMaint < 0

    const maintInfo = maintOverdue
      ? `UWAGA: Przegląd przeterminowany (${Math.abs(daysToMaint!)} dni)`
      : daysToMaint !== null && daysToMaint <= 14
      ? `Przegląd za ${daysToMaint} dni (${m.next_maintenance_date})`
      : m.next_maintenance_date ? `Następny przegląd: ${m.next_maintenance_date}` : ''

    const text = [
      `Maszyna: ${m.name}`,
      m.code ? `Kod: ${m.code}` : '',
      m.manufacturer ? `Producent: ${m.manufacturer}` : '',
      m.model ? `Model: ${m.model}` : '',
      m.serial_number ? `Nr seryjny: ${m.serial_number}` : '',
      `Status: ${m.status}`,
      m.location ? `Lokalizacja: ${m.location}` : '',
      maintInfo,
      maint ? `Wykonane przeglądy: ${maint.count} (koszt: ${maint.totalCost.toFixed(0)} PLN)` : '',
      maint?.lastDate ? `Ostatni przegląd: ${maint.lastDate.slice(0, 10)}` : '',
      m.specifications ? `Specyfikacja: ${JSON.stringify(m.specifications)}` : '',
      m.notes ? `Notatki: ${m.notes}` : '',
    ].filter(Boolean).join('. ')

    const maintStatus = maintOverdue ? ' PRZEGLĄD!' : ''
    const ok = await upsertEmbedding({
      companyId,
      sourceType: 'machine',
      sourceId: m.id,
      contentText: text,
      contentSummary: `${m.name}${m.code ? ` (${m.code})` : ''} — ${m.status}${maintStatus}`,
      metadata: { manufacturer: m.manufacturer, model: m.model, status: m.status, location: m.location },
    })
    if (ok) count++
    await delay(DELAY_MS)
  }

  logger.info('[embedding-pipeline] Machines populated', { companyId, count })
  return count
}

// ============================================
// CNC DOMAIN KNOWLEDGE ENTRIES
// ============================================

function getCncKnowledgeEntries(): Array<{ id: string; text: string; summary: string }> {
  return [
    // Materiały
    {
      id: 'mat-stal-konstrukcyjna',
      text: 'Stal konstrukcyjna (S235, S355, C45) — najpopularniejszy materiał w CNC. Dobra obrabialność, tania. S235 do konstrukcji ogólnych, C45 do wałków/osi (hartowalna). Parametry skrawania: Vc 150-250 m/min (węgliki), posuw 0.1-0.3 mm/obr. Chłodzenie: emulsja lub sucho.',
      summary: 'Stal konstrukcyjna — S235, S355, C45 — parametry skrawania',
    },
    {
      id: 'mat-stal-nierdzewna',
      text: 'Stal nierdzewna (1.4301/AISI 304, 1.4404/AISI 316) — trudniejsza w obróbce, klei się do narzędzia. Vc 120-180 m/min przy węglikach, 30-50 m/min przy HSS. Posuw 0.08-0.2 mm/obr. ZAWSZE obfite chłodzenie emulsją. Uwaga: utwardza się przy zbyt małym posuwie — lepiej wchodzić odważnie. Narzędzia z powłoką TiAlN.',
      summary: 'Stal nierdzewna 1.4301/304 — parametry, chłodzenie, wskazówki',
    },
    {
      id: 'mat-aluminium',
      text: 'Aluminium (6061-T6, 7075-T6, 2017A) — łatwe w obróbce, szybkie. 6061 do ogólnych zastosowań, 7075 lotnicze (twarde ale kruche). Vc 300-1000 m/min, posuw 0.1-0.5 mm/obr. Chłodzenie: sprężone powietrze lub emulsja. Uwaga na narost na ostrzu — ostra geometria narzędzia, polerowane rowki wiórowe.',
      summary: 'Aluminium 6061/7075 — szybka obróbka, parametry, narost',
    },
    {
      id: 'mat-mosiadz',
      text: 'Mosiądz (CuZn39Pb3, CuZn37) — idealny do automatów tokarskich, doskonała obrabialność. Vc 200-400 m/min, posuw 0.05-0.3 mm/obr. Obróbka na sucho lub minimalne smarowanie. Drobny wiór, gładka powierzchnia. Stosowany w armaturze, złączkach, elementach dekoracyjnych.',
      summary: 'Mosiądz — doskonała obrabialność, armatura, złączki',
    },
    {
      id: 'mat-braz',
      text: 'Brąz (CuSn8, CuAl10) — twardy, odporny na ścieranie. Stosowany w łożyskach, tulejach, ślimakach. Vc 100-200 m/min, posuw 0.1-0.25 mm/obr. Brąz aluminiowy trudniejszy — wymaga sztywnego mocowania. Chłodzenie: emulsja.',
      summary: 'Brąz — łożyska, tuleje, parametry skrawania',
    },
    {
      id: 'mat-tworzywa',
      text: 'Tworzywa sztuczne CNC (POM/Delrin, PA6, PEEK, PTFE/Teflon) — POM najłatwiejszy, precyzyjne detale. PEEK drogi ale wytrzymały termicznie. Vc 200-500 m/min, posuw 0.05-0.2 mm/obr. ZAWSZE ostre narzędzia (tępe = topienie). Bez chłodziwa lub sprężone powietrze. Uwaga na odkształcenia termiczne.',
      summary: 'Tworzywa sztuczne CNC — POM, PA6, PEEK — wskazówki',
    },
    // Operacje
    {
      id: 'op-toczenie',
      text: 'Toczenie CNC — obróbka detali obrotowych (wałki, tuleje, flansże). Typy: toczenie zewnętrzne, wewnętrzne (wytaczanie), planowanie czoła, rowkowanie, gwintowanie. Kluczowe parametry: Vc (prędkość skrawania), fn (posuw na obrót), ap (głębokość skrawania). Centrum tokarskie z napędzanymi narzędziami pozwala na frezowanie i wiercenie bez przepinania.',
      summary: 'Toczenie CNC — wałki, tuleje, parametry, centra tokarskie',
    },
    {
      id: 'op-frezowanie',
      text: 'Frezowanie CNC — obróbka powierzchni płaskich, kieszeni, konturów, 3D. Typy: frezowanie czołowe, walcowe, kieszeni, konturowe, 3D/5-osiowe. Parametry: Vc, fz (posuw na ząb), ap (głębokość), ae (szerokość). Frezowanie współbieżne daje lepszą powierzchnię niż przeciwbieżne. HSM (High Speed Machining) — mały ap, duży ae, wysoka Vc.',
      summary: 'Frezowanie CNC — typy, parametry, HSM, współbieżne',
    },
    {
      id: 'op-wiercenie',
      text: 'Wiercenie CNC — otwory przelotowe i nieprzelotowe. Wiertła: HSS (do fi 13mm tanio), węglikowe (precyzja, szybkość), z chłodzeniem wewnętrznym (głębokie otwory). Rozwiercanie dla tolerancji H7. Gwintowanie: gwintownik, frez do gwintów (elastyczniejszy). Pogłębianie: stożkowe, walcowe.',
      summary: 'Wiercenie i gwintowanie CNC — typy wierteł, rozwiercanie',
    },
    {
      id: 'op-szlifowanie',
      text: 'Szlifowanie CNC — wykończenie powierzchni, tolerancje IT5-IT7. Szlifowanie okrągłe (wałki), płaskie (płaszczyzny), bezkłowe (serie). Ściernice: elektrokorund (stal), węglik krzemu (żeliwo, aluminium), CBN (stal hartowana), diament (węgliki). Prędkość ściernicy: 30-35 m/s. Zawsze obfite chłodzenie.',
      summary: 'Szlifowanie CNC — tolerancje, ściernice, wykończenie',
    },
    // Tolerancje i jakość
    {
      id: 'info-tolerancje',
      text: 'Tolerancje w obróbce CNC — standardowe: +/-0.1 mm (IT12). Precyzyjne: +/-0.05 mm (IT9-IT10). Wysokiej precyzji: +/-0.01 mm (IT6-IT7, wymaga szlifowania). Tolerancje geometryczne (okrągłość, prostopadłość, współosiowość) podawane osobno. Im ciaśniejsza tolerancja, tym wyższy koszt — każdy rząd dokładności to ~2x cena. Zawsze pytaj klienta czy naprawdę potrzebuje IT6.',
      summary: 'Tolerancje CNC — klasy IT, koszty, rekomendacje',
    },
    {
      id: 'info-chropowatosc',
      text: 'Chropowatość powierzchni CNC — Ra 6.3 (toczenie zgrubne), Ra 3.2 (toczenie wykańczające), Ra 1.6 (dobre wykończenie frezarskie), Ra 0.8 (szlifowanie), Ra 0.4 (szlifowanie precyzyjne), Ra 0.1-0.2 (polerowanie). Standard dla CNC bez specyfikacji: Ra 1.6-3.2. Lepsza chropowatość = mniejszy posuw + ostrzejsze narzędzie.',
      summary: 'Chropowatość Ra — wartości typowe dla CNC',
    },
    // Czasy i wyceny
    {
      id: 'info-lead-time',
      text: 'Typowe czasy realizacji zamówień CNC: proste detale (1-5 szt) 3-5 dni roboczych, średnia złożoność (1-50 szt) 5-10 dni, złożone/5-osiowe 10-15 dni, serie >100 szt 10-20 dni. Ekspres (+50-100% ceny): 1-3 dni. Na czas wpływa: dostępność materiału, obłożenie maszyn, obróbka cieplna (dodatkowe 3-5 dni), anodowanie/pokrycia (2-5 dni).',
      summary: 'Czasy realizacji CNC — proste, złożone, ekspres',
    },
    {
      id: 'info-koszty',
      text: 'Struktura kosztów CNC: materiał (20-40%), czas maszynowy (30-50%), przygotowanie/programowanie (10-20%), narzędzia (5-15%), narzut/administracja (10-15%). Stawki godzinowe maszyn: tokarka CNC 120-200 PLN/h, frezarka 3-osiowa 150-250 PLN/h, frezarka 5-osiowa 250-400 PLN/h, szlifierka CNC 150-250 PLN/h. Seryjność obniża koszt jednostkowy: 10 szt vs 1 szt = 30-50% taniej.',
      summary: 'Koszty CNC — struktura, stawki maszynowe, seryjność',
    },
    {
      id: 'info-stawki',
      text: 'Stawki godzinowe obrabiarek CNC w Polsce (2025-2026): Tokarka CNC 2-osiowa 120-180 PLN/h, Tokarka CNC z napędzanymi narzędziami 180-250 PLN/h, Frezarka CNC 3-osiowa 150-220 PLN/h, Frezarka CNC 5-osiowa 280-400 PLN/h, Centra obróbkowe 200-350 PLN/h, Szlifierka CNC 150-250 PLN/h, EDM drążarka 180-280 PLN/h, EDM drut 200-350 PLN/h. Na stawkę wpływa: stan maszyny, dokładność, wielkość detalu, materiał.',
      summary: 'Stawki godzinowe obrabiarek CNC w Polsce — cennik rynkowy',
    },
    // FAQ
    {
      id: 'faq-minimum-order',
      text: 'Minimalne zamówienie CNC — większość warsztatów przyjmuje od 1 sztuki. Nie ma formalnego minimum, ale opłacalność rośnie od ~5-10 szt (bo czas przygotowania/ustawienia się rozkłada). Dla 1 szt koszt ustawienia maszyny może stanowić 30-50% ceny detalu. Rekomendacja: jeśli to prototyp — 1-3 szt, jeśli produkcja — minimum 10-50 szt dla lepszej ceny.',
      summary: 'FAQ: Minimalne zamówienie CNC — od 1 sztuki',
    },
    {
      id: 'faq-pliki-wycena',
      text: 'Do wyceny CNC potrzebne: 1) Rysunek techniczny 2D (PDF/DXF) z tolerancjami i wymiarami — NAJWAŻNIEJSZY. 2) Model 3D (STEP/IGES/STP) — dla detali 3D. 3) Materiał (gatunek stali, aluminium itp.). 4) Ilość sztuk. 5) Wymagana chropowatość powierzchni (Ra). 6) Obróbka cieplna (hartowanie, azotowanie?). 7) Termin realizacji. Bez rysunku 2D z tolerancjami wycena jest orientacyjna +/-30%.',
      summary: 'FAQ: Co potrzeba do wyceny CNC — pliki i dane',
    },
    {
      id: 'faq-obrobka-cieplna',
      text: 'Obróbka cieplna po CNC — hartowanie (twardość 50-65 HRC, wypaczenia!), odpuszczanie (zmniejsza naprężenia po hartowaniu), azotowanie (twarda warstwa bez wypaczenia, 600-1100 HV), nawęglanie (twarda powierzchnia, miękki rdzeń). Ważne: po hartowaniu detal się wypacza — zostawić naddatek 0.1-0.3 mm na szlifowanie! Dodatkowy czas: 3-7 dni roboczych (zewnętrzna usługa).',
      summary: 'FAQ: Obróbka cieplna — hartowanie, azotowanie, naddatek',
    },
  ]
}

// ============================================
// POPULATE KNOWLEDGE ENTRIES
// ============================================

export async function populateKnowledgeEntries(companyId: string): Promise<number> {
  const entries = getCncKnowledgeEntries()

  let count = 0
  for (const entry of entries) {
    const sourceId = deterministicUUID(`knowledge:${companyId}:${entry.id}`)

    const ok = await upsertEmbedding({
      companyId,
      sourceType: 'knowledge_entry',
      sourceId,
      contentText: entry.text,
      contentSummary: entry.summary,
      metadata: { entryId: entry.id },
    })
    if (ok) count++
    await delay(DELAY_MS)
  }

  logger.info('[embedding-pipeline] Knowledge entries populated', { companyId, count })
  return count
}
