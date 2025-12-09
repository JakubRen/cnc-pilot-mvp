# CNC-Pilot MVP

System zarządzania produkcją dla firm CNC - kompleksowe rozwiązanie do zarządzania zamówieniami, czasem pracy, magazynem i raportowaniem.

## 📋 Opis projektu

CNC-Pilot to aplikacja SaaS typu multi-tenant, zaprojektowana dla małych i średnich firm zajmujących się obróbką CNC. System zapewnia:

- **Multi-tenancy** - pełna izolacja danych między firmami na poziomie RLS (Row Level Security)
- **Zarządzanie zamówieniami** - od oferty po realizację
- **Śledzenie czasu pracy** - timer + automatyczne obliczanie kosztów
- **Magazyn** - stany, wydania, alerty niskiego stanu
- **Portal Wiedzy** - dokumentacja z interaktywnymi diagramami Mermaid
- **Raporty** - eksport do CSV/Excel/PDF

## 🛠️ Tech Stack

| Kategoria | Technologia |
|-----------|-------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Język** | TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Database** | Supabase (PostgreSQL + RLS) |
| **Auth** | Supabase Auth |
| **Testing** | Vitest (243 unit tests) + Playwright (E2E) |
| **CI/CD** | GitHub Actions |
| **Deployment** | Vercel |
| **Monitoring** | UptimeRobot |
| **Documentation** | MDX + Mermaid.js |
| **AI Assistant** | Claude Code (patrz: CLAUDE.md) |

## ✨ Features

### Główne moduły
- 📊 **Dashboard** - przegląd kluczowych metryk
- 📦 **Zamówienia** - zarządzanie zleceniami produkcyjnymi
- 📅 **Kalendarz** - harmonogram realizacji
- 🏭 **Magazyn** - stany materiałów i narzędzi
- 📄 **Dokumenty** - oferty, faktury, protokoły
- 📁 **Pliki** - rysunki techniczne, dokumentacja
- ⏱️ **Śledzenie czasu** - timer + koszty pracy
- ✅ **Kontrola jakości** - protokoły QC
- 🚚 **Współpraca** - podwykonawcy i dostawcy
- 🔧 **Maszyny** - status i wykorzystanie maszyn
- 🌱 **Ślad węglowy** - monitoring zużycia energii
- 💰 **Koszty** - analiza rentowności
- 📈 **Raporty** - eksport danych
- 🏷️ **Tagi** - kategoryzacja
- 👥 **Użytkownicy** - zarządzanie uprawnieniami

### Portal Wiedzy (Knowledge Base)
- 📚 **Getting Started** - pierwsze kroki w systemie
- ❓ **FAQ** - najczęściej zadawane pytania
- 🎥 **Video Tutorials** - tutoriale wideo
- 📊 **Flowcharts** - interaktywne diagramy Mermaid
  - Proces rejestracji użytkownika
  - Proces logowania
  - Tworzenie zamówienia
  - Śledzenie czasu pracy
  - Wydanie materiału z magazynu
  - Aktywacja użytkownika przez admina
  - Multi-tenancy izolacja danych
  - Generowanie raportu

## 📁 Struktura projektu

```
cnc-pilot-mvp/
├── app/                      # Next.js App Router
│   ├── docs/                # Portal Wiedzy (MDX)
│   │   ├── flowcharts/      # Diagramy procesów
│   │   ├── user-guide/      # Pierwsze kroki
│   │   ├── faq/             # FAQ
│   │   └── video-tutorials/ # Tutoriale
│   ├── (auth)/              # Strony autentykacji
│   └── (dashboard)/         # Chronione strony
├── components/              # Komponenty React
│   ├── docs/               # Komponenty dokumentacji
│   │   └── MermaidDiagram.tsx  # Renderer diagramów
│   ├── layout/             # Layout components
│   └── ui/                 # shadcn/ui components
├── lib/                    # Utilities
│   ├── supabase/          # Klient Supabase
│   ├── auth.ts            # Helpery autentykacji
│   └── translations.ts    # i18n (PL/EN)
├── hooks/                 # Custom React hooks
├── tests/                 # Testy
│   ├── unit/             # 243 unit tests (Vitest)
│   └── e2e/              # E2E tests (Playwright)
├── middleware.ts          # Session refresh + protected routes
├── mdx-components.tsx     # Konfiguracja MDX + Mermaid
└── next.config.ts         # Next.js config

CLAUDE.md                  # Executive Team System (CEO/COO/CSO/CMO/CTO)
```

## 🚀 Setup

### Wymagania
- Node.js 18+
- npm/yarn/pnpm
- Konto Supabase

### Instalacja

1. **Clone repository:**
```bash
git clone https://github.com/JakubRen/cnc-pilot-mvp.git
cd cnc-pilot-mvp
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
```bash
cp .env.example .env.local
```

Uzupełnij `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

