# 🏭 CNC-Pilot MVP

> Modern production management system for CNC manufacturing workshops

[![Deployment Status](https://img.shields.io/badge/deployment-live-brightgreen)](https://cnc-pilot-mvp.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[🚀 Live Demo](https://cnc-pilot-mvp.vercel.app)** | **[📚 Documentation](https://cnc-pilot-mvp.vercel.app/docs)**

---

## 📋 About The Project

CNC-Pilot is a comprehensive **multi-tenant SaaS solution** designed for small and medium-sized CNC manufacturing companies. It provides complete production management from order creation to delivery, with real-time tracking, inventory management, and detailed reporting.

### ✨ Key Features

- 🎯 **Multi-Tenancy** - Complete data isolation with Row Level Security (RLS)
- 📦 **Order Management** - Full lifecycle from quote to completion
- ⏱️ **Time Tracking** - Built-in timer with automatic cost calculation
- 🏭 **Inventory Management** - Stock levels, materials tracking, low-stock alerts
- 📊 **Dashboard** - Real-time metrics and KPIs
- 📈 **Reports & Analytics** - Export to CSV/Excel/PDF
- 👥 **User Management** - Role-based access control (Owner/Admin/Manager/Operator/Viewer)
- 📚 **Knowledge Portal** - Interactive documentation with Mermaid diagrams
- 🌍 **Multi-language** - Polish & English support
- 🌓 **Dark Mode** - Full dark theme support
- ⚙️ **Production Planning** - Operations routing with Setup/Run Time calculation

---

## 📅 Recent Updates

### 2025-12-15 - Production Module Architecture Refactoring

**Critical Fix: Proper Separation of Concerns**

**Problem:** Operations were incorrectly embedded in Orders module, mixing commercial and technical workflows.

**Solution:** Created separate `/production` module following manufacturing best practices:
- ✅ Orders (📦 Zamówienia) → Commercial layer (customer, deadline, pricing)
- ✅ Production Plans (⚙️ Plan Produkcji) → Technical layer (operations, machines, routing)
- ✅ Operations (🔧 Operacje) → Execution layer (Setup/Run Time, costs)

**Achievements:**
- Created 3 new routes: `/production`, `/production/create`, `/production/[id]`
- Refactored order details page to show production plans section
- Added AppLayout to all production pages (sidebar + topbar)
- Rewrote 23 E2E tests for new architecture
- Updated documentation (TEST_INSTRUCTIONS.md, READY_TO_TEST.md)

**Commits:**
- `f4219a8` - Production module implementation (+3926 lines, 14 files)
- `c8d6396` - E2E tests rewritten for new workflow

**Impact:**
- Proper workflow: Order → "Utwórz Plan Produkcji" → `/production/create?order_id={id}`
- Clear separation improves scalability and maintainability
- Setup/Run Time calculations work correctly in production context

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **State Management:** React 19 + Server Components
- **Forms:** React Hook Form + Zod validation

### Backend & Database
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Security:** Row Level Security (RLS)
- **API:** Next.js API Routes

### Testing & CI/CD
- **Unit Tests:** Vitest (243 tests)
- **E2E Tests:** Playwright
- **CI/CD:** GitHub Actions
- **Deployment:** Vercel
- **Monitoring:** UptimeRobot

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
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
   - This creates all tables, RLS policies, and default data

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser

---

## 📁 Project Structure

```
cnc-pilot-mvp/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication pages
│   ├── (dashboard)/         # Protected pages
│   ├── docs/               # Knowledge Portal (MDX)
│   └── api/                # API routes
├── components/              # React components
│   ├── dashboard/          # Dashboard widgets
│   ├── layout/            # Layout components
│   └── ui/                # shadcn/ui components
├── lib/                    # Utilities & helpers
│   ├── supabase/          # Supabase client
│   ├── auth.ts            # Auth helpers
│   └── translations.ts    # i18n (PL/EN)
├── hooks/                 # Custom React hooks
├── migrations/            # Database migrations
├── tests/                # Unit & E2E tests
└── middleware.ts         # Session & route protection
```

---

## 🧪 Testing

### Unit Tests (Vitest)
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:ui           # Vitest UI
```

**Coverage:** 243 unit tests covering critical business logic

### E2E Tests (Playwright)
```bash
npm run test:e2e          # Headless mode
npm run test:e2e:ui       # Interactive UI mode
```

---

## 📸 Screenshots

> Coming soon - Dashboard, Orders, Time Tracking, Reports

---

## 🏗️ Architecture Highlights

### Multi-Tenancy Implementation
- **Email domain-based** company identification
- Automatic company assignment during registration
- Database-level isolation with RLS
- Blocked public domains (gmail.com, etc.)

### Security Features
- Row Level Security (RLS) on all tables
- Rate limiting on sensitive endpoints
- Input sanitization (DOMPurify)
- Environment variable validation
- Secure session management

### Performance
- Server Components for optimal performance
- Parallel data fetching with Promise.all
- Optimistic UI updates
- Image optimization
- ~2 second cold start with Turbopack

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Jakub Ren**
- GitHub: [@JakubRen](https://github.com/JakubRen)
- Project Link: [https://github.com/JakubRen/cnc-pilot-mvp](https://github.com/JakubRen/cnc-pilot-mvp)
- Live Demo: [https://cnc-pilot-mvp.vercel.app](https://cnc-pilot-mvp.vercel.app)

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database & Auth by [Supabase](https://supabase.com/)
- Deployed on [Vercel](https://vercel.com/)
- Developed with assistance from [Claude Code](https://claude.com/claude-code)

---

<p align="center">Made with ❤️ for CNC manufacturers</p>
