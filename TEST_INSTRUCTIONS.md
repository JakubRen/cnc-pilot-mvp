# 🧪 GDZIE I JAK TESTOWAĆ - Instrukcja krok po kroku

## ⚠️ NAJPIERW: Uruchom migrację!

**WAŻNE:** Zanim zaczniesz testować, MUSISZ uruchomić migrację bazy danych.

### Krok 1: Otwórz Supabase
1. Idź do: https://supabase.com/dashboard
2. Wybierz swój projekt
3. Kliknij **SQL Editor** (ikona z lewej strony)

### Krok 2: Uruchom migrację
1. Otwórz plik: `migrations/add_operations_structure.sql`
2. **Skopiuj CAŁĄ zawartość pliku** (Ctrl+A, Ctrl+C)
3. Wklej w SQL Editor (Ctrl+V)
4. Kliknij **RUN** (zielony przycisk)
5. Poczekaj aż się wykona (powinno zająć ~2 sekundy)

**Jeśli dostaniesz błąd "already exists"** - to znaczy że migracja już była wykonana. OK!

---

## 🖥️ GDZIE TESTOWAĆ W APLIKACJI

### Otwórz w przeglądarce:
```
http://localhost:3000
```

### Ścieżka testowa:

#### 1️⃣ Zaloguj się
- Email: twój email użytkownika
- Password: twoje hasło

#### 2️⃣ Przejdź do Zleceń
- Kliknij **"Zamówienia"** w menu po lewej stronie
- LUB przejdź bezpośrednio do: `http://localhost:3000/orders`

#### 3️⃣ Wybierz dowolne zlecenie
- Kliknij na dowolne zlecenie z listy
- LUB jeśli nie masz zleceń, dodaj nowe:
  - Kliknij "+ Dodaj zamówienie"
  - Wypełnij podstawowe dane
  - Zapisz

#### 4️⃣ TUTAJ JEST NOWA FUNKCJONALNOŚĆ! 🎉
Po wejściu w szczegóły zlecenia, przewiń w dół i zobaczysz:

```
┌─────────────────────────────────────────────────────────┐
│ ⚙️ Plany Produkcji                                     │
│                           [+ Utwórz Plan Produkcji]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Brak planów produkcji dla tego zlecenia.             │
│  Utwórz pierwszy plan, aby rozpocząć produkcję.        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 5️⃣ Kliknij "+ Utwórz Plan Produkcji"
Zostaniesz przekierowany do formularza tworzenia planu produkcji.

---

## 📝 JAK WYPEŁNIĆ FORMULARZ

**URL:** `/production/create?order_id={id}`

Formularz jest automatycznie podlinkowany ze zlecenia i pre-wypełnia dane jeśli dostępne.

### A) Informacje o detalu:

```
┌─────────────────────────────────────────┐
│ 📦 Informacje o detalu                  │
├─────────────────────────────────────────┤
│ Nazwa części: *                         │
│ [Flansza Testowa Ø100            ]     │
│                                         │
│ Ilość sztuk: *        Materiał:        │
│ [50           ]       [Stal nierdzewna] │
│                                         │
│ Złożoność:           Wymiary:          │
│ [🟡 Średnie ▼]       [100][50][20] mm  │
└─────────────────────────────────────────┘
```

Wypełnij:
- **Nazwa części:** `Flansza Testowa Ø100`
- **Ilość:** `50`
- **Materiał:** `Stal nierdzewna`
- **Złożoność:** wybierz `Średnie`

### B) Rysunek (opcjonalnie):
```
┌─────────────────────────────────────────┐
│ 📐 Rysunek Techniczny                   │
│ (PDF, DXF, PNG, JPG - max 10MB)        │
├─────────────────────────────────────────┤
│        📎                               │
│  Kliknij aby wybrać rysunek            │
│  lub przeciągnij i upuść plik tutaj    │
└─────────────────────────────────────────┘
```

Możesz dodać rysunek techniczny (PDF/DXF) lub pominąć.

### C) 🔧 Operacje Technologiczne - KLUCZOWA CZĘŚĆ!

Kliknij **"+ Dodaj Operację"**:

```
┌─────────────────────────────────────────────────────┐
│ #1                                        [✕ Usuń]  │
├─────────────────────────────────────────────────────┤
│ Typ operacji: *              Nazwa operacji: *      │
│ [🔧 Frezowanie ▼]            [Toczenie zgrubne  ]   │
│                                                     │
│ Maszyna:                     Stawka (PLN/h): *     │
│ [Nie przypisano ▼]          [180            ]      │
│                                                     │
│ ⏱️ Setup Time (min): *       🔄 Run Time (min/szt):*│
│ [20                  ]       [6                   ] │
│ Koszt setup: 60.00 PLN       Koszt run: 900.00 PLN │
│                                                     │
│ ┌─────────────────────────────────────────────────┐│
│ │ 💡 Automatyczne szacowanie            [🤖 Oszacuj]││
│ │ Kliknij aby oszacować Setup/Run Time             ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ ┌─────────────────────────────────────────────────┐│
│ │ Czas całkowity: 5h 20min                        ││
│ │ Setup Cost: 60.00 PLN                           ││
│ │ Run Cost: 900.00 PLN                            ││
│ │ Koszt całkowity: 960.00 PLN                     ││
│ └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**Wypełnij pierwszą operację:**
1. **Typ:** `Frezowanie` (lub Toczenie)
2. **Nazwa:** `Toczenie zgrubne`
3. **Stawka:** `180` PLN/h

