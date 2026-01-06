# Manual Testing Checklist - CNC-Pilot MVP

> **Data testów:** _______________
> **Tester:** _______________
> **Środowisko:** PROD (cnc-pilot-mvp.vercel.app) / localhost
> **Przeglądarka:** Chrome / Firefox / Safari / Edge

---

## Jak zgłaszać bugi

```
Screenshot: testing/screenshots/bug-XXX.png
Lub bezpośrednio w Claude Code: "zobacz Desktop\bug1.png"
```

---

## 1. Autentykacja

### Login
- [ ] Strona logowania się ładuje (`/login`)
- [ ] Walidacja pustego emaila
- [ ] Walidacja nieprawidłowego formatu emaila
- [ ] Walidacja za krótkiego hasła (<8 znaków)
- [ ] Błąd przy złych danych logowania
- [ ] Poprawne logowanie przekierowuje na Dashboard
- [ ] "Zapomniałem hasła" link działa

### Rejestracja
- [ ] Strona rejestracji się ładuje (`/register`)
- [ ] Walidacja wszystkich pól
- [ ] Rejestracja z domeną firmową działa
- [ ] Rejestracja z gmail.com/wp.pl jest blokowana
- [ ] Po rejestracji - przekierowanie na pending-activation

### Wylogowanie
- [ ] Przycisk "Wyloguj" działa
- [ ] Po wylogowaniu nie ma dostępu do chronionych stron
- [ ] Sesja jest czyszczona

---

## 2. Dashboard (Pulpit)

- [ ] Strona się ładuje bez błędów
- [ ] Metryki wyświetlają się (zamówienia, przychód, etc.)
- [ ] Lista pilnych zadań się wyświetla
- [ ] Kliknięcie w zadanie przekierowuje do szczegółów
- [ ] Kalendarz/harmonogram się renderuje
- [ ] Powiadomienia działają (ikonka dzwonka)

---

## 3. Zamówienia (/orders)

### Lista zamówień
- [ ] Lista się ładuje
- [ ] Filtrowanie po statusie działa
- [ ] Wyszukiwanie po numerze/kliencie działa
- [ ] Sortowanie działa
- [ ] Paginacja działa (jeśli >20 zamówień)

### Dodawanie zamówienia
- [ ] Formularz `/orders/add` się ładuje
- [ ] Wszystkie pola są widoczne
- [ ] Walidacja wymaganych pól
- [ ] Wybór klienta z listy działa
- [ ] Zapisywanie zamówienia działa
- [ ] Po zapisaniu - przekierowanie na listę
- [ ] Toast "Zamówienie utworzone" się pojawia

### Szczegóły zamówienia
- [ ] Strona `/orders/[id]` się ładuje
- [ ] Wszystkie dane są wyświetlone
- [ ] Przycisk "Edytuj" działa
- [ ] Przycisk "Utwórz Plan Produkcji" działa
- [ ] Sekcja "Plany Produkcji" się wyświetla
- [ ] Link do planu produkcji działa

### Edycja zamówienia
- [ ] Formularz `/orders/[id]/edit` się ładuje
- [ ] Dane są wstępnie wypełnione
- [ ] Zmiany się zapisują
- [ ] Toast potwierdzenia

### Usuwanie zamówienia
- [ ] Potwierdzenie przed usunięciem
- [ ] Usunięcie działa
- [ ] Zamówienie znika z listy

---

## 4. Plan Produkcji (/production)

### Lista planów
- [ ] Lista się ładuje
- [ ] Karty planów wyświetlają się poprawnie
- [ ] Widoczne: numer planu, część, ilość, status
- [ ] Link do zamówienia na karcie działa

### Tworzenie planu
- [ ] Formularz `/production/create` się ładuje
- [ ] Formularz z `?order_id=` wypełnia dane zamówienia
- [ ] Pole "Nazwa części" działa
- [ ] Pole "Ilość" działa
- [ ] Przycisk "Dodaj Operację" dodaje operację
- [ ] Pola operacji: nazwa, typ, setup time, run time, stawka
- [ ] Auto-estymacja czasów działa (przycisk "Szacuj")
- [ ] Koszty liczą się w czasie rzeczywistym
- [ ] Zapisywanie planu działa
- [ ] Redirect na listę po zapisaniu

### Szczegóły planu
- [ ] Strona `/production/[id]` się ładuje
- [ ] Tytuł z numerem planu
- [ ] Link "Zlecenie" do zamówienia jest widoczny
- [ ] Informacje o zleceniu (klient, termin)
- [ ] Szczegóły produkcji (część, ilość, materiał)
- [ ] Podsumowanie (operacje, czasy, koszt)
- [ ] Lista operacji z routingiem
- [ ] Przycisk "Powrót" działa

### Walidacja
- [ ] Nie można zapisać bez nazwy części
- [ ] Nie można zapisać z ujemnymi czasami
- [ ] Błędy walidacji są widoczne

---

## 5. Kontrahenci (/customers)

