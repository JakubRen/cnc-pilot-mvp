# Instrukcja Migracji Bazy Danych - DAY 20-22

## Wymagane Migracje

Przed testowaniem nowych funkcji **MUSISZ** uruchomić 2 migracje SQL w Supabase Dashboard:

1. **create_saved_filters.sql** - System zapisanych filtrów
2. **setup_storage.sql** - Bucket storage dla plików

---

## Krok 1: Uruchomienie migracji Saved Filters

### 1.1 Otwórz Supabase Dashboard
- Przejdź do: https://supabase.com/dashboard
- Wybierz swój projekt
- W lewym menu kliknij: **SQL Editor**

### 1.2 Uruchom migration: create_saved_filters.sql
- Kliknij: **+ New query**
- Skopiuj całą zawartość pliku: `migrations/create_saved_filters.sql`
- Wklej do edytora SQL
- Kliknij: **Run** (lub Ctrl+Enter)

### 1.3 Weryfikacja
Sprawdź czy tabela została utworzona:
```sql
SELECT * FROM saved_filters LIMIT 5;
```

Powinieneś zobaczyć 5 domyślnych filtrów (3 dla zamówień, 2 dla magazynu).

---

## Krok 2: Uruchomienie migracji Storage

### 2.1 Uruchom migration: setup_storage.sql
- W SQL Editor, kliknij: **+ New query**
- Skopiuj całą zawartość pliku: `migrations/setup_storage.sql`
- Wklej do edytora SQL
- Kliknij: **Run**

### 2.2 Weryfikacja Storage Bucket
- W lewym menu kliknij: **Storage**
- Powinieneś zobaczyć bucket o nazwie: **files**
- Kliknij na bucket "files" - sprawdź ustawienia:
  - Public: **false** (prywatny)
  - File size limit: **10MB**
  - Allowed MIME types: obrazy, PDF, dokumenty Office, CSV, ZIP

### 2.3 Weryfikacja RLS Policies
- W Storage → files bucket → kliknij: **Policies**
- Powinieneś zobaczyć 4 policy:
  1. "Users can view company files" (SELECT)
  2. "Users can upload company files" (INSERT)
  3. "Users can update company files" (UPDATE)
  4. "Users can delete company files" (DELETE)

---

## Krok 3: Weryfikacja Pełnej Integracji

### 3.1 Test Zapisanych Filtrów
```sql
-- Sprawdź czy są domyślne filtry dla Twojej firmy
SELECT
  name,
  filter_type,
  is_default,
  filter_config
FROM saved_filters
WHERE company_id = (SELECT id FROM companies LIMIT 1)
ORDER BY filter_type, name;
```

Powinny być widoczne:
- **Order filters**: "Pilne zamówienia (3 dni)", "Opóźnione zamówienia", "W trakcie realizacji"
- **Inventory filters**: "Niski stan magazynowy", "Wyczerpany zapas"

### 3.2 Test Storage Folder Structure
```sql
-- Sprawdź strukturę folderów storage
SELECT
  name,
  bucket_id,
  owner,
  created_at
FROM storage.objects
WHERE bucket_id = 'files'
LIMIT 5;
```

(Na razie pusta - pliki pojawią się po pierwszym uploadzcie)

---

## Rozwiązywanie Problemów

### Problem: "relation already exists"
**Rozwiązanie:**
- Tabela/bucket już istnieje
- Pomiń tę część migracji
- Sprawdź czy struktura jest poprawna

### Problem: "permission denied for schema storage"
**Rozwiązanie:**
- Użyj service_role key w Supabase Dashboard
- SQL Editor automatycznie używa właściwych uprawnień
- **NIE** uruchamiaj przez `psql` jako zwykły user

### Problem: RLS policy "already exists"
**Rozwiązanie:**
```sql
-- Usuń istniejące policy i stwórz na nowo
DROP POLICY IF EXISTS "Users can view company files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload company files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update company files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete company files" ON storage.objects;

-- Następnie uruchom ponownie setup_storage.sql
```

### Problem: Bucket "files" już istnieje
**Rozwiązanie:**
- Sprawdź czy bucket ma poprawne ustawienia:
  - File size limit: 10485760 (10MB)
  - Public: false
  - Allowed mime types: sprawdź listę w setup_storage.sql
