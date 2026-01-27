# 🗄️ DATABASE MIGRATION WORKFLOW

**Problem solved:** TEST i PROD databases rozjeżdżają się (schema drift)
**Solution:** Systematyczny proces migracji z kontrolą wersji

---

## 📊 OBECNA SYTUACJA

| Database | ID | Używane przez | Cel |
|----------|---|---------------|-----|
| **TEST** | vvetjctdjswgwebhgbpd | Localhost + E2E | Development |
| **PROD** | jjepqbrjktfsdbbprnea | Vercel | Production |

**Problem:** Zmiany robione manualnie przez SQL Editor gubią się i bazy się rozjeżdżają.

---

## 🎯 WORKFLOW: 5 KROKÓW

### 1️⃣ STWÓRZ NOWĄ MIGRACJĘ

Każda zmiana schema = nowy plik SQL

```bash
# Przykład: Dodajesz tabelę "customers"
npm run migration:new add_customers_table
```

To stworzy plik: `supabase/migrations/YYYYMMDD_HHMMSS_add_customers_table.sql`

**Edytuj plik i dodaj SQL:**
```sql
-- Description: Add customers table for client management
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view own company customers"
  ON customers FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid()));
```

---

### 2️⃣ URUCHOM NA TEST DATABASE

**A) Wyświetl migration (żeby skopiować):**
```bash
npm run migration:show add_customers_table
```

**B) Otwórz Supabase SQL Editor:**
- Link: https://supabase.com/dashboard/project/vvetjctdjswgwebhgbpd/sql/new
- Login jeśli potrzeba

**C) Wykonaj:**
1. Skopiuj SQL z terminala (z kroku A)
2. Wklej do SQL Editor
3. Kliknij **RUN** (lub Ctrl+Enter)
4. Sprawdź czy nie ma błędów

**D) Zweryfikuj:**
```sql
-- Sprawdź czy tabela istnieje
SELECT * FROM customers LIMIT 1;

-- Sprawdź RLS policy
SELECT policyname FROM pg_policies WHERE tablename = 'customers';
```

---

### 3️⃣ PRZETESTUJ W APLIKACJI

```bash
# Uruchom dev server
npm run dev

# Przetestuj nową funkcjonalność
# - Sprawdź czy queries działają
# - Sprawdź czy RLS działa (nie widzisz danych innych firm)
```

**Jeśli coś nie działa → Popraw migration → Powtórz krok 2**

---

### 4️⃣ URUCHOM NA PROD DATABASE

**⚠️ TYLKO gdy TEST działa bez błędów!**

**A) Skopiuj tę samą migration:**
```bash
npm run migration:show add_customers_table
```

**B) Otwórz PROD SQL Editor:**
- Link: https://supabase.com/dashboard/project/jjepqbrjktfsdbbprnea/sql/new

**C) Wykonaj:**
1. Wklej SQL
2. Kliknij **RUN**
3. Sprawdź czy nie ma błędów

**D) Zweryfikuj PROD:**
- Otwórz https://cnc-pilot-mvp.vercel.app
- Przetestuj funkcjonalność
- Sprawdź czy wszystko działa

---

### 5️⃣ COMMIT DO GITA

```bash
git add supabase/migrations/
git commit -m "feat(db): add customers table"
git push
```

**Dlaczego commit?**
- Historia zmian
- Możliwość rollback
- Team collaboration
- Dokumentacja co i kiedy

---

## 🛠️ KOMENDY POMOCNICZE

| Komenda | Opis |
|---------|------|
| `npm run migration:new <name>` | Stwórz nowy plik migracji |
| `npm run migration:show <name>` | Wyświetl zawartość migracji |
| `npm run migration:list` | Lista wszystkich migracji |
| `npm run migration:latest` | Pokaż najnowszą migrację |

---

## 📁 STRUKTURA PLIKÓW

```
cnc-pilot-mvp/
├── supabase/
│   ├── migrations/
│   │   ├── 20251229_sync_orders_with_prod.sql
│   │   ├── 20251230_add_production_tables.sql
│   │   └── 20260127_add_customers_table.sql  ← Nowe migracje tutaj
│   └── config.toml
└── MIGRATION_WORKFLOW.md  ← Ten dokument
```

---

## 🔒 BEZPIECZEŃSTWO

### DO's ✅
- **Zawsze TEST najpierw**, potem PROD
- **Backup przed breaking changes** (DROP TABLE, ALTER TYPE)
- **Use transactions** (`BEGIN; ... COMMIT;`)
- **Test rollback** przed PROD
- **RLS na każdej tabeli**