### Lista
- [ ] Lista się ładuje
- [ ] Wyszukiwanie działa
- [ ] Filtrowanie działa

### CRUD
- [ ] Dodawanie kontrahenta (`/customers/add`)
- [ ] Edycja kontrahenta (`/customers/[id]/edit`)
- [ ] Szczegóły kontrahenta (`/customers/[id]`)
- [ ] Usuwanie kontrahenta

---

## 6. Magazyn (/inventory)

### Lista
- [ ] Lista się ładuje
- [ ] Widoczne: SKU, nazwa, ilość, jednostka
- [ ] Ostrzeżenie przy niskim stanie
- [ ] Filtrowanie po kategorii

### CRUD
- [ ] Dodawanie pozycji (`/inventory/add`)
- [ ] Edycja pozycji (`/inventory/[id]/edit`)
- [ ] Szczegóły pozycji (`/inventory/[id]`)
- [ ] Usuwanie pozycji

---

## 7. Towary (/products)

### Lista
- [ ] Lista się ładuje
- [ ] Karty produktów wyświetlają się

### CRUD
- [ ] Dodawanie produktu (`/products/add`)
- [ ] Szczegóły produktu (`/products/[id]`)

---

## 8. Czas Pracy (/time-tracking)

- [ ] Strona się ładuje
- [ ] Lista aktywnych timerów
- [ ] Start timera dla zamówienia
- [ ] Pauza timera
- [ ] Stop timera
- [ ] Historia czasu pracy
- [ ] Obliczanie kosztów (stawka * czas)

---

## 9. Maszyny (/machines)

### Lista
- [ ] Lista maszyn się ładuje
- [ ] Widoczny status maszyny

### CRUD
- [ ] Dodawanie maszyny (`/machines/add`)
- [ ] Szczegóły maszyny (`/machines/[id]`)

---

## 10. Kontrola Jakości (/quality-control)

- [ ] Strona się ładuje
- [ ] Lista planów kontroli
- [ ] Dodawanie planu kontroli
- [ ] Szczegóły planu

---

## 11. Kooperacja (/cooperation)

- [ ] Strona się ładuje
- [ ] Lista kooperantów
- [ ] Dodawanie zlecenia kooperacji
- [ ] Szczegóły kooperacji

---

## 12. Dokumenty (/documents)

- [ ] Lista dokumentów
- [ ] Dodawanie dokumentu
- [ ] Podgląd dokumentu
- [ ] Pobieranie dokumentu

---

## 13. Kalendarz (/calendar)

- [ ] Kalendarz się renderuje
- [ ] Widok miesięczny/tygodniowy
- [ ] Wydarzenia są widoczne
- [ ] Kliknięcie w wydarzenie pokazuje szczegóły

---

## 14. Paszport Węglowy (/carbon)

- [ ] Strona się ładuje
- [ ] Lista wpisów
- [ ] Dodawanie wpisu
- [ ] Obliczenia emisji

---

## 15. Koszty i Rentowność (/costs)

- [ ] Strona się ładuje
- [ ] Wykresy/metryki kosztów
- [ ] Analiza rentowności

---

## 16. Raporty (/reports)

- [ ] Strona się ładuje
- [ ] Generowanie raportów
- [ ] Export do PDF/Excel (jeśli dostępny)

---

## 17. Użytkownicy (/users)

- [ ] Lista użytkowników
- [ ] Role są widoczne (owner, admin, manager, operator)
- [ ] Edycja użytkownika
- [ ] Zmiana roli
- [ ] Dezaktywacja użytkownika

---

## 18. Ustawienia (/settings)

- [ ] Strona się ładuje
- [ ] Ustawienia firmy
- [ ] Ustawienia profilu

---

## 19. Responsywność (Mobile)

### Testuj na szerokości 375px (iPhone SE)
- [ ] Sidebar się zwija/hamburger menu
- [ ] Dashboard czytelny
- [ ] Formularze działają
- [ ] Tabele są przewijalne
- [ ] Przyciski są klilalne (min 44px)

---

## 20. Ogólne UX

- [ ] Ładowanie - widoczne loadery/skeletony
- [ ] Błędy - czytelne komunikaty
- [ ] Toasty - pojawiają się i znikają
- [ ] Dark mode - przełącznik działa
- [ ] Nawigacja - wszystkie linki w sidebar działają
- [ ] Breadcrumbs - nawigacja wstecz działa

---

## Znalezione Bugi

| ID | Moduł | Opis | Priorytet | Screenshot | Status |
|----|-------|------|-----------|------------|--------|
| BUG-001 | | | 🔴/🟡/🟢 | | ⬜ TODO |
| BUG-002 | | | | | |
| BUG-003 | | | | | |

**Priorytety:**
- 🔴 Krytyczny - blokuje użycie
- 🟡 Średni - irytujący ale można obejść
- 🟢 Niski - kosmetyczny

**Status:**
- ⬜ TODO
- 🔄 W trakcie
- ✅ Naprawione

---

## Notatki z testów

```
Tutaj wpisz dodatkowe obserwacje...
```