Teraz masz dwie opcje:

**OPCJA A - Automatyczne szacowanie (TESTUJ TO!):**
- Kliknij **🤖 Oszacuj**
- System automatycznie wypełni Setup Time i Run Time
- Zobaczysz toast: "Czasy oszacowane!"

**OPCJA B - Ręczne wpisanie:**
- **Setup Time:** `20` min
- **Run Time:** `6` min/szt

**OBSERWUJ:** Koszty aktualizują się na żywo! 💰

### D) Dodaj więcej operacji (opcjonalnie):

Kliknij ponownie **"+ Dodaj Operację"** żeby dodać kolejne kroki:

```
Operacja #1: Toczenie zgrubne   (Setup: 20, Run: 6)
Operacja #2: Frezowanie otworów (Setup: 15, Run: 4)
Operacja #3: Wykończenie         (Setup: 10, Run: 2)
```

**Możesz:**
- ⬆️ ⬇️ Zmienić kolejność (routing produkcyjny)
- ✕ Usunąć operację

### E) Podsumowanie:

Na dole zobaczysz:

```
┌────────────────────────────────────────────────┐
│ 💰 Podsumowanie planu produkcji                │
├────────────────────────────────────────────────┤
│  Część: Flansza Testowa Ø100                   │
│  Ilość: 50 szt.                                │
│  Czas całkowity: 10h 40min                     │
│  💵 Koszt całkowity: 1,867.50 PLN              │
└────────────────────────────────────────────────┘
```

### F) Zapisz:

Kliknij **✓ Utwórz Plan Produkcji** (duży zielony przycisk)

---

## ✅ CO POWINIENEŚ ZOBACZYĆ PO ZAPISANIU

Zostaniesz przekierowany do szczegółów planu produkcji (`/production/[id]`) i zobaczysz:

