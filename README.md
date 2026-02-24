# CNC-Pilot MVP

> Modern production management system for CNC manufacturing workshops

[![Deployment Status](https://img.shields.io/badge/deployment-live-brightgreen)](https://cnc-pilot-mvp.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/tests-681%2B%20unit%20%2B%2047%20E2E-green)](.)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[Live Demo](https://cnc-pilot-mvp.vercel.app)** | **[Documentation](https://cnc-pilot-mvp.vercel.app/docs)** | **[Changelog](./CHANGELOG.md)**

---

## About

CNC-Pilot is a multi-tenant SaaS solution for small and medium-sized CNC manufacturing companies. It covers the full production lifecycle — from order creation and quoting, through production planning and execution, to delivery and cost analysis. Built with AI-powered features using Gemini 2.5 Flash for intelligent automation at zero API cost.

---

## Key Features

- **Order Management** — Full lifecycle from quote to completion with multi-item orders
- **Production Planning** — Operations routing with setup/run time calculation and interactive execution
- **Kanban & Swimlanes** — Drag-and-drop board views with @dnd-kit
- **Time Tracking** — Built-in timers with automatic cost calculation
- **Inventory Management** — Stock levels, batch tracking, low-stock alerts, auto-reorder
- **AI Features** — 20 Gemini-powered features (see [AI Features](#ai-features) below)
- **Quality Control** — Quick Measure flow, tolerance tracking, defect prediction
- **Dashboard** — Real-time metrics, anomaly alerts, AI insights
- **Quotes & Pricing** — AI quote import (PDF/email), dynamic pricing engine, ABC costing
- **Customer Intelligence** — CLV predictions, churn risk scoring, auto-tiering
- **Reports & Analytics** — AI summaries, revenue/demand forecasting, export to CSV/Excel/PDF
- **Knowledge Portal** — Interactive documentation with Mermaid diagrams
- **Multi-tenancy** — Row Level Security with email domain-based isolation
- **Role-based Access** — Owner / Admin / Manager / Operator / Viewer
- **Multi-language** — Polish & English
- **Dark Mode** — Full dark theme support

---

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **State:** React 19 + Server Components
- **Forms:** React Hook Form + Zod validation

### Backend & Database
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Security:** Row Level Security (RLS) on all tables
- **API:** Next.js API Routes
- **AI:** Gemini 2.5 Flash (free tier)

### Testing & CI/CD
- **Unit Tests:** Vitest (681+ tests)
- **E2E Tests:** Playwright (47/48 passing)
- **CI/CD:** GitHub Actions
- **Deployment:** Vercel
- **Monitoring:** UptimeRobot

---

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account ([free tier available](https://supabase.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/JakubRen/cnc-pilot-mvp.git
   cd cnc-pilot-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Fill in your Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Set up the database**
   - Create a new Supabase project
   - Run the SQL migration: `migrations/DAY_10_COMPLETE_SETUP.sql`

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

### Database Migrations

Full documentation: [SMART_MIGRATIONS.md](./SMART_MIGRATIONS.md)

```bash
npm run migrate:status          # Check what's applied/pending
npm run migrate:diff            # Compare TEST vs PROD
npm run migration:new <name>    # Create new migration (with auto-tracking)
npm run migration:show <name>   # Display SQL to copy
```

---

## Testing

### Unit Tests (Vitest)
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

### E2E Tests (Playwright)
```bash
npm run test:e2e          # Headless mode
npm run test:e2e:ui       # Interactive UI mode
```

---

## Architecture Highlights

### Multi-Tenancy
- Email domain-based company identification
- Automatic company assignment during registration
- Database-level isolation with RLS
- Blocked public domains (gmail.com, etc.)

### Security
- Row Level Security (RLS) on all tables
- Rate limiting on sensitive endpoints
- Input sanitization (DOMPurify)
- Prompt injection sanitizer for AI features
- Secure session management

### Performance
- Server Components for optimal rendering
- Parallel data fetching with Promise.all
- Optimistic UI updates with rollback
- ~2 second cold start with Turbopack

---

## AI Features

20 AI features powered by Gemini 2.5 Flash (free tier, ~2.3% rate budget):

| Phase | Features |
|-------|----------|
| **Phase 0 — Cleanup** | Unified Gemini client, report summary dedup, prompt injection sanitizer |
| **Phase 1 — Quick Wins** | Smart anomaly explanations, CLV predictions, feedback loop, auto-tagging |
| **Phase 2 — Production AI** | AI production plan generator, predictive deadlines, order auto-fill, PDF/image quote import, smart deadline manager, auto-reorder materials |
| **Phase 3 — Analytics** | Dynamic pricing engine, demand forecasting, quality defect prediction, revenue forecasting |
| **AI Expansion** | Report AI summaries (4 pages), customer intelligence (churn risk), inventory predictions (stockout forecasting) |

---

## Recent Updates

| Date | Update |
|------|--------|
| 2026-02-14 | Customer Detail Page Redesign + CLV Panel with 8 metrics |
| 2026-02-13 | AI Master Plan Phases 0-3 — 20 AI features, 681+ unit tests |
| 2026-02-11 | AI Expansion Sprint + Kanban & Swimlanes Views |

**[View Full Changelog](./CHANGELOG.md)**

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

**Jakub Ren** - Product Manager & AI-Assisted Development Specialist

- **GitHub:** [@JakubRen](https://github.com/JakubRen)
- **Email:** jakub.renkowski@outlook.com

**Development Approach:** Product Management + AI-Assisted Development (Claude Code)
**Repository:** [github.com/JakubRen/cnc-pilot-mvp](https://github.com/JakubRen/cnc-pilot-mvp) | **Live:** [cnc-pilot-mvp.vercel.app](https://cnc-pilot-mvp.vercel.app)

---

## Acknowledgments

- Built with [Next.js](https://nextjs.org/) + [shadcn/ui](https://ui.shadcn.com/)
- Database & Auth by [Supabase](https://supabase.com/)
- AI by [Google Gemini](https://ai.google.dev/)
- Deployed on [Vercel](https://vercel.com/)
- Developed with [Claude Code](https://claude.com/claude-code)

---

<p align="center">Made with CNC manufacturers in mind</p>
