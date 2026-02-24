# Changelog

All notable changes to CNC-Pilot MVP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Customer Detail Page Redesign + CLV Panel (2026-02-14)

- **Tabbed interface** for customer detail page — 4 tabs: Ogólne, Oferty, Zamówienia, Predykcje
- **Full CLV Predictions Panel** with 8 metrics: annual value, lifetime value, confidence, trend, avg order value, order frequency, churn risk, status distribution, preferred materials, seasonality histogram, avg margin, production type
- **Extended orders query** with material, quantity, margin_percent for richer analytics
- **Bug fix:** SmartEstimateCard `<button>` missing `type="button"` caused form submission
- **Manual testing Phase 1-2:** 5/17 features verified, 2 bugs found (1 fixed, 1 planned)

### AI Master Plan — Phases 0-3 (2026-02-13)

20 AI features implemented across 4 phases with unified architecture, 681+ unit tests.

**Phase 0 — Architecture Cleanup (3 features):**
| Feature | Description |
|---------|------------|
| callGemini() Migration | All AI files unified under `gemini-client.ts` wrapper |
| Report Summary Dedup | Merged `report-summary.ts` + `report-summaries.ts` → single file |
| Prompt Injection Sanitizer | `lib/ai/security/sanitizer.ts` — injection pattern detection, HTML/XSS stripping |

**Phase 1 — Quick Wins (4 features):**
| Feature | Description |
|---------|------------|
| Smart Anomaly Explanations | AI-enriched alerts with root cause + recommended action |
| Customer Lifetime Value (CLV) | 6-month revenue prediction with trend analysis per customer |
| Feedback Loop Activation | `feedback-logger.ts` wired for golden dataset |
| Auto-Tagging | AI suggests tags (material, complexity, machine, urgency) on order creation |

**Phase 2 — Production AI + Smart Orders (6 features):**
| Feature | Description |
|---------|------------|
| AI Production Plan Generator | One-click operation list generation with historical few-shot examples |
| Predictive Deadlines v2 | Complexity x material x quantity + machine load analysis |
| Order Auto-Fill v2 | Fuzzy search past orders by part name + recency scoring |
| PDF/Image Quote Import | Multimodal Gemini (PDF/JPG/PNG) + customer auto-matching |
| Smart Deadline Manager | Completion likelihood scoring (green/amber/red badges) |
| Auto-Reorder Materials | EOQ (Wilson formula) + supplier grouping + urgency detection |

**Phase 3 — Intelligent Analytics (4 features):**
| Feature | Description |
|---------|------------|
| Dynamic Pricing Engine | 5-factor multiplicative pricing |
| Demand Forecasting | SMA-3 with trend detection + seasonality, 30/60/90d projections |
| Quality Defect Prediction | Weighted 5-factor risk model |
| Revenue Forecasting | Monthly revenue/cost/profit aggregation, optimization suggestions |

**New Files:** ~50 | **Test Count:** 681+ unit tests | **TS Errors:** 0

### AI Expansion Sprint (2026-02-11)

3 AI-powered features with unified Gemini infrastructure:

| Feature | Description |
|---------|------------|
| Report AI Summaries | Button-triggered component on 4 report pages. 4h cache, Polish summaries |
| Customer Intelligence | Churn risk scoring (high/medium/low), inactive customer alerts (>30 days). 12h cache |
| Inventory Predictions | Usage velocity calculation, stockout date forecasting, reorder alerts. 8h cache |

Infrastructure: Unified Gemini Client (`callGemini<T>()`), Generic AI Cache (`ai_cache` table with RLS), Schema Types separation.

**Commits:** `f4c8859`, `a485444`, `b965bbb`

### Kanban & Swimlanes Views (2026-02-11)

3-way view toggle (Table|Kanban|Swimlanes) for orders page with @dnd-kit drag & drop.

**Commit:** `f4c8859`

### AI & Intelligence Features Session (2026-02-09)

Full AI migration to Gemini 2.5 Flash (free tier):
- AI Dashboard Insights, OpenAI → Gemini Migration, Smart Historical Estimation
- Anomaly Alerts, Drag & Drop Calendar, Customer Scoring, Predictive Deadlines

### Phase 1 Feature Plan — 5 Features (2026-02-05)

- Realtime Order List, Smart Dashboard CTAs, Quick Order Modal
- Order Timeline (6th Tab), Kiosk Work Queue

### Order Details Tabbed Interface (2026-02-04)

5-tab interface: Podstawowe, Opis, Produkcja, Finanse, Jakosc. Sticky header, fade-in animations.

**Commit:** `40f987a`

### Simplified QC Flow + Tolerances Bug Fix (2026-02-03)

- Quick Measure feature — simplified QC flow without creating QC plans
- Critical bug fix: order_items missing tolerance columns (silent data loss)
- Migrations: `add_tolerances_to_order_items.sql`, `quick_measure_support.sql`

### Design System Overhaul: Violet/Gray Palette (2026-02-02)

- ~130 `.tsx` files updated: all `blue-*` → `violet-*`
- Font: Geist Mono → Geist Sans
- 0 TypeScript errors, 267/267 unit tests passed

### Multi-Item Orders + Module Reorganization (2026-02-01)

- Multi-position order form with "+ Dodaj kolejna pozycje" button
- RLS Migration: `FIX_ORDER_ITEMS_RLS.sql`
- Module Reorganization: carbon, costs, quality-control moved to `app/reports/`
- Commits: `566c484`, `8aa276a`, `c368722`