```
┌──────────────────────────────────────────────────────┐
│ ⚙️ Plan Produkcji                                   │
│ Flansza Testowa Ø100 • 50 szt.                      │
│                                          [📦 Zlecenie #...]  [Powrót]
├──────────────────────────────────────────────────────┤
│ 📋 Informacje o zleceniu                             │
│ Zlecenie: #...  Klient: ...  Termin: ...            │
├──────────────────────────────────────────────────────┤
│ 🔧 Szczegóły produkcji                               │
│ Część: Flansza Testowa Ø100                          │
│ Ilość: 50 szt.                                       │
│ Materiał: Stal nierdzewna                            │
│ Złożoność: Średnie                                   │
├──────────────────────────────────────────────────────┤
│ 📊 Podsumowanie                                      │
│ Operacje: 3 | Setup Time: 45min | Run Time: 10h     │
│ 💵 Koszt całkowity: 1,867.50 PLN                     │
├──────────────────────────────────────────────────────┤
│ 🔄 Routing Produkcyjny                               │
│                                                      │
│  #1 Toczenie zgrubne                    [Oczekuje]  │
│      🔧 Frezowanie                                   │
│      Setup: 20min | Run: 6min/szt | 180 PLN/h       │
│      Koszt: 960.00 PLN                               │
│      Maszyna: [jeśli przypisana]                     │
│      Operator: [jeśli przypisany]                    │
│                                                      │
│  #2 Frezowanie otworów                  [Oczekuje]  │
│      🔧 Frezowanie                                   │
│      Setup: 15min | Run: 4min/szt | 180 PLN/h       │
│      Koszt: 645.00 PLN                               │
│                                                      │
│  #3 Wykończenie                         [Oczekuje]  │
│      🔧 Frezowanie                                   │
│      Setup: 10min | Run: 2min/szt | 180 PLN/h       │
│      Koszt: 262.50 PLN                               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Powrót do zlecenia

Możesz wrócić do zlecenia klikając przycisk **📦 Zlecenie #...** w prawym górnym rogu.

W szczegółach zlecenia zobaczysz teraz sekcję **⚙️ Plany Produkcji** z kartą utworzonego planu:

```
┌──────────────────────────────────────────────────────┐
│ ⚙️ Plany Produkcji                                   │
│                           [+ Utwórz Plan Produkcji]  │
├──────────────────────────────────────────────────────┤
│ 📁 Flansza Testowa Ø100                        [→]  │
│    50 szt. • Stal nierdzewna                         │
│    3 operacje | 10h 40min | 1,867.50 PLN            │
└──────────────────────────────────────────────────────┘
```

---

## 🎯 CO TESTOWAĆ

### 0. **Moduł /production (NOWY!)**
- Przejdź do `/production` (link w menu bocznym: ⚙️ Plan Produkcji)
- **Sprawdź:** Czy widzisz listę wszystkich planów produkcji?
- **Sprawdź:** Czy każda karta pokazuje: nazwę części, ilość, liczbę operacji, czas, koszt?
- Kliknij na kartę planu produkcji
- **Sprawdź:** Czy zostałeś przekierowany do `/production/[id]`?
- **Sprawdź:** Czy widzisz wszystkie operacje w kolejności routingu (#1, #2, #3)?

### 1. **Auto-estimation** (🤖 Oszacuj)
- Dodaj operację
- Wybierz typ (np. Toczenie)
- Kliknij "🤖 Oszacuj"
- **Sprawdź:** Czy Setup i Run zostały wypełnione automatycznie?

### 2. **Real-time costing**
- Zmień Setup Time z 20 na 30
- **Sprawdź:** Czy koszt zaktualizował się natychmiast?
- Zmień Run Time z 6 na 8
- **Sprawdź:** Czy koszt wzrósł?

### 3. **Routing (kolejność)**
- Dodaj 3 operacje (#1, #2, #3)
- Kliknij ⬆️ przy operacji #2
- **Sprawdź:** Czy stała się #1?
- **Sprawdź:** Czy numeracja się przeliczyła?

### 4. **Dodawanie/usuwanie**
- Dodaj operację - **Sprawdź:** Czy się pokazała?
- Usuń operację - **Sprawdź:** Czy zniknęła?
- **Sprawdź:** Czy nie możesz usunąć ostatniej operacji?

### 5. **Podsumowania**
- **Sprawdź:** Czy "Koszt całkowity" na dole = suma wszystkich operacji?
- **Sprawdź:** Czy "Czas całkowity" = Setup + (Run × ilość)?

### 6. **Economy of scale**
Zmień ilość z 50 na 100:
- **Sprawdź:** Czy koszt jednostkowy (PLN/szt) spadł?
- To pokazuje że setup się amortyzuje!

---

## 🧪 Uruchamianie testów automatycznych

### Unit tests:
```bash
npm run test
```
**Powinno pokazać:** ✅ 267 tests passed

### E2E tests:
```bash
# Najpierw utwórz .env.test:
echo "TEST_USER_EMAIL=twoj@email.pl" > .env.test
echo "TEST_USER_PASSWORD=TwojeHaslo123!" >> .env.test

# Uruchom testy:
npm run test:e2e
```

### Tylko testy operacji:
```bash
npx playwright test operations
```

### Tryb UI (interaktywny):
```bash
npm run test:e2e:ui
```

---

## ❓ FAQ / Problemy

### "Nie widzę sekcji Operacje"
→ Migracja nie została uruchomiona. Wróć do Kroku 1.

### "🤖 Oszacuj nie działa"
→ Sprawdź w Supabase czy funkcja `estimate_operation_times()` istnieje:
```sql
SELECT * FROM pg_proc WHERE proname = 'estimate_operation_times';
```

### "Koszty się nie aktualizują"
→ Sprawdź konsolę przeglądarki (F12) czy są błędy.

### "Nie mam żadnych zleceń"
→ Dodaj nowe zlecenie:
1. Idź do `/orders`
2. Kliknij "+ Dodaj zamówienie"
3. Wypełnij podstawowe pola
4. Zapisz
5. Teraz możesz dodać operacje

---

## 📱 Testowanie na telefonie/tablecie

Otwórz na telefonie:
```
http://[TWOJ_KOMPUTER_IP]:3000
```

(np. `http://192.168.1.100:3000`)

Wszystko powinno działać na urządzeniach mobilnych!

---

## 🎉 Gotowe!

Masz pytania? Sprawdź:
- `READY_TO_TEST.md` - quick reference
- `OPERATIONS_IMPLEMENTATION_SUMMARY.md` - pełna dokumentacja
- `tests/e2e/README.md` - dokumentacja testów

**Powodzenia! 🚀**
