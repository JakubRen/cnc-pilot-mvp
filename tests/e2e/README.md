# E2E Tests - Production Module

## 📋 Overview

Kompleksowe testy end-to-end dla modułu produkcji (Production Plans → Operations) z podziałem na Setup/Run Time w systemie CNC-Pilot MVP.

**Architektura (od 2025-12-15):**
```
Orders → Production Plans → Operations
/orders → /production/create?order_id={id} → /production/[id]
```

## 🧪 Test Coverage

### Operations Structure (`operations.spec.ts`)

**Podstawowa funkcjonalność:**
- ✅ Wyświetlanie sekcji operacji w szczegółach zlecenia
- ✅ Nawigacja do formularza dodawania pozycji
- ✅ Tworzenie pozycji zlecenia z operacjami
- ✅ Automatyczne szacowanie czasów operacji
- ✅ Kalkulacja kosztów w czasie rzeczywistym
- ✅ Dodawanie wielu operacji do jednej pozycji
- ✅ Zmiana kolejności operacji (routing)
- ✅ Usuwanie operacji
- ✅ Walidacja wymaganych pól
- ✅ Wyświetlanie operacji w szczegółach zlecenia
- ✅ Podsumowanie całkowite dla wszystkich pozycji
- ✅ Upload rysunków dla pozycji
- ✅ Walidacja czasów (nie mogą być ujemne)

**Testy mobilne:**
- ✅ Wyświetlanie operacji na urządzeniach mobilnych
- ✅ Dodawanie operacji z telefonu

**Testy wydajnościowe:**
- ✅ Szybkie ładowanie szczegółów z operacjami (<3s)
- ✅ Obsługa wielu operacji (do 10) bez zawieszania

## 🚀 Uruchamianie testów

### Testy jednostkowe (Vitest)

```bash
# Uruchom wszystkie testy jednostkowe
npm run test

# Tryb watch (automatyczne odświeżanie)
npm run test:watch

# Z pokryciem kodu
npm run test:coverage
```

### Testy E2E (Playwright)

```bash
# Uruchom wszystkie testy E2E
npm run test:e2e

# Tylko testy operacji
npx playwright test operations

# W trybie UI (interaktywny)
npm run test:e2e:ui

# Raport z ostatniego uruchomienia
npm run test:e2e:report
```

### Przed uruchomieniem testów E2E

**1. Ustaw zmienne środowiskowe:**

Utwórz plik `.env.test`:

```env
# Test user credentials (must exist in database)
TEST_USER_EMAIL=test@metaltech.pl
TEST_USER_PASSWORD=TestPassword123!

# Base URL (opcjonalnie)
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

**2. Upewnij się że masz dane testowe:**

Potrzebujesz:
- Konto użytkownika testowego (email/password z .env.test)
- Przynajmniej jedno zlecenie w systemie
- Przynajmniej jedna aktywna maszyna

**3. Uruchom serwer deweloperski:**

```bash
npm run dev
```

Playwright automatycznie uruchomi serwer, ale jeśli chcesz kontrolować go samodzielnie, możesz wyłączyć `webServer` w `playwright.config.ts`.

## 📊 Struktura testów

```
tests/
├── e2e/
│   ├── operations.spec.ts    # Testy operacji (Setup/Run Time)
│   ├── auth.spec.ts           # Testy logowania
│   ├── docs.spec.ts           # Testy dokumentów
│   └── smoke.spec.ts          # Testy smoke
└── unit/
    └── operations.test.ts     # Testy funkcji pomocniczych
```

## 🎯 Co testujemy

### 1. Tworzenie operacji (Production Module)

Test symuluje pełny workflow:
1. Login → Zlecenia → Szczegóły zlecenia
2. Kliknięcie "Utwórz Plan Produkcji" (w sekcji "Plany Produkcji")
3. Wypełnienie formularza:
   - Nazwa części: "Flansza Testowa Ø100"
   - Ilość: 50 szt.
   - Materiał: "Stal nierdzewna"
   - Złożoność: Medium
4. Dodanie operacji:
   - Typ: Frezowanie
   - Nazwa: "Toczenie zgrubne"
   - Setup: 20 min
   - Run: 6 min/szt
   - Stawka: 180 PLN/h
5. Weryfikacja obliczonych kosztów
6. Zapisanie i powrót do szczegółów zlecenia

### 2. Automatyczne szacowanie

Test weryfikuje funkcję AI estimation:
1. Dodanie operacji
2. Wybór typu operacji (np. Toczenie)
3. Kliknięcie "🤖 Oszacuj"
4. Weryfikacja że Setup/Run Time zostały automatycznie wypełnione

### 3. Kalkulacja kosztów

Test sprawdza real-time calculation:
- Setup: 30 min
- Run: 5 min/unit
- Quantity: 100
- Rate: 200 PLN/h

**Oczekiwany wynik:**
- Setup Cost: 100 PLN
- Run Cost: 1666.67 PLN
- **Total: 1766.67 PLN**

### 4. Routing operacji

Test weryfikuje:
- Dodanie 3 operacji (#1, #2, #3)
- Zmiana kolejności (przesunięcie #2 w górę → staje się #1)
- Automatyczna renumeracja

## 🔍 Debugging testów

### Tryb interaktywny (UI Mode)

```bash
npm run test:e2e:ui
```

Pozwala na:
- Krokowe wykonywanie testów
- Podgląd DOM w każdym kroku
- Analiza network requests
- Screenshots i traces

### Headless vs Headed

```bash
# Bez przeglądarki (szybciej)
npx playwright test