### Order Dimensions with Tolerances + Auto QC Plan (2026-01-30)

- L×W×H dimensions with tolerances, auto-generated QC plans from order data
- Commit: `3e0a842`

### Production Execution Flow + Ready to Ship Status (2026-01-30)

- Interactive production execution with per-operation Start/Stop timers
- New `ready_to_ship` order status
- Commit: `4163159`

### AI Quote Parsing with Function Calling (2026-01-30)

- Gemini Function Calling endpoint for real inventory search
- AIImportDialog for pasting email text with inventory status badges
- Commits: `8601c09`, `a944d17`, `f034a7e`, `11b574a`

### Smart Migration System (2026-01-27)

- `schema_migrations` table auto-tracks applied migrations
- Commands: `migrate:status`, `migrate:diff`, `migration:new`, `migration:show`
- Compare TEST vs PROD with one command

### ABC Pricing Schema — IN PROGRESS (2026-01-13)

- Activity-Based Costing infrastructure: `machine_costs`, `external_services`, `pricing_config`
- `lib/pricing/abc-engine.ts` — complete ABC calculation engine
- Status: Awaiting UX simplification (15 fields → 3-4)

### Unified Quote Form + Document Workflow Fixes (2026-01-12)

- Merged Express Quote into single multi-item "Nowa Oferta" form
- Commit: `31c6f1b`

### UX Polish Batch 3 (2026-01-11)

- ConfirmationDialog with `useConfirmation` hook (replaced 13 `window.confirm()` calls)
- SearchInput component, Breadcrumbs navigation
- Commit: `56b302e`

### Inventory Table Enhancement + Documents Fix (2026-01-07)

- Filter Drawer + column config for /inventory
- Documents module: PW selects from products, RW/WZ from inventory
- Commit: `cc4f09a`

### Filter Drawer for Products (2026-01-07)

- Advanced filtering system with slide-in drawer
- Commit: `b7868a7`

### E2E Test Reliability — Phases 3-5 (2025-12-30 — 2026-01-06)

- Phase 3: 40/48 passing (83.3%)
- Phase 4: 38/48 stable, paradigm shift to behavior verification
- Phase 5: 47/48 passing (97.9%), `.fill()` > `.evaluate()` for React forms
- Split Query Solution: 46/48 passing, complex nested JOIN → 3 separate queries

### TEST/PROD Database Workflow (2026-01-03)

- Established proper TEST/PROD workflow
- Synchronized 24 permissions for 6 modules

### E2E Test Compilation Fixes & CI/CD (2025-12-31)

- Fixed 32 TypeScript syntax errors in E2E tests
- Enabled E2E tests in CI/CD pipeline

---

## [2.2.0] - 2025-12-19

### UX/UI Improvements & Accessibility (WCAG 2.1 AA)

- 6 new mobile components (ResponsiveOrderList, OrderCard, LoadingButton, TouchSelect, 3 skeletons)
- Optimistic UI updates with rollback support (3 operations: status, delete, bulk)
- Skip link, LiveRegion system, comprehensive ARIA labels
- Commit: `46972be`

### Products Module — Inventory Architecture Refactoring

- Split single inventory table into: products, inventory_locations, inventory_batches, inventory_movements
- New `/products` module for product catalog management
- 11 modules with skeleton loading states
- Migration: `REFACTOR_INVENTORY_TO_PRODUCTS.sql`
- Commits: `2a8f0d5`, `d1e2537`

---

## [2.1.0] - 2025-12-16

### Code Quality & Type Safety

- Type coverage: 80% → 95%, `as any`: 125 → 2 (-98%)
- Created typed translation wrappers: `tCarbon()`, `tCooperation()`, `tNav()`
- 5 new type files: orders.ts, inventory.ts, users.ts, customers.ts, quotes.ts
- Structured logging replacing all `console.log` statements

### Auto Document Numbering

- 4 PostgreSQL RPC functions: `generate_order_number()`, `generate_qc_report_number()`, etc.
- Format: PREFIX-YYYY-NNNN with yearly reset, company-scoped

### Customers & Quotes Modules

- Full CRUD for customers with `QuickAddCustomerModal`
- Quote management with unified pricing engine

---

## [2.0.0] - 2025-12-15

### Production Module Refactoring

- Separated commercial (Orders) from execution (Production Plans)
- Three-layer architecture: Orders → Production Plans → Operations
- Rewrote 23 E2E tests for new architecture
- Commits: `f4219a8`, `c8d6396`

---

## [1.0.0] - 2025-12-01

### Initial Release

- Multi-tenant SaaS with Row Level Security
- Order management, time tracking, inventory management
- Real-time dashboard, role-based access control
- Knowledge Portal, multi-language (PL/EN), dark mode
- Next.js 16, TypeScript 5, Tailwind CSS 4, Supabase, Vitest, Playwright

---

[Unreleased]: https://github.com/JakubRen/cnc-pilot-mvp/compare/v2.2.0...HEAD
[2.2.0]: https://github.com/JakubRen/cnc-pilot-mvp/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/JakubRen/cnc-pilot-mvp/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/JakubRen/cnc-pilot-mvp/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/JakubRen/cnc-pilot-mvp/releases/tag/v1.0.0