### DON'Ts ❌
- ❌ Nie rób zmian bezpośrednio na PROD
- ❌ Nie usuwaj starych plików migracji (git history!)
- ❌ Nie commituj migrations z błędami
- ❌ Nie skipuj testowania na TEST

---

## 🚨 ROLLBACK (Cofnij migrację)

**Jeśli coś poszło nie tak:**

### Opcja 1: Manual Rollback (Prosty przypadek)
```sql
-- Przykład: Cofnij dodanie tabeli
DROP TABLE IF EXISTS customers CASCADE;
```

### Opcja 2: Restore z backupu (Breaking change)
1. Otwórz Supabase Dashboard → Database → Backups
2. Wybierz backup sprzed migracji
3. Restore

### Opcja 3: Stwórz "revert migration"
```bash
npm run migration:new revert_add_customers_table
```
Edytuj plik i dodaj SQL który cofa zmiany.

---

## 📊 STATUS MIGRACJI

Śledź które migracje zostały zaaplikowane:

| Migration | TEST | PROD | Data | Notes |
|-----------|------|------|------|-------|
| 20251229_sync_orders_with_prod | ✅ | ✅ | 2025-12-29 | Sync schema |
| 20251230_add_production_tables | ✅ | ✅ | 2025-12-30 | Production module |
| YYYYMMDD_add_customers_table | ⏳ | ⏳ | 2026-01-27 | Pending |

**Jak trackować:**
- ✅ Applied - Zaaplikowana na danym środowisku
- ⏳ Pending - Do zaaplikowania
- ❌ Failed - Nie udało się, wymaga fix

---

## 💡 TIPS & TRICKS

### 1. Testuj lokalne schema changes
Jeśli masz Supabase local (optional):
```bash
npx supabase start
npx supabase db reset
```

### 2. Generate migration z istniejącej bazy
```bash
# Skopiuj schema z TEST
npx supabase db dump --schema public > dump.sql
```

### 3. Sprawdź różnice między TEST a PROD
Niestety wymaga manual comparison - otwórz SQL Editor i porównaj:
```sql
-- Lista tabel
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Kolumny w tabeli
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'orders' ORDER BY ordinal_position;
```

---

## 🎓 PRZYKŁADY MIGRACJI

### Przykład 1: Dodaj kolumnę
```sql
-- Add phone column to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone text;
```

### Przykład 2: Zmień typ kolumny (ostrożnie!)
```sql
-- Change quantity from integer to numeric (allows decimals)
BEGIN;
  ALTER TABLE inventory ADD COLUMN quantity_new numeric;
  UPDATE inventory SET quantity_new = quantity::numeric;
  ALTER TABLE inventory DROP COLUMN quantity;
  ALTER TABLE inventory RENAME COLUMN quantity_new TO quantity;
COMMIT;
```

### Przykład 3: Dodaj index (performance)
```sql
-- Speed up orders lookup by customer
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
```

### Przykład 4: Dodaj funkcję (helper)
```sql
-- Helper function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total(order_id uuid)
RETURNS numeric AS $$
  SELECT COALESCE(SUM(price * quantity), 0)
  FROM order_items
  WHERE order_items.order_id = $1;
$$ LANGUAGE SQL STABLE;
```

---

## 📞 HELP & TROUBLESHOOTING

### Problem: "relation already exists"
**Rozwiązanie:** Użyj `IF NOT EXISTS`
```sql
CREATE TABLE IF NOT EXISTS customers (...);
```

### Problem: "column does not exist"
**Rozwiązanie:** Sprawdź czy poprzednia migracja była zaaplikowana

### Problem: "permission denied"
**Rozwiązanie:** SQL Editor ma pełne uprawnienia, użyj go zamiast API

### Problem: "RLS policy blocks my query"
**Rozwiązanie:** Użyj service role key do testowania (ostrożnie!)

---

## 🎯 NEXT STEPS

Po opanowaniu tego workflow:
1. **Automated testing** - E2E tests weryfikują schema
2. **CI/CD integration** - GitHub Actions automatycznie aplikuje migrations
3. **Staging environment** - TEST → STAGING → PROD
4. **Migration history tracking** - Database table śledzi co zostało zaaplikowane

---

**Questions? Check:**
- Supabase Docs: https://supabase.com/docs/guides/database/migrations
- This project's migrations: `supabase/migrations/`
- CTO workspace: `CTO/protocols/06-database.md`
