# Future Implementation Plan

---

## 🟡 Day 10: Multi-Tenancy Architecture + Auth Security (PLANNING - 2025-01-12)

### Planowane funkcje:

**Część 1: Multi-Tenancy Architecture Decision** ✅ **WYBRANO OPCJĘ D**
- ✅ **Opcja D (Email Domain-Based) - Wariant B (Admin-controlled)**
- 🟡 Implementacja email domain identification
- 🟡 Database schema: `company_email_domains` table
- 🟡 Walidacja firmowych domen email przy rejestracji
- 🟡 Blokowanie publicznych domen (gmail, wp, o2)
- 🟡 Migration istniejących danych
- 🟡 Data isolation testing

**Część 2: Auth & Security Enhancements** ✅ **INCLUDED**
- ✅ Email verification po rejestracji (kompletna implementacja)
- ✅ Password reset flow (forgot password + reset pages)
- ✅ Password strength validation (real-time feedback)
- 🟡 Session management improvements (optional)

**Część 3: UI/UX Improvements (Optional)**
- 🟡 Loading states (skeleton loaders, spinners)
- 🟡 Toast notifications (error/success messages)
- 🟡 Error boundaries i error handling
- 🟡 Real-time dashboard updates (optional)

### ✅ Wybrana opcja: **Opcja D - Email Domain-Based (Wariant B)**

**Jak działa:**
- User loguje się emailem: `jan.kowalski@firma1.pl`
- System automatycznie rozpoznaje firmę po domenie: `@firma1.pl`
- Admin ręcznie whitelistuje domeny firmowe w bazie
- Publiczne domeny (gmail, wp) są blokowane

**Dlaczego Opcja D:**
- ✅ Naturalne - email jest już wymagany
- ✅ Zero dodatkowych pól/kodów do zapamiętania
- ✅ Pełna kontrola admina (whitelist domen)
- ✅ Szybka implementacja (~4h)
- ✅ Jedna domena aplikacji

### Pliki do stworzenia:

**Multi-Tenancy (Opcja D):**
```
migrations/create_company_email_domains.sql        # Tabela domen firmowych
migrations/create_blocked_email_domains.sql        # Tabela zablokowanych domen
lib/email-utils.ts                                 # Email domain helpers
app/register/page.tsx (update)                     # Walidacja domeny przy rejestracji
create_auth_trigger.sql (update)                   # Trigger bez hardcoded company
app/admin/companies/page.tsx                       # Admin panel firm i domen
```

**Auth & Security:**
```
app/auth/confirm/route.ts                          # Email verification handler
app/forgot-password/page.tsx                       # Password reset request
app/reset-password/page.tsx                        # Password reset handler
lib/password-validation.ts                         # Password strength check
```

**UI/UX (Optional):**
```
components/ui/LoadingSpinner.tsx                   # Loading states
components/ui/Toast.tsx                            # Toast notifications
```

### Estymowany czas: 6-8 godzin

**✅ Decyzje podjęte:**
- ✅ Multi-tenancy: **Opcja D (Email Domain-Based, Wariant B)**
- ✅ Email verification: **TAK** (kompletna implementacja)
- ✅ Password reset: **TAK** (forgot + reset pages)
- ❌ 2FA w Day 10: **NIE** (zostaw na Day 11)

**Status:** ✅ Ready → Starting Implementation

**Szczegóły:** Zobacz `plan/Day_10_actionplan.md`

---

## ✅ Day 9: Dashboard + Navigation (COMPLETED - 2025-01-12)

### Zrealizowane funkcje:
- ✅ Dashboard jako główna strona (route `/`)
- ✅ Fixed left sidebar z 5 sekcjami nawigacji
- ✅ Active state highlighting
- ✅ Logout button w sidebarze
- ✅ User profile dropdown w headerze
- ✅ Collapsible sidebar dla mobile (< 1024px)
- ✅ Responsive layout (desktop/tablet/mobile)
- ✅ Bug fixes w dashboard queries
- ✅ Multi-tenancy setup (default company + trigger)
- ✅ Layout fixes (positioning, padding, scrolling)

### Nowe komponenty:
- `components/layout/Sidebar.tsx`
- `components/layout/Header.tsx`
- `components/layout/AppLayout.tsx`
- `app/logout/page.tsx`

### SQL Scripts:
- `setup_default_company.sql`
- `create_auth_trigger.sql`

**Status:** Production Ready 🚀

---

## 🏢 Multi-Tenancy / Company Management (CRITICAL)

### Current Issue
- Company jest tworzona przy każdej rejestracji użytkownika (ZŁE!)
- Brak automatycznego przypisywania company_id
- Brak mechanizmu identyfikacji firmy przed rejestracją

### Problem
W aplikacji SaaS dla wielu firm CNC, **firma powinna istnieć PRZED rejestracją użytkowników**, nie przy każdej rejestracji.

### Rozwiązania do rozważenia:

#### **Opcja A: Subdomena per firma** ⭐ RECOMMENDED
```
firma1.cnc-pilot.com → company_id = "firma1"
firma2.cnc-pilot.com → company_id = "firma2"
```

**Implementacja:**
- Middleware sprawdza subdomenę z `request.headers.host`
- Mapuje subdomenę na company_id
- Wszystkie zapytania automatycznie filtrowane po company_id
- Database: `companies` tabela z kolumną `subdomain` (unique)