4. **Run development server:**
```bash
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

### Unit Tests (Vitest)
```bash
npm run test           # Uruchom wszystkie testy
npm run test:watch     # Watch mode
npm run test:ui        # Vitest UI
```

**Coverage:** 243 testy jednostkowe

### E2E Tests (Playwright)
```bash
npm run test:e2e       # Headless mode
npm run test:e2e:ui    # Playwright UI mode
```

**Test suites:**
- Homepage load
- User registration flow
- Login flow
- Orders CRUD
- Time tracking
- Docs navigation

### CI/CD
GitHub Actions automatycznie uruchamia:
- ✅ Unit tests (Vitest)
- ✅ E2E tests (Playwright)
- ✅ Build verification
- ✅ Lint & Type checking (ESLint + TypeScript)
- ✅ Security checks (CVE scanning)

**Status:** 🟢 All checks passing (0 errors, 91 warnings)

## 🌐 Deployment

### Vercel (Production)
```bash
npm run build          # Build production
vercel deploy          # Deploy preview
vercel --prod          # Deploy to production
```

**Environment variables required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Status Monitoring
- [UptimeRobot Status](https://stats.uptimerobot.com/g4Pua2N0Z3)

## 🔒 Multi-Tenancy Architecture

System zapewnia pełną izolację danych między firmami:

1. **Rejestracja:**
   - Email firmowy (nie gmail/wp/onet)
   - Automatyczne wyciągnięcie domeny
   - Przypisanie `company_id` z tabeli `companies`

2. **Row Level Security (RLS):**
   - Wszystkie tabele: `company_id` filter
   - Polityki RLS na poziomie Supabase
   - Niemożliwy wyciek danych między firmami

3. **Middleware:**
   - Automatyczne dodawanie `company_id` do queries
   - Session refresh
   - Protected routes

## 🤖 AI Development (CLAUDE.md)

Projekt używa **Executive Team System** - 5 wyspecjalizowanych AI asystentów:

- `@CEO` - Strategia, finanse, stress testy
- `@COO` - Egzekucja, procesy, brutalna szczerość
- `@CSO` - Sprzedaż, pipeline, pricing
- `@CMO` - Marketing, leady, content
- `@CTO` - Tech stack, debugging, architektura

**Więcej:** Zobacz `CLAUDE.md` w katalogu głównym projektu.

## 📚 Documentation

### Portal Wiedzy (wbudowany)
Dostępny w aplikacji pod `/docs`:
- Interaktywne diagramy Mermaid
- FAQ i poradniki
- Video tutorials
- Flowcharty procesów

### External Links
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Mermaid.js](https://mermaid.js.org)

## 🐛 Known Issues

1. **Turbopack + MDX plugins**
   - `rehype-highlight` powoduje błąd serializacji
   - **Rozwiązanie:** Usunięto, Mermaid renderowany client-side
   - **Status:** Działa poprawnie

2. **E2E tests w CI**
   - Timeouty podczas nawigacji linkowej
   - **Rozwiązanie:** Refactor na bezpośrednie `goto()`
   - **Status:** Naprawione

## 🔄 Recent Updates

**2025-12-09** - TypeScript & CI/CD Fixes
- ✅ Naprawiono wszystkie błędy TypeScript (19 errors → 0 errors)
- ✅ Rozwiązano problemy case sensitivity (Badge.tsx → badge.tsx, Card.tsx → card.tsx)
- ✅ Naprawiono useRef typing issues w hookach (useAutosave, useInfiniteScroll, useRealTimeData)
- ✅ Naprawiono Playwright API errors (toHaveCount, nth property)
- ✅ Naprawiono component prop types (FormField, KeyboardShortcutsHelp, OrdersChart)
- ✅ Naprawiono test type assertions (IntersectionObserverEntry, export columns)
- ✅ GitHub Actions CI/CD: 🟢 All checks passing
- 📝 Commits: `ab3f8d0`, `f833d07`, `f41ca14`, `8fbe5bc`, `05cce16`, `6a45c51`

**2024-12-07** - Portal Wiedzy + Mermaid
- ✅ Dodano `/docs` z 4 sekcjami
- ✅ Integracja Mermaid.js dla flowchartów
- ✅ Link "Portal Wiedzy" w sidebarze
- ✅ 8 interaktywnych diagramów procesów
- ✅ CI/CD przechodzi bez błędów

**2024-12-07** - Security Update
- ✅ Next.js 16.0.1 → 16.0.7 (fix CVE-2025-66478)

## 📄 License

Proprietary - All rights reserved

## 👤 Author

**Jakub Ren**
- GitHub: [@JakubRen](https://github.com/JakubRen)

## 🔗 Links

- **Production:** [Vercel deployment URL]
- **Repository:** https://github.com/JakubRen/cnc-pilot-mvp
- **Status:** [UptimeRobot](https://stats.uptimerobot.com/g4Pua2N0Z3)

---

© 2024 CNC-Pilot - Production Management System
