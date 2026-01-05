# 🎯 MERCATO PLAN - Open Mercato Patterns dla CNC-Pilot

> **Autor:** Claude Code (CTO Analysis)
> **Data:** 2026-01-04
> **Status:** Research & Planning Phase
> **Priorytet:** Event System (HIGH), Widget Injection (MEDIUM), AI Patterns (LOW)

---

## 📋 Spis Treści

1. [Executive Summary](#executive-summary)
2. [Open Mercato - Co To Jest](#open-mercato---co-to-jest)
3. [Current State: CNC-Pilot](#current-state-cnc-pilot)
4. [Top 3 Patterns do Implementacji](#top-3-patterns-do-implementacji)
5. [Co NIE Brać](#co-nie-brać)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Cost/Benefit Analysis](#costbenefit-analysis)
8. [Action Plan](#action-plan)
9. [Decision Framework](#decision-framework)

---

## Executive Summary

**Open Mercato** to AI-supportive, modular framework (MIT license) do budowania enterprise CRM/ERP.
**Ocena CTO:** 9.5/10 - Production-ready dla Software Houses.

### Kluczowe Wnioski dla CNC-Pilot:

| Pattern | Effort | Impact | Timeline | Rekomendacja |
|---------|--------|--------|----------|--------------|
| **Event-Driven Architecture** | 2 tyg | 🔥 High | Teraz | ✅ **IMPLEMENT** |
| **Widget Injection System** | 1.5 tyg | 🔥 Medium-High | 1-2 mies | ⏸️ **CONSIDER** |
| **AI-Native Data Patterns** | 3 tyg | 🔥 Medium | 3-6 mies | 📅 **FUTURE** |
| DI Container (Awilix) | 4 tyg | Low | - | ❌ **SKIP** |
| Tenant-Scoped Encryption | 3 tyg | Low* | - | ❌ **Only if needed** |
| MikroORM Migration | 8 tyg | Low | - | ❌ **SKIP** |

*Low dla obecnego rynku, High jeśli enterprise z compliance requirements

**Bottom Line:**
✅ Zacznij od **Event System** (2 tygodnie, immediate ROI)
⏸️ Rozważ **Widgets** jeśli planujesz marketplace/plugins
📅 Przygotuj się na **AI patterns** za 6-12 miesięcy

---

## Open Mercato - Co To Jest

### Tech Stack
```yaml
Frontend: Next.js 15 App Router + TypeScript + React
Backend: MikroORM + PostgreSQL + Awilix DI
Infrastructure: Redis (optional) + Docker + Resend
Validation: Zod schemas
Security: Tenant-scoped encryption (per-column, AES-GCM)
```

### Kluczowe Features

**1. Modular Architecture**
- Każdy moduł: `src/modules/<module>/`
- Auto-discovery: frontend, backend, API, subscribers
- Zero coupling między modułami

**2. Overlay Override System**
```typescript
// Override service bez forka
container.register({
  customerService: asClass(MyCustomCustomerService).scoped()
})
```

**3. Widget Injection**
```typescript
// Production module dodaje widget do Order Details
{
  id: 'production-plans',
  slot: 'order-details:sidebar',
  component: ProductionPlansWidget
}
```

**4. Multi-Tenancy + Encryption**
- Per-tenant DEK (Data Encryption Keys)
- Column-level encryption (transparent dla aplikacji)
- Vault/KMS or derived-key fallback

**5. AI-Native Design**
- Structured events dla ML learning
- JSONB custom fields dla dynamic data
- Query engine abstraction (AI-friendly)
- Event subscribers (async agent coordination)

### Repository
- **GitHub:** https://github.com/open-mercato/open-mercato
- **License:** MIT
- **Stars:** 213 (early stage, ale production-ready)
- **Docs:** https://docs.openmercato.com
- **Demo:** https://demo.openmercato.com

---

## Current State: CNC-Pilot

### Stack
```yaml
Framework: Next.js 16 (App Router)
Database: Supabase (PostgreSQL + Auth)
Language: TypeScript 5
Styling: Tailwind CSS 4
Multi-tenancy: Email domain-based (company_email_domains table)
Security: Row Level Security (RLS) per company_id
```

### Architecture (Simplified)
```
app/
├── orders/          # Zamówienia
├── production/      # Plany produkcji + Operacje
├── inventory/       # Magazyn + Produkty
├── time-tracking/   # Trackowanie czasu pracy
├── users/           # Zarządzanie użytkownikami
├── customers/       # Kontrahenci
├── machines/        # Maszyny CNC
├── cooperation/     # Kooperanci zewnętrzni
└── ...
```

### Problem: Coupling

**Przykład 1: Order → Production (hard dependency)**
```typescript
// app/orders/[id]/page.tsx
import { createProductionPlan } from '@/app/production/create'

// Po zmianie statusu:
await createProductionPlan(orderId)  // ❌ Direct import = coupling
```

**Przykład 2: Production → Inventory (hard dependency)**
```typescript
// app/production/create/page.tsx
import { reserveMaterials } from '@/app/inventory/utils'

await reserveMaterials(materials)  // ❌ Direct import = coupling
```

**Konsekwencje:**
- ❌ Trudno testować moduły w izolacji
- ❌ Nie można wyłączyć modułu bez breaking changes
- ❌ Trudno rozszerzać (każdy nowy moduł = refactor)
- ❌ Brak elastyczności dla custom deployments

---

## Top 3 Patterns do Implementacji

### 1. EVENT-DRIVEN ARCHITECTURE 🔥 HIGH Priority

#### Problem który Rozwiązuje

**Obecnie:**
```typescript
// Order status change = bezpośrednie wywołania
await updateOrderStatus(orderId, 'confirmed')
await createProductionPlan(orderId)       // ❌ Coupling
await reserveMaterials(orderId)           // ❌ Coupling
await sendNotification(orderId)           // ❌ Coupling
```

**Po implementacji:**
```typescript
// Emit event tylko
await updateOrderStatus(orderId, 'confirmed')
eventBus.emit('order.status_changed', { orderId, status: 'confirmed' })

// Subscribers reagują niezależnie:
// - Production module słucha i tworzy sugestię planu
// - Inventory module słucha i rezerwuje materiały
// - Notifications module słucha i wysyła email
```

#### Implementation

**Struktura plików:**
```
lib/events/
├── emitter.ts           # EventEmitter singleton
├── types.ts             # Event type definitions
├── logger.ts            # Event audit trail
└── middleware.ts        # Error handling, retry logic

app/orders/
└── events.ts            # Order events emitter

app/production/
└── subscribers/
    └── order-subscriber.ts   # Listen to order events

app/inventory/
└── subscribers/
    └── order-subscriber.ts   # Listen to order events
```

**Code Example:**

```typescript
// lib/events/emitter.ts
import { EventEmitter } from 'events'

export const eventBus = new EventEmitter()

// Enable strict typing
export type OrderEvent = {
  'order.created': { orderId: string; companyId: string }
  'order.status_changed': { orderId: string; status: string; previousStatus: string }
  'order.deleted': { orderId: string; companyId: string }
}

// Type-safe emit
export function emitOrderEvent<K extends keyof OrderEvent>(
  event: K,
  payload: OrderEvent[K]
) {
  eventBus.emit(event, payload)

  // Log for audit trail
  console.error('[Event]', event, payload)
}
```

```typescript
// app/orders/events.ts
import { emitOrderEvent } from '@/lib/events/emitter'

export async function updateOrderStatus(orderId: string, status: string) {
  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single()

  const previousStatus = order?.status

  await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)

  // Emit event
  emitOrderEvent('order.status_changed', {
    orderId,
    status,
    previousStatus: previousStatus || 'unknown'
  })
}
```

```typescript
// app/production/subscribers/order-subscriber.ts
import { eventBus } from '@/lib/events/emitter'
import { createProductionPlanSuggestion } from '../utils/suggestions'

// Register subscriber
eventBus.on('order.status_changed', async ({ orderId, status }) => {
  if (status === 'confirmed') {
    try {
      await createProductionPlanSuggestion(orderId)
      console.error('[Production] Created suggestion for order:', orderId)
    } catch (error) {
      console.error('[Production] Failed to create suggestion:', error)
      // Można dodać retry logic
    }
  }
})
```

```typescript
// app/inventory/subscribers/order-subscriber.ts
import { eventBus } from '@/lib/events/emitter'
import { reserveMaterials } from '../utils/reservation'

eventBus.on('order.status_changed', async ({ orderId, status }) => {
  if (status === 'in_progress') {
    try {
      await reserveMaterials(orderId)
      console.error('[Inventory] Reserved materials for order:', orderId)
    } catch (error) {
      console.error('[Inventory] Failed to reserve materials:', error)
    }
  }
})
```

#### Korzyści

- ✅ **Loose coupling** - moduły się nie znają
- ✅ **Testowanie** - mockujesz events zamiast całych modułów
- ✅ **Rozszerzalność** - nowy moduł = nowy subscriber (zero refactor)
- ✅ **Async processing** - nie blokuje UI
- ✅ **Audit trail** - każdy event logowany
- ✅ **Error isolation** - błąd w jednym subscriber nie crashuje innych

#### Timeline

**Week 1: Foundation**
- Day 1-2: Event emitter infrastructure + types
- Day 3-4: First use case (Order → Production)
- Day 5: Testing + documentation

**Week 2: Expansion**
- Day 1-2: Inventory subscribers
- Day 3-4: Time tracking automation
- Day 5: Monitoring dashboard + error handling

**ROI:** ✅ Immediate - każda nowa feature będzie łatwiejsza

---

### 2. WIDGET INJECTION SYSTEM 🔥 MEDIUM-HIGH Priority

#### Problem który Rozwiązuje

**Obecnie:**
```typescript
// Order Details page musi znać wszystkie moduły
// app/orders/[id]/page.tsx

import ProductionPlansList from '@/app/production/components/PlansList'
import TimeLogsList from '@/app/time-tracking/components/LogsList'
import QualityReports from '@/app/quality-control/components/Reports'
import FilesGallery from '@/app/files/components/Gallery'

// Hard-coded widgets
<div>
  <OrderDetails />
  <ProductionPlansList orderId={orderId} />  {/* ❌ Coupling */}
  <TimeLogsList orderId={orderId} />         {/* ❌ Coupling */}
  <QualityReports orderId={orderId} />       {/* ❌ Coupling */}
  <FilesGallery orderId={orderId} />         {/* ❌ Coupling */}
</div>
```

**Po implementacji:**
```typescript
// Order Details page nie zna żadnych modułów
// app/orders/[id]/page.tsx

<div>
  <OrderDetails />

  {/* Magic: all registered widgets auto-render */}
  <WidgetSlot
    id="order-details:sidebar"
    context={{ orderId, orderStatus, companyId }}
  />
</div>
```

#### Implementation

**Struktura plików:**
```
lib/widgets/
├── registry.ts          # Widget registration system
├── WidgetSlot.tsx       # React component
├── types.ts             # TypeScript definitions
└── discovery.ts         # Auto-discover widgets

app/production/
└── widgets/
    └── order-sidebar.tsx    # Register widget for order details

app/time-tracking/
└── widgets/
    └── order-sidebar.tsx    # Register widget for order details
```

**Code Example:**

```typescript
// lib/widgets/types.ts
export type WidgetConfig = {
  id: string
  slot: string
  order?: number  // Display order (lower = first)
  condition?: (context: any) => boolean
  component: React.ComponentType<any>
}

export type WidgetSlotId =
  | 'order-details:sidebar'
  | 'order-details:actions'
  | 'production-plan:actions'
  | 'dashboard:metrics'
  | 'inventory-item:sidebar'
```

```typescript
// lib/widgets/registry.ts
const widgetRegistry = new Map<string, WidgetConfig[]>()

export function registerWidget(widget: WidgetConfig) {
  const existing = widgetRegistry.get(widget.slot) || []
  widgetRegistry.set(widget.slot, [...existing, widget])
}

export function getWidgetsForSlot(slotId: string, context: any): WidgetConfig[] {
  const widgets = widgetRegistry.get(slotId) || []

  return widgets
    .filter(w => !w.condition || w.condition(context))
    .sort((a, b) => (a.order || 100) - (b.order || 100))
}
```

```typescript
// lib/widgets/WidgetSlot.tsx
'use client'

import { getWidgetsForSlot } from './registry'

type Props = {
  id: string
  context: any
  className?: string
}

export function WidgetSlot({ id, context, className }: Props) {
  const widgets = getWidgetsForSlot(id, context)

  if (widgets.length === 0) return null

  return (
    <div className={className}>
      {widgets.map((widget) => {
        const Component = widget.component
        return <Component key={widget.id} {...context} />
      })}
    </div>
  )
}
```

```typescript
// app/production/widgets/order-sidebar.tsx
import { registerWidget } from '@/lib/widgets/registry'
import ProductionPlansList from '../components/PlansList'

registerWidget({
  id: 'production-plans-widget',
  slot: 'order-details:sidebar',
  order: 10,
  condition: (ctx) => ctx.orderStatus !== 'cancelled',
  component: ProductionPlansList
})
```

```typescript
// app/time-tracking/widgets/order-sidebar.tsx
import { registerWidget } from '@/lib/widgets/registry'
import TimeLogsSummary from '../components/LogsSummary'

registerWidget({
  id: 'time-logs-widget',
  slot: 'order-details:sidebar',
  order: 20,
  component: TimeLogsSummary
})
```

#### Konkretne Use Cases w CNC-Pilot

**1. Order Details → Related Data**
```typescript
Slots:
- 'order-details:sidebar'
  → Production plans widget (production module)
  → Time logs summary widget (time-tracking module)
  → Quality reports widget (quality-control module)
  → Attached files widget (files module)

- 'order-details:actions'
  → Create production plan button
  → Export to PDF button
  → Send to client portal button
```

**2. Production Plan → Actions**
```typescript
Slots:
- 'production-plan:actions'
  → Export to PDF widget
  → Share with cooperant widget (cooperation module)
  → Create invoice widget (future)
  → Duplicate plan widget
```

**3. Dashboard → Custom Metrics**
```typescript
Slots:
- 'dashboard:metrics'
  → Carbon footprint card (carbon module)
  → Machine utilization card (machines module)
  → Custom KPIs (future plugins)
```

#### Korzyści

- ✅ **Plug & Play modules** - wyłączasz moduł, widget znika
- ✅ **Third-party extensions** - marketplace dla plugins (future)
- ✅ **Conditional rendering** - widget tylko gdy ma sens
- ✅ **Easy A/B testing** - zamień widget bez core changes
- ✅ **Zero coupling** - Order page nie wie o Production module

#### Timeline

**Week 1: Core**
- Day 1-2: Widget registry + types
- Day 3-4: WidgetSlot component + discovery
- Day 5: First integration (Order Details)

**Week 2: Rollout**
- Day 1-2: Migrate existing widgets
- Day 3-4: Documentation + examples
- Day 5: Testing + monitoring

**ROI:** ⏸️ 2-3 miesiące - gdy będziecie rozbudowywać moduły lub marketplace

#### Decyzja

**Implementuj jeśli:**
- ✅ Planujesz marketplace/plugins dla CNC-Pilot
- ✅ Chcesz white-label (różne konfiguracje dla różnych klientów)
- ✅ Team często dodaje nowe moduły

**Pomiń jeśli:**
- ❌ Moduły są stabilne i rzadko dodajecie nowe
- ❌ Nie planujesz third-party extensions
- ❌ Team wolałby prostsze rozwiązanie (hard-coded widgets OK)

---

### 3. AI-NATIVE DATA PATTERNS 🔥 MEDIUM Priority (Future-Proof)

#### Co to Znaczy Praktycznie

**Pattern 1: Structured Metadata dla AI**

```typescript
// OBECNIE: Hard-coded fields
type Operation = {
  id: string
  operation_name: string
  setup_time_minutes: number
  run_time_per_unit_minutes: number
}

// AI-NATIVE: Metadata + Insights
type Operation = {
  id: string
  operation_name: string
  setup_time_minutes: number
  run_time_per_unit_minutes: number

  // Structured metadata (dla AI learning)
  metadata: {
    complexity: 'simple' | 'medium' | 'complex'
    machine_requirements: string[]  // ['3-axis-cnc', 'coolant-system']
    skill_level_required: 1 | 2 | 3 | 4 | 5
    common_issues: string[]  // ['tool_wear', 'vibration']
    material_compatibility: string[]  // ['steel', 'aluminum']
  }

  // AI-generated insights (auto-populated)
  ai_insights?: {
    estimated_time_confidence: number  // 0-1 (based on historical data)
    suggested_optimizations: string[]  // AI recommendations
    historical_accuracy: number  // How accurate were past estimates?
    risk_factors: string[]  // ['material_hardness_variable', 'operator_experience']
  }
}
```

**Pattern 2: AI-Friendly Query Interface**

```typescript
// OBECNIE: SQL/Supabase queries
const delayedOrders = await supabase
  .from('orders')
  .select('*')
  .eq('status', 'delayed')
  .gte('deadline', today)

// AI-FRIENDLY: Structured query format
const delayedOrders = await queryEngine.find('orders', {
  filters: [
    { field: 'status', operator: 'eq', value: 'delayed' },
    { field: 'deadline', operator: 'gte', value: today }
  ]
})

// Dlaczego to lepsze dla AI:
// 1. AI może generować query z natural language
//    User: "pokaż opóźnione zamówienia"
//    AI: converts to structured format
//
// 2. Validation + security w jednym miejscu
// 3. Easy to audit (structured logs)
// 4. Consistent API dla wszystkich modułów
```

**Pattern 3: Event Stream dla AI Learning**

```typescript
// Każdy event w AI-readable format
type OperationEvent = {
  type: 'operation.time_exceeded' | 'operation.completed' | 'operation.failed'
  timestamp: string  // ISO 8601
  context: {
    operation_id: string
    operation_type: string
    planned_time_minutes: number
    actual_time_minutes: number
    operator_id: string
    operator_experience_years: number
    machine_id: string
    material: string
    complexity: string
  }
  outcome: 'success' | 'delay' | 'failure'
  root_cause?: string  // Optional: operator input
  metadata: Record<string, any>
}

// AI może analizować patterns:
// Example insights:
// - "Turning operations na Machine-X zajmują średnio 1.4x dłużej niż planowane"
// - "Operator-123 ma 95% accuracy dla medium complexity operations"
// - "Material 'stainless steel' causes 30% more delays than 'aluminum'"
```

#### Konkretne AI Features (Future)

**1. Smart Time Estimation**
```typescript
// AI learns from historical data
const estimate = await estimateOperationTime({
  operation_type: 'milling',
  material: 'steel',
  complexity: 'medium',
  operator_id: user.id,
  machine_id: machine.id,
  part_dimensions: { length: 100, width: 50, height: 30 }
})

// Returns:
{
  estimated_minutes: 45,
  confidence: 0.85,  // 85% confidence based on 127 similar operations
  based_on_operations: 127,
  range: { min: 40, max: 52 },  // 95% confidence interval
  risk_factors: [
    { factor: 'material_hardness_variable', impact: 'medium' },
    { factor: 'operator_has_only_5_similar_ops', impact: 'low' }
  ],
  recommendations: [
    'Consider adding 10% buffer for material variability',
    'Assign to operator with more experience for critical deadlines'
  ]
}
```

**2. Auto-Categorization**
```typescript
// AI categorizes orders automatically
const category = await categorizeOrder({
  part_name: "Flansza Ø100",
  material: "Stal nierdzewna",
  quantity: 500,
  technical_notes: "Tolerancja IT7, obróbka cieplna wymagana",
  customer_industry: "automotive"
})

// Returns:
{
  category: 'high-precision-batch',
  subcategory: 'automotive-certified',
  suggested_machines: ['CNC-001', 'CNC-003'],  // Have required certifications
  estimated_margin: 0.35,  // Based on similar historical orders
  quality_control_level: 'enhanced',
  recommended_cooperants: ['Cooperant-456'],  // Has automotive cert
  estimated_delivery_days: 14
}
```

**3. Predictive Maintenance Alerts**
```typescript
// AI detects machine degradation from operation times
eventBus.on('operation.completed', async (event) => {
  const anomaly = await detectMachineAnomaly(event.machine_id, {
    planned_time: event.planned_time,
    actual_time: event.actual_time,
    quality_issues: event.quality_issues,
    operator_feedback: event.operator_feedback
  })

  if (anomaly.score > 0.8) {
    await createMaintenanceAlert({
      machine_id: event.machine_id,
      urgency: anomaly.urgency,  // 'low' | 'medium' | 'high' | 'critical'
      predicted_issue: anomaly.likely_cause,  // e.g., "spindle_bearing_wear"
      confidence: anomaly.confidence,
      evidence: [
        "Last 10 operations averaged 15% slower than planned",
        "Increasing vibration detected (proxy: quality issues up 20%)",
        "Similar pattern observed before last maintenance on Machine-005"
      ],
      recommendation: anomaly.maintenance_action,  // "Schedule bearing inspection"
      estimated_downtime_if_ignored: "3-5 days",
      cost_of_preventive_maintenance: 2000,
      cost_of_reactive_repair: 8000
    })
  }
})
```

**4. Natural Language Interface (Future)**
```typescript
// User asks question in Polish
const query = "Pokaż mi zamówienia które mogą się opóźnić"

// AI converts to structured query
const aiQuery = await parseNaturalLanguage(query)
// Returns:
{
  intent: 'find_orders',
  filters: [
    { field: 'status', operator: 'in', value: ['pending', 'in_progress'] },
    {
      field: 'estimated_completion',
      operator: 'gt',
      value: 'deadline',
      type: 'field_comparison'  // Compare two fields
    }
  ],
  sort: [{ field: 'deadline', direction: 'asc' }],
  limit: 50
}

// Execute query
const results = await queryEngine.find('orders', aiQuery)

// AI generates natural response
const response = await generateNaturalResponse(results)
// "Znalazłem 12 zamówień które mogą się opóźnić.
//  Najważniejsze to ORD-2024-001 (deadline: jutro) i ORD-2024-005 (deadline: za 2 dni)."
```

#### Implementation Timeline

**Phase 1: Data Structure (Week 1)**
```typescript
Tasks:
- Add metadata JSONB fields to key entities (operations, orders)
- Create AI insights tables (separate for performance)
- Add event logging with structured format
- Create initial AI types/schemas
```

**Phase 2: First AI Feature - POC (Week 2)**
```typescript
Tasks:
- Collect historical operation data (last 6 months)
- Build simple regression model (operation time estimation)
- Create API endpoint for time estimation
- UI integration (show AI estimate vs manual input)
- User feedback mechanism ("Was this accurate?")
```

**Phase 3: Learning Loop (Week 3)**
```typescript
Tasks:
- Collect accuracy feedback from users
- Retrain model weekly (automated)
- Add confidence intervals
- Dashboard showing AI performance metrics
- A/B test: AI estimates vs manual (measure accuracy improvement)
```

**Phase 4: Expansion (Future - Month 2-3)**
```typescript
Features to add:
- Auto-categorization
- Predictive maintenance
- Natural language queries
- Cost optimization suggestions
```

#### Korzyści

- ✅ **Future-proof** - ready for AI assistants
- ✅ **Competitive advantage** - better estimates = better margins
- ✅ **Data-driven decisions** - insights from historical data
- ✅ **Gradual adoption** - start small, expand over time
- ✅ **Learning curve** - system gets smarter with usage

#### Timeline & ROI

**Short-term (3 months):**
- Basic time estimation working
- 10-15% improvement w accuracy vs manual estimates
- Better resource planning

**Mid-term (6-12 months):**
- Auto-categorization deployed
- Predictive maintenance alerts
- 20-30% reduction w delays

**Long-term (12+ months):**
- Full AI assistant integration
- Natural language interface
- Significant competitive advantage

**ROI:** 📅 6-12 months - gdy AI assistants staną się użyteczne i affordable

#### Decyzja

**Implementuj teraz jeśli:**
- ✅ Masz data scientist w teamie
- ✅ Masz >1000 historical operations do trenowania
- ✅ Chcesz early mover advantage

**Poczekaj 3-6 miesięcy jeśli:**
- ⏸️ Nie masz data science experience
- ⏸️ AI assistants są jeszcze za drogie
- ⏸️ Lepiej focus na core features

**Verdict:** 📅 **PREPARE NOW** (add metadata fields), **IMPLEMENT LATER** (AI features)

---

## Co NIE Brać

### ❌ 1. Pełna Migracja na MikroORM

**Open Mercato używa:** MikroORM (Unit of Work pattern)
**CNC-Pilot ma:** Supabase + Direct SQL queries

**Dlaczego NIE:**
- ❌ Supabase + RLS działa świetnie
- ❌ MikroORM = większa złożoność
- ❌ Strata Supabase Studio (GUI dla bazy)
- ❌ Strata Supabase Auth integration
- ❌ Mniejsza społeczność (vs Prisma/Supabase)
- ❌ 8 tygodni migracji bez wyraźnego ROI

**Kiedy rozważyć:**
- Jeśli migrujesz z Supabase (np. self-hosted PostgreSQL)
- Jeśli potrzebujesz advanced ORM patterns
- Jeśli team ma background w TypeORM/Hibernate

**Verdict:** ❌ **SKIP** - Supabase jest lepszy dla Twojego use case

---

### ❌ 2. DI Container (Awilix)

**Open Mercato używa:** Awilix dependency injection

**Dlaczego NIE (na razie):**
- ❌ Next.js App Router = React Server Components (functional, not OOP)
- ❌ DI ma sens dla klas, mniej dla functions
- ❌ Dodatkowa złożoność bez wyraźnej korzyści
- ❌ Team musiałby nauczyć się nowego pattern

**Kiedy ma sens:**
- ✅ Jeśli robisz white-label (multiple configurations per client)
- ✅ Jeśli sprzedajesz on-premise (customer overrides services)
- ✅ Jeśli team ma Java/C# background (znają DI)

**Open Mercato przykład:**
```typescript
// Override service per client
container.register({
  emailService: asClass(CustomEmailService).scoped()
})
```

**CNC-Pilot alternatywa (bez DI):**
```typescript
// Environment-based configuration (wystarczające)
const emailService = process.env.CUSTOM_EMAIL_PROVIDER
  ? new CustomEmailService()
  : new DefaultEmailService()
```

**Verdict:** ❌ **SKIP** - Reconsider jeśli robisz marketplace z overrides

---

### ❌ 3. Tenant-Scoped Encryption (na razie)

**Open Mercato ma:** Per-tenant DEK, column-level encryption

**Dlaczego NIE teraz:**
- ❌ CNC warsztaty nie są HIPAA/financial industry
- ❌ Performance overhead (każdy query = decrypt)
- ❌ Supabase RLS wystarcza dla GDPR compliance
- ❌ Dodatkowa złożoność w debugging
- ❌ 3 tygodnie implementacji bez immediate business need

**Kiedy dodać:**
- ✅ Sprzedajesz do healthtech (medical devices manufacturing)
- ✅ Klient wymaga SOC2 Type II certification
- ✅ Kontrakty z HIPAA requirements
- ✅ Government/military contracts

**Przykład z Open Mercato:**
```typescript
// Every field encrypted with tenant-specific key
await findWithDecryption(em, Customer, { id }, { tenantId })
```

**CNC-Pilot obecne rozwiązanie (wystarczające):**
```typescript
// RLS policies = tenant isolation
await supabase
  .from('customers')
  .select('*')
  .eq('company_id', companyId)  // RLS enforces this
```

**Verdict:** ❌ **SKIP** - Add only jeśli jest compliance requirement

---

## Implementation Roadmap

### Phase 1: Foundation (Month 1) 🔥 HIGH Priority

#### Week 1-2: Event System

**Effort:** Medium (2 tygodnie)
**Impact:** High (reduces coupling immediately)
**ROI:** Immediate

**Tasks:**
```
Day 1-2: Event Infrastructure
- [ ] Create lib/events/emitter.ts
- [ ] Create lib/events/types.ts (type-safe events)
- [ ] Create lib/events/logger.ts (audit trail)
- [ ] Unit tests

Day 3-4: First Use Case (Order → Production)
- [ ] Add event emitters to app/orders/events.ts
- [ ] Create app/production/subscribers/order-subscriber.ts
- [ ] Test: order status change → production plan suggestion
- [ ] Integration tests

Day 5-7: Expand to Inventory
- [ ] Create app/inventory/subscribers/order-subscriber.ts
- [ ] Create app/inventory/subscribers/production-subscriber.ts
- [ ] Test: production plan created → reserve materials

Day 8-10: Infrastructure
- [ ] Error handling & retry logic
- [ ] Event dashboard (see all events in real-time)
- [ ] Performance monitoring
- [ ] Documentation for team
```

**Success Metrics:**
- ✅ Zero direct imports between orders/production/inventory
- ✅ All tests passing
- ✅ Event dashboard shows activity
- ✅ Team understands pattern

---

#### Week 3-4: Widget Slots (Optional)

**Effort:** Medium (1.5 tygodnie)
**Impact:** Medium-High (tylko jeśli planujesz marketplace)
**ROI:** 2-3 miesiące

**Tasks:**
```
Day 1-2: Core System
- [ ] Create lib/widgets/registry.ts
- [ ] Create lib/widgets/types.ts
- [ ] Create lib/widgets/WidgetSlot.tsx
- [ ] Unit tests

Day 3-4: First Integration
- [ ] Define slots in app/orders/[id]/page.tsx
- [ ] Migrate Production widget
- [ ] Migrate Time Tracking widget
- [ ] Test rendering & conditional logic

Day 5-7: Documentation & Rollout
- [ ] Widget developer guide
- [ ] Migration guide (existing components → widgets)
- [ ] Example: building custom widget
- [ ] Review with team
```

**Success Metrics:**
- ✅ Order Details page has no direct imports
- ✅ Widgets render correctly
- ✅ Team can add new widget in <30 minutes
- ✅ Documentation is clear

**Decision Point:**
- ✅ Implement jeśli planujesz marketplace/plugins
- ⏸️ Skip jeśli moduły są stabilne

---

### Phase 2: AI-Ready (Month 2-3) 📅 FUTURE

#### Week 5-7: AI-Native Patterns

**Effort:** High (3 tygodnie)
**Impact:** Medium (future-proof)
**ROI:** 6+ miesięcy

**Tasks:**
```
Week 1: Data Structure
- [ ] Add metadata JSONB fields (operations, orders)
- [ ] Create ai_insights table
- [ ] Migrate existing data
- [ ] Update TypeScript types

Week 2: Event Stream
- [ ] Structured event logging (AI-readable format)
- [ ] Historical data export (for training)
- [ ] Query engine abstraction layer
- [ ] API for AI queries

Week 3: First AI POC
- [ ] Collect 6-12 months historical operation data
- [ ] Build simple regression model (Python/scikit-learn)
- [ ] Create API endpoint (/api/ai/estimate-time)
- [ ] UI integration (show AI estimate)
- [ ] User feedback mechanism
```

**Success Metrics:**
- ✅ Metadata fields populated
- ✅ AI estimate accuracy >70% (vs actual times)
- ✅ Users provide feedback on estimates
- ✅ System learns from feedback

**Decision Point:**
- ✅ Implement jeśli masz data scientist
- ⏸️ Wait 3-6 months jeśli nie

---

#### Week 8-10: AI Features (Optional)

**Effort:** High (3 tygodnie)
**Impact:** High (gdy ready)
**ROI:** 12+ miesięcy

**Tasks:**
```
Week 1: Smart Estimation V2
- [ ] Add confidence intervals
- [ ] Add risk factors detection
- [ ] Improve model (more features)
- [ ] A/B test vs manual estimates

Week 2: Auto-Categorization
- [ ] Train classification model (order categories)
- [ ] API endpoint for categorization
- [ ] UI integration (suggested category)
- [ ] Human-in-loop feedback

Week 3: Predictive Maintenance
- [ ] Anomaly detection model (machine degradation)
- [ ] Alert system for maintenance
- [ ] Dashboard showing machine health
- [ ] ROI tracking (downtime prevented)
```

**Success Metrics:**
- ✅ AI estimates 15-20% better than manual
- ✅ Auto-categorization 80%+ accuracy
- ✅ 1+ maintenance issue prevented
- ✅ Measurable ROI

---

## Cost/Benefit Analysis

### Comparison Table

| Pattern | Implementation | Maintenance | Business Value | Risk | Recommendation |
|---------|---------------|-------------|----------------|------|----------------|
| **Event System** | 2 weeks | Low | 🔥 High | Low | ✅ **DO NOW** |
| **Widget Injection** | 1.5 weeks | Low | 🔥 Med-High* | Low | ⏸️ **IF marketplace** |
| **AI Patterns** | 3 weeks | Medium | 🔥 Medium** | Medium | 📅 **WAIT 3-6mo** |
| DI Container | 4 weeks | High | Low | High | ❌ **SKIP** |
| Encryption | 3 weeks | High | Low*** | High | ❌ **Only if needed** |
| MikroORM | 8 weeks | High | Low | High | ❌ **SKIP** |

*High jeśli marketplace, Medium otherwise
**Medium now, High w przyszłości (12+ months)
***Low dla obecnego rynku, High jeśli enterprise

---

### ROI Timeline

**Event System:**
```
Month 1:  Implementation ✅
Month 2:  5-10 hours/week saved on new features
Month 3+: 20+ hours/week saved, easier debugging
Year 1:   ~500 hours saved = ~€15,000-25,000 value

ROI: 🔥 Immediate
```

**Widget Injection:**
```
Month 1:  Implementation + migration
Month 2:  Neutral (migration overhead)
Month 3+: 10 hours/week saved when adding modules
Year 1:   ~300 hours saved = ~€10,000-15,000 value

ROI: 📅 2-3 miesiące (only if frequent module additions)
```

**AI Patterns:**
```
Month 1-3:  Implementation + training
Month 4-6:  Data collection, model improvement
Month 7-12: 10-15% better estimates = better margins
Year 1:     5-10% margin improvement = €20,000-50,000+ value
Year 2+:    Competitive advantage (hard to quantify)

ROI: 📅 6-12 miesięcy
```

---

### Resource Requirements

**Event System:**
```
Team: 1 senior developer
Skills: TypeScript, Event-driven patterns
External: None
Total cost: ~80 hours × €50/h = €4,000
```

**Widget Injection:**
```
Team: 1 senior developer
Skills: React, TypeScript, Design patterns
External: None
Total cost: ~60 hours × €50/h = €3,000
```

**AI Patterns:**
```
Team: 1 senior developer + 1 data scientist (contract)
Skills: Python, ML, TypeScript
External: AI platform (€100-500/month), Training data storage
Total cost: ~120 hours × €50/h + €5,000 contract = €11,000
```

---

## Action Plan

### Week 1: Research & POC

**Goal:** Understand Open Mercato patterns + Build simple proof-of-concept

```bash
# Day 1: Explore Open Mercato
cd ~/projects
git clone https://github.com/open-mercato/open-mercato
cd open-mercato
yarn install
yarn mercato init
yarn dev

# Study architecture:
- Read: src/modules/*/subscribers/
- Read: packages/shared/src/lib/events/
- Read: AGENTS.md

# Day 2-3: Build Event System POC in CNC-Pilot
- Create lib/events/emitter.ts (simple EventEmitter)
- Create simple event: order.status_changed
- Create simple subscriber: production module listens
- Test: change order status → console log in production subscriber

# Day 4-5: Evaluate & Present
- Document findings
- Present POC to team
- Decide: implement full or not?
```

**Deliverable:** Working POC + decision document

---

### Week 2: Implementation (if approved)

**Goal:** Production-ready Event System for Order → Production flow

```typescript
# Day 1-2: Infrastructure
- [ ] lib/events/emitter.ts (with TypeScript types)
- [ ] lib/events/logger.ts (audit trail to database)
- [ ] lib/events/middleware.ts (error handling, retry)
- [ ] Unit tests (Jest)

# Day 3-4: Integration
- [ ] app/orders/events.ts (emit all order events)
- [ ] app/production/subscribers/ (listen to order events)
- [ ] app/inventory/subscribers/ (listen to order & production events)
- [ ] Integration tests (Playwright)

# Day 5: Rollout
- [ ] Deploy to TEST environment
- [ ] Monitor event logs
- [ ] Fix any issues
- [ ] Documentation for team
```

**Deliverable:** Event system in production, zero coupling

---

### Week 3: Expansion

**Goal:** Event system used by all modules

```typescript
# Day 1-2: Time Tracking
- [ ] app/time-tracking/subscribers/production-subscriber.ts
- [ ] Auto-start timer gdy production plan status = 'in_progress'
- [ ] Auto-stop timer gdy status = 'completed'

# Day 3-4: Notifications
- [ ] app/notifications/subscribers/ (generic event listener)
- [ ] Email notifications dla critical events
- [ ] In-app notifications

# Day 5: Dashboard
- [ ] Event monitoring dashboard (real-time)
- [ ] Event statistics (events/hour, errors, etc.)
- [ ] Debugging tools (replay events, filter by type)
```

**Deliverable:** Full event-driven architecture, monitoring tools

---

### Month 2-3: Widget System (Optional)

**Only if:** Team decides marketplace/plugins is priority

```typescript
# Week 1: Core
- [ ] lib/widgets/registry.ts
- [ ] lib/widgets/WidgetSlot.tsx
- [ ] Documentation

# Week 2: Migration
- [ ] Migrate Order Details widgets
- [ ] Migrate Dashboard widgets
- [ ] Testing

# Week 3: Polish
- [ ] Developer guide
- [ ] Example custom widget
- [ ] Review & feedback
```

---

### Month 3-6: AI Patterns (Future)

**Only if:** Team has data science capability or hires contractor

```typescript
# Month 1: Foundation
- [ ] Add metadata fields
- [ ] Event logging structure
- [ ] Historical data export

# Month 2: POC
- [ ] Simple regression model (operation time estimation)
- [ ] API endpoint
- [ ] UI integration

# Month 3: Iteration
- [ ] Collect feedback
- [ ] Improve model
- [ ] A/B testing
```

---

## Decision Framework

### Pre-Flight Checklist

Przed implementacją dowolnego pattern z Open Mercato, odpowiedz:

#### Event System ✅

- [ ] **Problem:** Czy moduły są zbyt coupled? (direct imports?)
- [ ] **Team:** Czy team rozumie event-driven patterns?
- [ ] **Timeline:** Czy mamy 2 tygodnie na implementation?
- [ ] **Maintenance:** Kto będzie maintainować event system?
- [ ] **Testing:** Jak będziemy testować event flow?

**GO/NO-GO:** Jeśli ≥4 odpowiedzi "TAK" → ✅ **GO**

---

#### Widget Injection ⏸️

- [ ] **Business Need:** Czy planujemy marketplace/plugins?
- [ ] **Frequency:** Czy często dodajemy nowe moduły (>1/miesiąc)?
- [ ] **Complexity:** Czy widgets są często warunkowe (show/hide based on context)?
- [ ] **White-label:** Czy różni klienci potrzebują różnych widgets?
- [ ] **ROI:** Czy korzyści > koszt implementacji (2-3 miesiące)?

**GO/NO-GO:** Jeśli ≥3 odpowiedzi "TAK" → ✅ **GO**, w przeciwnym razie ⏸️ **WAIT**

---

#### AI Patterns 📅

- [ ] **Data:** Czy mamy >1000 historical operations?
- [ ] **Expertise:** Czy mamy data scientist lub możemy zatrudnić?
- [ ] **Budget:** Czy mamy €10-15k na POC?
- [ ] **Timeline:** Czy możemy czekać 6+ miesięcy na ROI?
- [ ] **Competition:** Czy AI features dadzą competitive advantage?

**GO/NO-GO:** Jeśli ≥4 odpowiedzi "TAK" → 📅 **PLAN**, w przeciwnym razie ⏸️ **WAIT**

---

### Risk Assessment

**Low Risk (Safe to implement):**
- ✅ Event System
- ✅ Widget Injection (if need marketplace)

**Medium Risk (Evaluate carefully):**
- ⚠️ AI Patterns (needs expertise)

**High Risk (Skip unless critical need):**
- ❌ DI Container
- ❌ MikroORM Migration
- ❌ Tenant-Scoped Encryption

---

### Success Metrics

**Event System:**
```
Week 1:  POC working
Week 2:  0 direct imports between key modules
Week 4:  All events logged to audit trail
Month 2: 10+ hours/week saved on new features
Month 3: Team comfortable with pattern
```

**Widget Injection:**
```
Week 2:  First widget rendering
Week 4:  5+ widgets migrated
Month 2: Team can add widget in <30 min
Month 3: Positive feedback from developers
```

**AI Patterns:**
```
Month 1: Metadata fields added
Month 2: POC model trained
Month 3: Model accuracy >70%
Month 6: AI estimates used in production
Month 12: 10-15% margin improvement
```

---

## Appendix: Useful Links

### Open Mercato
- **Repository:** https://github.com/open-mercato/open-mercato
- **Documentation:** https://docs.openmercato.com
- **Demo:** https://demo.openmercato.com
- **Discord:** https://discord.gg/f4qwPtJ3qA
- **AGENTS.md:** https://github.com/open-mercato/open-mercato/blob/main/AGENTS.md

### Inspiration & Patterns
- **Event-Driven Architecture:** https://martinfowler.com/articles/201701-event-driven.html
- **Widget/Plugin Systems:** https://www.patterns.dev/posts/plugin-pattern
- **AI-Native Applications:** https://www.sequoiacap.com/article/ai-native-applications/

### CNC-Pilot Context
- **Current Stack:** Next.js 16 + Supabase + TypeScript
- **CLAUDE.md:** Internal docs (architecture, patterns, conventions)
- **Multi-tenancy:** Email domain-based, RLS policies

---

## Questions? Next Steps?

**Contact:**
- Tomek Karwatka (Open Mercato): https://x.com/tomik99
- Piotr Karwatka (Open Mercato): https://x.com/piotrkarwatka

**Recommended Actions:**

1. **This Week:**
   - [ ] Read this document thoroughly
   - [ ] Clone Open Mercato and explore
   - [ ] Build Event System POC (2-3 days)

2. **Next Week:**
   - [ ] Review POC with team
   - [ ] Decide: GO/NO-GO on Event System
   - [ ] If GO: schedule 2-week sprint

3. **Month 2:**
   - [ ] Event System in production
   - [ ] Evaluate Widget System need
   - [ ] Start thinking about AI patterns (6-month plan)

**Decision Point:** Review this plan in 1 month - did Event System deliver value?

---

**Document Version:** 1.0
**Last Updated:** 2026-01-04
**Maintainer:** CTO / Tech Lead
**Review Schedule:** Monthly (or when considering new patterns)