**Pros:**
- Profesjonalne, typowe dla SaaS
- Czyste oddzielenie firm
- Łatwe w użyciu dla klientów

**Cons:**
- Wymaga konfiguracji DNS dla każdej firmy
- Wildcard SSL certificate

---

#### **Opcja B: Company code przy rejestracji**
```
Rejestracja: email + password + company_code (np. "ABC123")
System przypisuje do właściwej firmy
```

**Implementacja:**
- Każda firma dostaje unikalny kod (np. "ABC123")
- Kod generowany przy tworzeniu firmy w bazie
- Formularz rejestracji zawiera pole "Company Code"
- Sprawdzenie czy kod istnieje przed utworzeniem użytkownika

**Pros:**
- Proste do zaimplementowania
- Nie wymaga DNS ani subdomen
- Jedna domena dla wszystkich

**Cons:**
- Użytkownicy muszą znać kod firmy
- Ryzyko pomyłek (wpisanie złego kodu)

---

#### **Opcja C: Osobny deployment per firma**
```
ENV: COMPANY_ID=firma1
Jeden kod, różne wdrożenia (Vercel/Docker)
```

**Implementacja:**
- Zmienna środowiskowa `NEXT_PUBLIC_COMPANY_ID`
- Middleware automatycznie używa tego ID
- Osobny deployment dla każdego klienta

**Pros:**
- Najprostsze dla małej ilości klientów (< 10)
- Maksymalna izolacja
- Każda firma może mieć własną domenę

**Cons:**
- Skalowanie = więcej deploymentów
- Zarządzanie updateami (N instancji)
- Wyższe koszty hostingu

---

### Rekomendowane Etapy Implementacji

**Phase 1: Tymczasowe fix (DONE)**
- ✅ Database trigger: `handle_new_user()` automatycznie przypisuje default company
- ✅ Skrypt SQL: `setup_default_company.sql` tworzy domyślną firmę
- ✅ Fix istniejących userów bez company_id

**Phase 2: Proper Multi-Tenancy (TODO)**
1. Zdecydować: Opcja A, B czy C
2. Zaimplementować identyfikację firmy
3. Usunąć default company
4. Migration: Przekonwertować istniejące dane

**Phase 3: Company Onboarding (TODO)**
1. Admin panel do tworzenia nowych firm
2. Setup wizard dla nowej firmy
3. Company settings page
4. Przenoszenie użytkowników między firmami (opcjonalne)

---

## 🔐 Auth & Security

### TODO
- [ ] Email verification po rejestracji
- [ ] Password reset flow
- [ ] Two-factor authentication (2FA)
- [ ] Session management (timeout, refresh tokens)
- [ ] API rate limiting per company

---

## 🎨 UI/UX Improvements

### Sidebar Navigation
- ✅ Fixed left sidebar with navigation
- ✅ Active state highlighting
- ✅ Collapsible sidebar (mobile)
- ✅ User profile dropdown w headerze
- ✅ Logout button w sidebarze

### Dashboard
- ✅ Dashboard na route `/`
- ✅ Podstawowe metryki i karty
- [ ] Real-time updates (WebSockets/Polling)
- [ ] Custom dashboard layouts per user
- [ ] Export danych do PDF/Excel

---

## 📊 Features Backlog

### Time Tracking
- [ ] Multi-timer support (wiele timerów jednocześnie)
- [ ] Pause/resume timer
- [ ] Timer history i edycja
- [ ] Automated stale timer detection (już działa bazowo)

### Orders Management
- [ ] Kalendarz zleceń (timeline view)
- [ ] Drag-and-drop order prioritization
- [ ] Order templates (często powtarzające się zlecenia)
- [ ] Customer management (dedykowana tabela klientów)

### Inventory
- [ ] Barcode scanning
- [ ] Low stock alerts (email/SMS)
- [ ] Automated reordering
- [ ] Supplier integration

### Reporting
- [ ] Custom reports builder
- [ ] Scheduled reports (daily/weekly email)
- [ ] Financial reports (revenue, costs)
- [ ] Production efficiency metrics

---

## 🤖 AI Integration (Phase 2)

### Chatbot Assistant
- [ ] Natural language queries ("Pokaż zlecenia z tego tygodnia")
- [ ] Automated task creation
- [ ] Smart notifications
- [ ] Predictive analytics

**Requirements:**
- Anthropic API Key (`ANTHROPIC_API_KEY`)
- Supabase Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`)

---

## 🚀 Deployment & DevOps

### Current Status
- Vercel deployment (frontend)
- Supabase (backend/database)

### TODO
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated testing
- [ ] Staging environment
- [ ] Database backups automation
- [ ] Monitoring & alerting (Sentry, LogRocket)
- [ ] Performance optimization (caching, CDN)

---

## 📱 Mobile

### Options
- [ ] Progressive Web App (PWA)
- [ ] React Native mobile app
- [ ] Responsive design improvements

---

## 🔄 Database Migrations

### TODO
- [ ] Proper migration system (Prisma/Drizzle)
- [ ] Version control dla schema changes
- [ ] Rollback strategy
- [ ] Seed data management

---

## Notes

**Stworzone:** 2025-01-12
**Ostatnia aktualizacja:** 2025-01-12
**Priorytet:** Multi-Tenancy > Auth & Security > UI/UX > Features