# Z widoczną przeglądarką
npx playwright test --headed

# Tylko w Chrome
npx playwright test --project=chromium

# Debug mode (zatrzymuje się na breakpointach)
npx playwright test --debug
```

### Screenshoty i wideo

Przy błędzie testy automatycznie robią:
- Screenshot (`screenshot: 'only-on-failure'`)
- Video (`video: 'retain-on-failure'`)

Znajdziesz je w `test-results/`.

### Trace Viewer

Po niepowodzeniu testu:

```bash
npx playwright show-trace test-results/.../trace.zip
```

Pokazuje timeline z:
- Akcjami (click, fill, etc.)
- Network requests
- Console logs
- Screenshots w każdym kroku

## 🧩 Przykłady użycia

### Uruchom tylko jeden test

```bash
npx playwright test -g "should create order item with operations"
```

### Uruchom na konkretnej przeglądarce

```bash
npx playwright test --project=firefox
```

### Uruchom tylko testy mobilne

```bash
npx playwright test --project="Mobile Chrome"
```

### Parallel execution

```bash
# Wszystkie testy równolegle (domyślnie)
npx playwright test

# Sekwencyjnie (dla debugowania)
npx playwright test --workers=1
```

## 📝 Najlepsze praktyki

1. **Setup/Teardown:** Każdy test loguje się przed wykonaniem (`beforeEach`)
2. **Izolacja:** Testy nie zależą od siebie nawzajem
3. **Oczekiwania:** Używamy `expect(...).toBeVisible()` zamiast `waitFor`
4. **Selektory:** Preferujemy tekst/role nad CSS classami
5. **Timeouts:** Ustawione na 10s dla operacji I/O

## 🐛 Troubleshooting

### Problem: "Test user not found"

**Rozwiązanie:** Upewnij się że użytkownik testowy istnieje w bazie:
```sql
-- Sprawdź czy użytkownik istnieje
SELECT * FROM users WHERE email = 'test@metaltech.pl';
```

### Problem: "No orders found"

**Rozwiązanie:** Testy wymagają przynajmniej jednego zlecenia w systemie.

### Problem: "Operation estimation failed"

**Rozwiązanie:** Sprawdź czy funkcja RPC `estimate_operation_times()` istnieje w bazie:
```sql
SELECT * FROM pg_proc WHERE proname = 'estimate_operation_times';
```

### Problem: Testy timeout'ują

**Rozwiązanie 1:** Zwiększ timeout w `playwright.config.ts`:
```typescript
timeout: 60000, // 60 seconds
```

**Rozwiązanie 2:** Użyj `--timeout` flag:
```bash
npx playwright test --timeout=60000
```

## 📈 Continuous Integration

Testy są skonfigurowane do uruchamiania w CI/CD:

```yaml
# .github/workflows/test.yml
- name: Run E2E tests
  run: npm run test:e2e
  env:
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

## 🎓 Dodatkowe zasoby

- [Playwright Docs](https://playwright.dev/)
- [Vitest Docs](https://vitest.dev/)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)

## 🤝 Contributing

Przy dodawaniu nowych testów:

1. Umieść w odpowiednim pliku (`operations.spec.ts`, etc.)
2. Grupuj używając `describe()`
3. Używaj opisowych nazw testów
4. Dodaj komentarze dla złożonych scenariuszy
5. Upewnij się że test jest izolowany (nie zależy od innych)
6. Uruchom lokalnie przed commitem

## 📊 Test Reports

Po uruchomieniu testów E2E:

```bash
# HTML report
npm run test:e2e:report

# JSON report
npx playwright test --reporter=json

# JUnit XML (dla CI)
npx playwright test --reporter=junit
```

---

**Last updated:** 2025-12-15 (Updated for Production Module architecture)
**Test coverage:** Production Module (Setup/Run Time)
**Total tests:** 23 (E2E) + 24 (Unit) = 47

**Architecture change (2025-12-15):**
- Old: Operations embedded in Orders (`/orders/[id]/operations/add`)
- New: Separate Production module (`/production/create?order_id={id}`)
- All tests rewritten for new architecture
