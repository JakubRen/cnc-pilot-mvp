import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function generateEmbedding(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    }
  )
  const data = await res.json()
  if (!data.embedding?.values) {
    throw new Error(`Embedding failed: ${JSON.stringify(data)}`)
  }
  return data.embedding.values
}

async function upsert(companyId, sourceType, sourceId, contentText, contentSummary, metadata = {}) {
  const embedding = await generateEmbedding(contentText)

  // Delete existing
  await supabase
    .from('knowledge_embeddings')
    .delete()
    .eq('company_id', companyId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)

  // Insert new
  const { error } = await supabase
    .from('knowledge_embeddings')
    .insert({
      company_id: companyId,
      source_type: sourceType,
      source_id: sourceId,
      content_text: contentText,
      content_summary: contentSummary,
      embedding: JSON.stringify(embedding),
      metadata,
    })

  if (error) throw error

  // Rate limit
  await new Promise(r => setTimeout(r, 100))
}

// Get company
const { data: users } = await supabase.from('users').select('company_id').limit(1)
const companyId = users[0].company_id
console.log('Company:', companyId)

// Products
const { data: products } = await supabase
  .from('products')
  .select('id, name, sku, category, description, unit')
  .eq('company_id', companyId)

console.log(`\nPopulating ${products.length} products...`)
for (const p of products) {
  const text = `Produkt: ${p.name}. SKU: ${p.sku || 'brak'}. Kategoria: ${p.category || 'brak'}. Jednostka: ${p.unit || 'szt'}. ${p.description || ''}`
  const summary = `${p.name} (${p.sku || 'brak SKU'}) — ${p.category || 'brak kategorii'}`
  await upsert(companyId, 'product', p.id, text, summary, { sku: p.sku, category: p.category })
  console.log(`  ✓ ${p.name}`)
}

// Orders
const { data: orders } = await supabase
  .from('orders')
  .select('id, order_number, customer_name, part_name, material, quantity, status, deadline, selling_price')
  .eq('company_id', companyId)

console.log(`\nPopulating ${orders.length} orders...`)
for (const o of orders) {
  const text = `Zamówienie ${o.order_number}: ${o.part_name || 'część'} dla ${o.customer_name || 'klient'}. Materiał: ${o.material || 'nie podano'}. Ilość: ${o.quantity || 1}. Status: ${o.status}. Termin: ${o.deadline || 'brak'}. Cena: ${o.selling_price || 'nie podano'} PLN.`
  const summary = `Zamówienie ${o.order_number} — ${o.customer_name} — ${o.status}`
  await upsert(companyId, 'order', o.id, text, summary, { status: o.status, customer: o.customer_name })
  console.log(`  ✓ ${o.order_number}`)
}

// Customers
const { data: customers } = await supabase
  .from('customers')
  .select('id, name, email, phone, nip, city')
  .eq('company_id', companyId)

console.log(`\nPopulating ${customers.length} customers...`)
for (const c of customers) {
  const text = `Klient: ${c.name}. Email: ${c.email || 'brak'}. Telefon: ${c.phone || 'brak'}. NIP: ${c.nip || 'brak'}. Miasto: ${c.city || 'brak'}.`
  const summary = `Klient ${c.name} — ${c.city || 'brak miasta'}`
  await upsert(companyId, 'customer', c.id, text, summary, { email: c.email })
  console.log(`  ✓ ${c.name}`)
}