- Jeśli ustawienia są poprawne, pomiń CREATE BUCKET i uruchom tylko RLS policies

---

## Co Się Zmieni Po Migracjach

### 1. Saved Filters (Zapisane Filtry)
**Lokalizacja:** `/orders` (sidebar)

**Funkcje:**
- Zapisywanie aktualnych ustawień filtrów (status, termin, wyszukiwanie, sortowanie, tagi)
- Szybkie ładowanie zapisanych filtrów jednym kliknięciem
- Domyślne filtry systemowe (niemożliwe do usunięcia)
- Własne filtry użytkownika (można usuwać)

**Wykorzystanie:**
1. Ustaw filtry na stronie `/orders`
2. Kliknij: "Zapisz aktualny filtr"
3. Wpisz nazwę (np. "Moje pilne zamówienia")
4. Filtr pojawi się na liście
5. Kliknij nazwę filtra aby załadować ustawienia

### 2. File Browser (Przeglądarka Plików)
**Lokalizacja:** `/files`

**Funkcje:**
- Upload plików (max 10MB, obrazy, PDF, Office, CSV, ZIP)
- Widok Grid (kafelki) i List (lista)
- Filtry typu plików (All, Images, PDF, Excel)
- Podgląd obrazów i PDF w modal
- Pobieranie plików
- Usuwanie plików
- Organizacja po firmach (company_id)

**Bezpieczeństwo:**
- Wszystkie pliki są prywatne (bucket public: false)
- Użytkownik widzi tylko pliki swojej firmy
- Struktura folderów: `{company_id}/{filename}`
- RLS policies zapewniają izolację danych

### 3. Tag System (System Tagów)
**Już aktywny** - nie wymaga migracji (utworzony wcześniej)

**Lokalizacje:**
- `/tags` - Zarządzanie tagami
- `/orders/[id]` - Przypisywanie tagów do zamówień
- `/inventory/[id]` - Przypisywanie tagów do materiałów
- `/orders` - Filtrowanie po tagach (sidebar)

---

## Następne Kroki

Po wykonaniu migracji:

1. ✅ **Zrestartuj dev server** (jeśli działa)
   ```bash
   # Ctrl+C aby zatrzymać
   npm run dev
   ```

2. ✅ **Przetestuj Saved Filters**
   - Przejdź do: `/orders`
   - Sprawdź sidebar - sekcja "Zapisane filtry"
   - Załaduj domyślny filtr: "Pilne zamówienia (3 dni)"
   - Stwórz własny filtr z custom ustawieniami

3. ✅ **Przetestuj File Browser**
   - Przejdź do: `/files`
   - Prześlij przykładowy plik (zdjęcie lub PDF)
   - Przełącz widok: Grid ↔ List
   - Kliknij na plik aby zobaczyć podgląd
   - Pobierz plik
   - Usuń plik

4. ✅ **Przetestuj Tag System**
   - Przejdź do: `/tags`
   - Stwórz nowy tag (np. "Priorytet", kolor czerwony)
   - Przejdź do zamówienia: `/orders/[id]`
   - Przypisz tag do zamówienia
   - Wróć do `/orders` i filtruj po tym tagu

---

## Podsumowanie Migracji

| Migracja | Tabela/Bucket | Policy | Status |
|----------|---------------|--------|--------|
| create_saved_filters.sql | saved_filters | 3 RLS policies | ⏳ Do wykonania |
| setup_storage.sql | storage.buckets (files) | 4 storage policies | ⏳ Do wykonania |

Po wykonaniu obu migracji:
- Saved Filters będą działać na `/orders`
- File Browser będzie działać na `/files`
- Tag System już działa (utworzony wcześniej)

---

## Potrzebujesz Pomocy?

### Logi błędów SQL
Jeśli migracja się nie powiedzie, Supabase SQL Editor pokaże dokładny błąd. Skopiuj komunikat błędu i:
1. Sprawdź czy tabela/policy już istnieje
2. Sprawdź czy masz uprawnienia (service_role)
3. Sprawdź sekcję "Rozwiązywanie Problemów" powyżej

### Sprawdzenie statusu migracji
```sql
-- Lista wszystkich tabel
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Lista wszystkich storage buckets
SELECT * FROM storage.buckets;

-- Lista wszystkich RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname IN ('public', 'storage');
```
