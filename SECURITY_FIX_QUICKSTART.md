# 🔒 Security Fix - Quick Start Guide
## Napraw 8 błędów Supabase w 5 minut

---

## ⚡ SZYBKI START (TL;DR)

1. Otwórz [Supabase Dashboard SQL Editor](https://supabase.com/dashboard)
2. Skopiuj cały plik `migrations/SECURITY_AUDIT_FIX_MASTER.sql`
3. Wklej w SQL Editor i kliknij **RUN**
4. Zweryfikuj że wszystko działa
5. ✅ Done!

---

## 📝 KROK PO KROKU

### **Krok 1: Otwórz Supabase Dashboard**

```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
```

Nawigacja: **Dashboard → SQL Editor → New Query**

---

### **Krok 2: Skopiuj migration**

Otwórz plik:
```
migrations/SECURITY_AUDIT_FIX_MASTER.sql
```

**Windows:** `Ctrl+A` → `Ctrl+C`
**Mac:** `Cmd+A` → `Cmd+C`

---

### **Krok 3: Wklej i uruchom**

W Supabase SQL Editor:
1. Wklej skopiowany kod (`Ctrl+V` / `Cmd+V`)
2. Kliknij **RUN** (lub `Ctrl+Enter` / `Cmd+Enter`)
3. Poczekaj ~5 sekund

**Oczekiwany output:**
```
✅ Security fixes applied successfully!

Fixed issues:
  ✓ Enabled RLS on company_email_domains
  ✓ Enabled RLS on blocked_email_domains
  ✓ Fixed 5 SECURITY DEFINER views
```

---

### **Krok 4: Weryfikacja (3 testy)**

#### Test 1: Sprawdź RLS
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('company_email_domains', 'blocked_email_domains');
```

**Oczekiwany wynik:**
```
tablename                  | rowsecurity
---------------------------|------------
company_email_domains      | t          ← TRUE = OK ✅
blocked_email_domains      | t          ← TRUE = OK ✅
```

#### Test 2: Sprawdź Views
```sql
SELECT viewname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'audit_logs_with_users',
    'order_profitability',
    'machines_needing_maintenance'
  );
```

**Oczekiwany wynik:** 3 rows (wszystkie views istnieją)

#### Test 3: Sprawdź aplikację
1. Zaloguj się do CNC-Pilot
2. Sprawdź Dashboard (powinien działać normalnie)
3. Sprawdź Orders (powinny być widoczne)
4. Sprawdź Cooperation (powinno działać)

**Jeśli coś NIE działa** → Zobacz sekcję Troubleshooting poniżej.

---

### **Krok 5: Re-run Supabase Linter**

```
Dashboard → Database → Database Linter → Run Checks
```

**Oczekiwany wynik:**
```
0 errors ✅
(Poprzednio: 8 errors 🔴)
```

---

## 🚨 CO JEŚLI COŚ POSZŁO ŹLE?

### Problem: "column u.name does not exist" ✅ FIXED

**Status:** ✅ **NAPRAWIONE w wersji 1.2**

Jeśli widzisz błąd o `u.name`, używasz starej wersji migration. Pobierz najnowszą:
- `SECURITY_AUDIT_FIX_MASTER.sql` (wersja 1.2+)

**Co było nie tak:**
- Stara wersja: `u.name AS user_name` ❌
- Nowa wersja: `u.full_name AS user_name` ✅

---

### Problem: "column user_id does not exist" ✅ FIXED

**Status:** ✅ **NAPRAWIONE w wersji 1.1**

Jeśli widzisz ten błąd, używasz starej wersji migration. Pobierz najnowszą:
- `SECURITY_AUDIT_FIX_MASTER.sql` (wersja 1.2+)

**Co było nie tak:**
- Stara wersja: `SELECT user_id FROM users` ❌
- Nowa wersja: `SELECT auth_id FROM users` ✅

---

### Problem: "syntax error near..."

**Przyczyna:** Niepełny kod skopiowany
**Rozwiązanie:**
1. Upewnij się że skopiowałeś **cały** plik (od `BEGIN;` do końca)
2. Spróbuj ponownie

---

### Problem: "relation does not exist"

**Przyczyna:** Brakuje tabel/views w bazie
**Rozwiązanie:**
1. Sprawdź czy tabele istnieją:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```
2. Jeśli brakuje `external_operations`, `cooperants`, itp. → uruchom poprzednie migracje

---

### Problem: "must be owner of view"

**Przyczyna:** Nie masz uprawnień
**Rozwiązanie:**
- Zaloguj się jako **admin** do Supabase
- Lub użyj **Service Role** key (nie anon key)

---

### Problem: Aplikacja nie działa po fix

**Symptom:** Dashboard pusty / błędy 500

**Debug:**
1. Sprawdź console w przeglądarce (F12)
2. Sprawdź Supabase logs:
```
Dashboard → Logs → Postgres Logs
```
3. Szukaj `permission denied for table`

**Quick rollback (jeśli panic):**
```sql
-- Wyłącz RLS tymczasowo (NIE NA PRODUKCJI!)
ALTER TABLE company_email_domains DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_email_domains DISABLE ROW LEVEL SECURITY;
```

Następnie napisz do CTO (Claude) o problemie.

---

## 📋 CHECKLIST

Zaznacz każdy krok:

- [ ] Otworzono Supabase SQL Editor
- [ ] Skopiowano `SECURITY_AUDIT_FIX_MASTER.sql`
- [ ] Uruchomiono migration (RUN)
- [ ] Verification Test 1 ✅ (RLS enabled)
- [ ] Verification Test 2 ✅ (Views exist)
- [ ] Verification Test 3 ✅ (App działa)
- [ ] Re-run Linter → 0 errors
- [ ] Poinformowano zespół o fix

---

## 📞 POTRZEBUJESZ POMOCY?

**Slack:** #tech-support
**Email:** devops@twojafirma.pl
**CTO (Claude):** Opisz problem w szczegółach

---

## 🎉 GOTOWE!

Właśnie naprawiłeś **8 krytycznych błędów bezpieczeństwa**.

Twoja baza danych jest teraz bezpieczna! 🔒

---

*Last updated: 2025-12-03*
*Version: 1.0*