// Knowledge entries (CNC domain knowledge)
const knowledgeEntries = [
  { id: 'mat-stal-konstrukcyjna', text: 'Stal konstrukcyjna (S235, S355, C45) — najpopularniejszy materiał w CNC. Dobra obrabialność, tania. S235 do konstrukcji ogólnych, C45 do wałków/osi (hartowalna). Parametry skrawania: Vc 150-250 m/min (węgliki), posuw 0.1-0.3 mm/obr. Chłodzenie: emulsja lub sucho.', summary: 'Stal konstrukcyjna — S235, S355, C45 — parametry skrawania' },
  { id: 'mat-stal-nierdzewna', text: 'Stal nierdzewna (1.4301/AISI 304, 1.4404/AISI 316) — trudniejsza w obróbce, klei się do narzędzia. Vc 120-180 m/min przy węglikach, 30-50 m/min przy HSS. Posuw 0.08-0.2 mm/obr. ZAWSZE obfite chłodzenie emulsją. Uwaga: utwardza się przy zbyt małym posuwie — lepiej wchodzić odważnie. Narzędzia z powłoką TiAlN.', summary: 'Stal nierdzewna 1.4301/304 — parametry, chłodzenie, wskazówki' },
  { id: 'mat-aluminium', text: 'Aluminium (6061-T6, 7075-T6, 2017A) — łatwe w obróbce, szybkie. 6061 do ogólnych zastosowań, 7075 lotnicze (twarde ale kruche). Vc 300-1000 m/min, posuw 0.1-0.5 mm/obr. Chłodzenie: sprężone powietrze lub emulsja. Uwaga na narost na ostrzu — ostra geometria narzędzia, polerowane rowki wiórowe.', summary: 'Aluminium 6061/7075 — szybka obróbka, parametry, narost' },
  { id: 'mat-mosiadz', text: 'Mosiądz (CuZn39Pb3, CuZn37) — idealny do automatów tokarskich, doskonała obrabialność. Vc 200-400 m/min, posuw 0.05-0.3 mm/obr. Obróbka na sucho lub minimalne smarowanie. Drobny wiór, gładka powierzchnia. Stosowany w armaturze, złączkach, elementach dekoracyjnych.', summary: 'Mosiądz — doskonała obrabialność, armatura, złączki' },
  { id: 'mat-braz', text: 'Brąz (CuSn8, CuAl10) — twardy, odporny na ścieranie. Stosowany w łożyskach, tulejach, ślimakach. Vc 100-200 m/min, posuw 0.1-0.25 mm/obr. Brąz aluminiowy trudniejszy — wymaga sztywnego mocowania. Chłodzenie: emulsja.', summary: 'Brąz — łożyska, tuleje, parametry skrawania' },
  { id: 'mat-tworzywa', text: 'Tworzywa sztuczne CNC (POM/Delrin, PA6, PEEK, PTFE/Teflon) — POM najłatwiejszy, precyzyjne detale. PEEK drogi ale wytrzymały termicznie. Vc 200-500 m/min, posuw 0.05-0.2 mm/obr. ZAWSZE ostre narzędzia (tępe = topienie). Bez chłodziwa lub sprężone powietrze. Uwaga na odkształcenia termiczne.', summary: 'Tworzywa sztuczne CNC — POM, PA6, PEEK — wskazówki' },
  { id: 'op-toczenie', text: 'Toczenie CNC — obróbka detali obrotowych (wałki, tuleje, flansże). Typy: toczenie zewnętrzne, wewnętrzne (wytaczanie), planowanie czoła, rowkowanie, gwintowanie. Kluczowe parametry: Vc (prędkość skrawania), fn (posuw na obrót), ap (głębokość skrawania). Centrum tokarskie z napędzanymi narzędziami pozwala na frezowanie i wiercenie bez przepinania.', summary: 'Toczenie CNC — wałki, tuleje, parametry, centra tokarskie' },
  { id: 'op-frezowanie', text: 'Frezowanie CNC — obróbka powierzchni płaskich, kieszeni, konturów, 3D. Typy: frezowanie czołowe, walcowe, kieszeni, konturowe, 3D/5-osiowe. Parametry: Vc, fz (posuw na ząb), ap (głębokość), ae (szerokość). Frezowanie współbieżne daje lepszą powierzchnię niż przeciwbieżne. HSM (High Speed Machining) — mały ap, duży ae, wysoka Vc.', summary: 'Frezowanie CNC — typy, parametry, HSM, współbieżne' },
  { id: 'op-wiercenie', text: 'Wiercenie CNC — otwory przelotowe i nieprzelotowe. Wiertła: HSS (do fi 13mm tanio), węglikowe (precyzja, szybkość), z chłodzeniem wewnętrznym (głębokie otwory). Rozwiercanie dla tolerancji H7. Gwintowanie: gwintownik, frez do gwintów (elastyczniejszy). Pogłębianie: stożkowe, walcowe.', summary: 'Wiercenie i gwintowanie CNC — typy wierteł, rozwiercanie' },
  { id: 'op-szlifowanie', text: 'Szlifowanie CNC — wykończenie powierzchni, tolerancje IT5-IT7. Szlifowanie okrągłe (wałki), płaskie (płaszczyzny), bezkłowe (serie). Ściernice: elektrokorund (stal), węglik krzemu (żeliwo, aluminium), CBN (stal hartowana), diament (węgliki). Prędkość ściernicy: 30-35 m/s. Zawsze obfite chłodzenie.', summary: 'Szlifowanie CNC — tolerancje, ściernice, wykończenie' },
  { id: 'info-tolerancje', text: 'Tolerancje w obróbce CNC — standardowe: +/-0.1 mm (IT12). Precyzyjne: +/-0.05 mm (IT9-IT10). Wysokiej precyzji: +/-0.01 mm (IT6-IT7, wymaga szlifowania). Im ciaśniejsza tolerancja, tym wyższy koszt — każdy rząd dokładności to ~2x cena. Zawsze pytaj klienta czy naprawdę potrzebuje IT6.', summary: 'Tolerancje CNC — klasy IT, koszty, rekomendacje' },
  { id: 'info-chropowatosc', text: 'Chropowatość powierzchni CNC — Ra 6.3 (toczenie zgrubne), Ra 3.2 (toczenie wykańczające), Ra 1.6 (dobre wykończenie frezarskie), Ra 0.8 (szlifowanie), Ra 0.4 (szlifowanie precyzyjne), Ra 0.1-0.2 (polerowanie). Standard dla CNC bez specyfikacji: Ra 1.6-3.2.', summary: 'Chropowatość Ra — wartości typowe dla CNC' },
  { id: 'info-lead-time', text: 'Typowe czasy realizacji zamówień CNC: proste detale (1-5 szt) 3-5 dni roboczych, średnia złożoność (1-50 szt) 5-10 dni, złożone/5-osiowe 10-15 dni, serie >100 szt 10-20 dni. Ekspres (+50-100% ceny): 1-3 dni. Na czas wpływa: dostępność materiału, obłożenie maszyn, obróbka cieplna (dodatkowe 3-5 dni).', summary: 'Czasy realizacji CNC — proste, złożone, ekspres' },
  { id: 'info-koszty', text: 'Struktura kosztów CNC: materiał (20-40%), czas maszynowy (30-50%), przygotowanie/programowanie (10-20%), narzędzia (5-15%), narzut/administracja (10-15%). Stawki godzinowe maszyn: tokarka CNC 120-200 PLN/h, frezarka 3-osiowa 150-250 PLN/h, frezarka 5-osiowa 250-400 PLN/h, szlifierka CNC 150-250 PLN/h.', summary: 'Koszty CNC — struktura, stawki maszynowe, seryjność' },
  { id: 'info-stawki', text: 'Stawki godzinowe obrabiarek CNC w Polsce (2025-2026): Tokarka CNC 2-osiowa 120-180 PLN/h, z napędzanymi narzędziami 180-250 PLN/h, Frezarka 3-osiowa 150-220 PLN/h, 5-osiowa 280-400 PLN/h, Szlifierka 150-250 PLN/h, EDM drążarka 180-280 PLN/h, EDM drut 200-350 PLN/h.', summary: 'Stawki godzinowe obrabiarek CNC w Polsce — cennik rynkowy' },
  { id: 'faq-minimum-order', text: 'Minimalne zamówienie CNC — większość warsztatów przyjmuje od 1 sztuki. Opłacalność rośnie od ~5-10 szt (czas przygotowania się rozkłada). Dla 1 szt koszt ustawienia maszyny może stanowić 30-50% ceny detalu. Jeśli prototyp — 1-3 szt, produkcja — minimum 10-50 szt.', summary: 'FAQ: Minimalne zamówienie CNC — od 1 sztuki' },
  { id: 'faq-pliki-wycena', text: 'Do wyceny CNC potrzebne: 1) Rysunek techniczny 2D (PDF/DXF) z tolerancjami — NAJWAŻNIEJSZY. 2) Model 3D (STEP/IGES). 3) Materiał (gatunek). 4) Ilość sztuk. 5) Wymagana chropowatość Ra. 6) Obróbka cieplna? 7) Termin realizacji. Bez rysunku 2D wycena jest orientacyjna +/-30%.', summary: 'FAQ: Co potrzeba do wyceny CNC — pliki i dane' },
  { id: 'faq-obrobka-cieplna', text: 'Obróbka cieplna po CNC — hartowanie (twardość 50-65 HRC, wypaczenia!), odpuszczanie, azotowanie (twarda warstwa bez wypaczenia), nawęglanie (twarda powierzchnia, miękki rdzeń). Po hartowaniu detal się wypacza — zostawić naddatek 0.1-0.3 mm na szlifowanie! Dodatkowy czas: 3-7 dni roboczych.', summary: 'FAQ: Obróbka cieplna — hartowanie, azotowanie, naddatek' },
]

import { createHash } from 'crypto'

// Generate deterministic UUID from string (MD5 hash formatted as UUID)
function deterministicUUID(input) {
  const hash = createHash('md5').update(input).digest('hex')
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`
}

console.log(`\nPopulating ${knowledgeEntries.length} knowledge entries...`)
for (const entry of knowledgeEntries) {
  const sourceId = deterministicUUID(`knowledge:${companyId}:${entry.id}`)
  await upsert(companyId, 'knowledge_entry', sourceId, entry.text, entry.summary, { entryId: entry.id })
  console.log(`  ✓ ${entry.summary}`)
}

// Summary
const { count } = await supabase
  .from('knowledge_embeddings')
  .select('id', { count: 'exact', head: true })
  .eq('company_id', companyId)

console.log(`\n✅ Done! Total embeddings: ${count}`)
