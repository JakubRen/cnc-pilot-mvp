# Day 10 Action Plan: Multi-Tenancy Architecture Decision + Auth Enhancements

**Data:** 2025-01-12
**Status:** 🟡 **PLANNING**

---

## 🎯 Cel Dnia

Podjęcie kluczowych decyzji architektonicznych dotyczących multi-tenancy oraz implementacja podstawowych funkcji bezpieczeństwa (email verification, password reset).

---

## 📋 Priorytety z future_plan.md

**Priorytet:** Multi-Tenancy > Auth & Security > UI/UX > Features

### Dlaczego te zadania?

1. **Multi-Tenancy (CRITICAL)** - Obecnie każdy użytkownik tworzy nową firmę przy rejestracji (błędne założenie)
2. **Auth & Security** - Brak email verification i password reset to poważne luki bezpieczeństwa
3. Day 9 położył fundament (dashboard, navigation, layout) - teraz czas na backend i security

---

## 🏗️ Część 1: Multi-Tenancy Architecture Decision

### Zadanie 1.1: Analiza i wybór strategii multi-tenancy

**Cel:** Zdecydować którą opcję implementujemy (A, B, C, czy D)

**Opcje do rozważenia:**

---

#### **Opcja D: Email Domain-Based Identification** ⭐ **SELECTED - Wariant B**
```
jan.kowalski@firma1.pl → automatycznie: company_id = "firma1"
anna.nowak@firma2.com → automatycznie: company_id = "firma2"
```

**Jak działa:**
1. Admin ręcznie dodaje firmy i przypisuje ich domeny email
2. User rejestruje się z firmowym emailem (np. `@firma1.pl`)
3. System automatycznie sprawdza czy domena jest na whiteliście
4. Jeśli TAK → przypisuje `company_id`, jeśli NIE → error

**Wymagania:**
- Tabela: `company_email_domains` (company_id, email_domain)
- Walidacja email domain przy rejestracji
- Blokowanie publicznych domen (gmail, wp, o2)
- Admin panel do dodawania firm i domen

**Pros:**
- ✅ Naturalne - email i tak jest wymagany
- ✅ Zero zapamiętywania kodów/subdomen
- ✅ Automatyczna identyfikacja firmy
- ✅ Jedna domena dla aplikacji
- ✅ Proste do wdrożenia (~4h)
- ✅ Elastyczne (jedna firma = wiele domen)
- ✅ Pełna kontrola (Admin whitelisting)

**Cons:**
- ⚠️ Wymaga firmowego email (nie działa z gmail/wp)
- ⚠️ Admin musi ręcznie dodać firmę przed rejestracją
- ⚠️ Problem z freelancerami (brak firmowego email)

**Wariant B (SELECTED): Admin tworzy firmy z góry**
```typescript
// Admin dodaje firmę i domenę:
INSERT INTO companies (name, ...) VALUES ('Firma ABC', ...);
INSERT INTO company_email_domains (company_id, email_domain)
VALUES ('company-id', 'firmaabc.pl');

// User rejestruje się z @firmaabc.pl → automatycznie przypisany
// User rejestruje się z @gmail.com → Error: "Użyj firmowego adresu email"
```

**Estymowany czas implementacji: 4 godziny**

---

#### **Opcja A: Subdomena per firma**
```
firma1.cnc-pilot.com → company_id = "firma1"
firma2.cnc-pilot.com → company_id = "firma2"
```

**Wymagania:**
- Middleware sprawdza `request.headers.host`
- DNS wildcard: `*.cnc-pilot.com`
- Wildcard SSL certificate
- Mapowanie subdomain → company_id w bazie

**Pros:**
- Profesjonalne, typowe dla SaaS B2B
- Czyste oddzielenie firm
- Łatwe w użyciu dla klientów

**Cons:**
- Wymaga konfiguracji DNS
- SSL wildcard certificate (Let's Encrypt Free)

---

#### **Opcja B: Company code przy rejestracji**
```
Rejestracja: email + password + company_code (np. "ABC123")
```

**Wymagania:**
- Pole "Kod firmy" w formularzu rejestracji
- Unique code generator dla każdej firmy
- Walidacja czy kod istnieje przed utworzeniem usera

**Pros:**
- Proste do zaimplementowania (1-2h)
- Nie wymaga DNS ani subdomen
- Jedna domena dla wszystkich

**Cons:**
- Użytkownicy muszą znać kod (potencjalne błędy)
- Mniej profesjonalne niż subdomena

---

#### **Opcja C: Osobny deployment per firma**
```
ENV: COMPANY_ID=firma1
```

**Wymagania:**
- Zmienna `NEXT_PUBLIC_COMPANY_ID` w ENV
- Osobny Vercel project per firma

**Pros:**
- Maksymalna izolacja
- Szybkie do wdrożenia dla 1-5 firm

**Cons:**
- Nie skaluje się (10+ firm = problem)
- Wyższe koszty hostingu
- Zarządzanie updateami (N instancji)

---

### Zadanie 1.2: Implementacja Opcji D (Email Domain-Based) ✅ **SELECTED**

#### **Krok 1: Database Schema**

**1.1. Stworzyć tabelę `company_email_domains`**
```sql
-- migrations/create_company_email_domains.sql

CREATE TABLE IF NOT EXISTS company_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email_domain TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Index dla szybkiego wyszukiwania
CREATE INDEX idx_company_email_domains_domain ON company_email_domains(email_domain);
CREATE INDEX idx_company_email_domains_company ON company_email_domains(company_id);

-- RLS (Row Level Security)
ALTER TABLE company_email_domains ENABLE ROW LEVEL SECURITY;

-- Policy: Users mogą tylko czytać swoją domenę
CREATE POLICY "Users can view their company domains"
  ON company_email_domains FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

-- Policy: Tylko admin może dodawać/usuwać domeny
CREATE POLICY "Only admins can manage domains"
  ON company_email_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid()
      AND role = 'admin'
    )
  );
```

**1.2. Tabela z publicznymi domenami (do blokowania)**
```sql
-- migrations/create_blocked_email_domains.sql

CREATE TABLE IF NOT EXISTS blocked_email_domains (
  domain TEXT PRIMARY KEY,
  reason TEXT DEFAULT 'Public email provider',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Najpopularniejsze publiczne domeny
INSERT INTO blocked_email_domains (domain) VALUES
  ('gmail.com'),
  ('yahoo.com'),
  ('hotmail.com'),
  ('outlook.com'),
  ('wp.pl'),
  ('o2.pl'),
  ('interia.pl'),
  ('onet.pl'),
  ('icloud.com'),
  ('proton.me'),
  ('protonmail.com');
```

---

#### **Krok 2: Helper Functions**

**2.1. Email domain extractor**
```typescript
// lib/email-utils.ts

export function extractEmailDomain(email: string): string | null {
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  return parts[1].toLowerCase();
}

export function isPublicEmailDomain(domain: string): boolean {
  const publicDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'wp.pl', 'o2.pl', 'interia.pl', 'onet.pl', 'icloud.com',
    'proton.me', 'protonmail.com'
  ];
  return publicDomains.includes(domain.toLowerCase());
}

export async function getCompanyIdByEmailDomain(
  email: string
): Promise<{ company_id: string | null; error: string | null }> {
  const domain = extractEmailDomain(email);

  if (!domain) {
    return { company_id: null, error: 'Nieprawidłowy format email' };
  }

  // Sprawdź czy to publiczna domena
  if (isPublicEmailDomain(domain)) {
    return {
      company_id: null,
      error: 'Użyj firmowego adresu email, a nie publicznego (gmail, wp, itp.)'
    };
  }

  // Sprawdź czy domena jest w bazie
  const { data, error } = await supabase
    .from('company_email_domains')
    .select('company_id')
    .eq('email_domain', domain)
    .single();

  if (error || !data) {
    return {
      company_id: null,
      error: `Domena "${domain}" nie jest zarejestrowana w systemie. Skontaktuj się z administratorem.`
    };
  }

  return { company_id: data.company_id, error: null };
}
```

---

#### **Krok 3: Update Registration Flow**

**3.1. Modyfikacja `app/register/page.tsx`**
```typescript
// app/register/page.tsx

import { getCompanyIdByEmailDomain } from '@/lib/email-utils';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // KROK 1: Walidacja email domain
      const { company_id, error: domainError } = await getCompanyIdByEmailDomain(email);

      if (domainError || !company_id) {
        setError(domainError || 'Nie można zidentyfikować firmy');
        setLoading(false);
        return;
      }

      // KROK 2: Rejestracja użytkownika w Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_id: company_id  // Zapisz w metadata
          }
        }
      });

      if (authError) throw authError;

      // KROK 3: Utwórz profil użytkownika z przypisanym company_id
      // (to może być też zrobione w database trigger)
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          auth_id: authData.user!.id,
          email: email,
          full_name: fullName,
          company_id: company_id,  // ✅ Automatycznie przypisane
          role: 'operator'
        });

      if (profileError) throw profileError;

      // Sukces!
      router.push('/login?registered=true');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6">Rejestracja</h1>

        {error && (
          <div className="bg-red-600/20 border border-red-600 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email (firmowy)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="jan.kowalski@twojafirma.pl"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Użyj swojego firmowego adresu email
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Imię i nazwisko
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Hasło
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors disabled:bg-slate-600"
          >
            {loading ? 'Rejestracja...' : 'Zarejestruj się'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

#### **Krok 4: Update Database Trigger**

**4.1. Modyfikacja `create_auth_trigger.sql`**
```sql
-- Usuń stary trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Nowy trigger (bez hardcoded company_id)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_company_id UUID;
  user_email_domain TEXT;
BEGIN
  -- Extract email domain
  user_email_domain := split_part(NEW.email, '@', 2);

  -- Find company_id by email domain
  SELECT company_id INTO user_company_id
  FROM company_email_domains
  WHERE email_domain = user_email_domain
  LIMIT 1;

  -- Jeśli nie znaleziono domeny, użyj company_id z metadata (fallback)
  IF user_company_id IS NULL THEN
    user_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
  END IF;

  -- Utwórz profil użytkownika
  INSERT INTO public.users (
    auth_id,
    email,
    full_name,
    role,
    company_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'operator',
    user_company_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

#### **Krok 5: Admin Panel (Podstawowy)**

**5.1. Dodać stronę do zarządzania firmami**
```typescript
// app/admin/companies/page.tsx

export default async function AdminCompaniesPage() {
  const { data: companies } = await supabase
    .from('companies')
    .select(`
      *,
      email_domains:company_email_domains(email_domain)
    `);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">
        Zarządzanie firmami
      </h1>

      {/* Lista firm z ich domenami */}
      <div className="space-y-4">
        {companies?.map((company) => (
          <div key={company.id} className="bg-slate-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white">
              {company.name}
            </h3>
            <div className="mt-2 text-sm text-slate-400">
              <strong>Domeny email:</strong>{' '}
              {company.email_domains?.map((d: any) => d.email_domain).join(', ') || 'Brak'}
            </div>
            <button className="mt-3 text-blue-400 hover:text-blue-300">
              Dodaj domenę
            </button>
          </div>
        ))}
      </div>

      {/* Formularz dodawania nowej firmy */}
      <div className="mt-8 bg-slate-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-white mb-4">
          Dodaj nową firmę
        </h2>
        {/* TODO: Formularz */}
      </div>
    </div>
  );
}
```

---

#### **Checklist implementacji Opcji D:**

- [ ] **Krok 1:** Stworzyć tabelę `company_email_domains`
- [ ] **Krok 1:** Stworzyć tabelę `blocked_email_domains`
- [ ] **Krok 2:** Stworzyć `lib/email-utils.ts` z helper functions
- [ ] **Krok 3:** Zaktualizować `app/register/page.tsx` z walidacją domeny
- [ ] **Krok 4:** Zaktualizować database trigger (usunąć hardcoded company)
- [ ] **Krok 5:** Stworzyć admin panel `/admin/companies`
- [ ] **Testing:** Zarejestrować użytkownika z firmowym email
- [ ] **Testing:** Próba rejestracji z gmail.com → should fail
- [ ] **Testing:** Próba rejestracji z niezarejestrowaną domeną → should fail

---

### Zadanie 1.2: Implementacja innych opcji (NIE WYBRANE)

**Jeśli wybrano Opcję A (Subdomena):**
- [ ] Dodać `subdomain` column do `companies` table
- [ ] Middleware: Extract subdomain z `request.headers.host`
- [ ] Middleware: Query company by subdomain
- [ ] Middleware: Set company_id w request context
- [ ] DNS: Skonfigurować wildcard `*.cnc-pilot.com`
- [ ] SSL: Ustawić wildcard certificate
- [ ] Testing: localhost subdomain testing (`firma1.localhost:3000`)

**Jeśli wybrano Opcję B (Company Code):**
- [ ] Dodać `company_code` column (unique) do `companies` table
- [ ] Generator: Funkcja `generateCompanyCode()` (6-znakowy alfanumeryczny)
- [ ] Rejestracja: Dodać pole "Kod firmy" w `/register`
- [ ] Walidacja: Sprawdzić czy company_code istnieje
- [ ] Przypisanie: `company_id` based on company_code przy rejestracji
- [ ] Admin: Strona do generowania nowych company codes

**Jeśli wybrano Opcję C (Separate Deployment):**
- [ ] ENV variable: `NEXT_PUBLIC_COMPANY_ID`
- [ ] Middleware: Read company_id z ENV
- [ ] Hard-code company_id w queries
- [ ] Dokumentacja: Proces tworzenia nowego deploymentu

---

### Zadanie 1.3: Migration istniejących danych

- [ ] Usunąć default company (jeśli nie jest używana)
- [ ] Zmapować istniejących userów na właściwe firmy
- [ ] Update RLS policies (Row Level Security)
- [ ] Testing: Verify data isolation między firmami

---

## 🔐 Część 2: Auth & Security Enhancements

### Zadanie 2.1: Email Verification

**Cel:** Wymagać potwierdzenia email po rejestracji

---

#### **Krok 1: Konfiguracja Supabase Email Templates**

**1.1. Supabase Dashboard Setup:**
1. Idź do Supabase Dashboard → Authentication → Email Templates
2. Znajdź "Confirm signup" template
3. Zaktualizuj template w języku polskim:

```html
<h2>Potwierdź swój adres email</h2>
<p>Witaj w CNC-Pilot!</p>
<p>Kliknij poniższy link, aby potwierdzić swój adres email i aktywować konto:</p>
<p><a href="{{ .ConfirmationURL }}">Potwierdź email</a></p>
<p>Link jest ważny przez 24 godziny.</p>
<p>Jeśli nie rejestrowałeś się w CNC-Pilot, zignoruj tę wiadomość.</p>
```

4. Set redirect URL: `https://twoja-domena.vercel.app/auth/confirm`
   - Local: `http://localhost:3000/auth/confirm`

**1.2. Enable email confirmation w Supabase:**
- Authentication → Settings → Email Auth
- ✅ Enable "Confirm email" option

---

#### **Krok 2: Email Confirmation Handler**

**2.1. Stworzyć `app/auth/confirm/route.ts`**
```typescript
// app/auth/confirm/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (token_hash && type) {
    const supabase = createRouteHandlerClient({ cookies });

    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });

    if (!error) {
      // Email confirmed successfully
      return NextResponse.redirect(new URL(next, request.url));
    }

    // Error during confirmation
    return NextResponse.redirect(
      new URL(`/login?error=Email+verification+failed`, request.url)
    );
  }

  // Missing token
  return NextResponse.redirect(
    new URL(`/login?error=Invalid+confirmation+link`, request.url)
  );
}
```

---

#### **Krok 3: Update Registration Flow**

**3.1. Modyfikacja `app/register/page.tsx` - Dodać info message**
```typescript
// Po sukcesie rejestracji:

const { data: authData, error: authError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/confirm`,
    data: {
      full_name: fullName,
      company_id: company_id
    }
  }
});

if (authError) throw authError;

// Pokaż success message zamiast przekierowania
setSuccess(true); // New state
```

**3.2. Success message component:**
```typescript
{success && (
  <div className="bg-green-600/20 border border-green-600 text-green-400 px-4 py-3 rounded mb-4">
    <h3 className="font-semibold mb-2">Rejestracja udana! 🎉</h3>
    <p className="text-sm">
      Sprawdź swoją skrzynkę email ({email}) i kliknij link aktywacyjny.
    </p>
    <p className="text-sm mt-2">
      Nie widzisz emaila? Sprawdź folder SPAM.
    </p>
  </div>
)}
```

---

#### **Krok 4: Middleware - Block unverified users (Optional)**

**4.1. Dodać check w `middleware.ts`**
```typescript
// middleware.ts

if (isProtectedRoute && user) {
  // Check if email is verified
  if (!user.email_confirmed_at) {
    return NextResponse.redirect(new URL('/verify-email', request.url));
  }
}
```

**4.2. Stworzyć stronę `/verify-email`:**
```typescript
// app/verify-email/page.tsx

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-lg max-w-md">
        <h1 className="text-2xl font-bold text-white mb-4">
          Potwierdź swój email
        </h1>
        <p className="text-slate-300 mb-4">
          Wysłaliśmy link aktywacyjny na Twój adres email.
        </p>
        <p className="text-slate-400 text-sm">
          Kliknij link w emailu, aby aktywować konto i uzyskać dostęp do aplikacji.
        </p>
      </div>
    </div>
  );
}
```

---

#### **Checklist Email Verification:**

- [ ] **Krok 1:** Skonfigurować Supabase email template (polski)
- [ ] **Krok 1:** Enable "Confirm email" w Supabase settings
- [ ] **Krok 2:** Stworzyć `app/auth/confirm/route.ts`
- [ ] **Krok 3:** Zaktualizować `app/register/page.tsx` (success message)
- [ ] **Krok 4:** Dodać check w middleware (optional)
- [ ] **Krok 4:** Stworzyć `/verify-email` page
- [ ] **Testing:** Zarejestrować użytkownika i sprawdzić email
- [ ] **Testing:** Kliknąć link aktywacyjny → should redirect to dashboard

---

### Zadanie 2.2: Password Reset Flow

**Cel:** Umożliwić użytkownikom resetowanie hasła

---

#### **Krok 1: Konfiguracja Supabase Email Template**

**1.1. Supabase Dashboard Setup:**
1. Supabase Dashboard → Authentication → Email Templates
2. Znajdź "Reset Password" template
3. Zaktualizuj w języku polskim:

```html
<h2>Resetowanie hasła</h2>
<p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta CNC-Pilot.</p>
<p>Kliknij poniższy link, aby ustawić nowe hasło:</p>
<p><a href="{{ .ConfirmationURL }}">Resetuj hasło</a></p>
<p>Link jest ważny przez 1 godzinę.</p>
<p>Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.</p>
```

4. Set redirect URL: `https://twoja-domena.vercel.app/reset-password`

---

#### **Krok 2: Forgot Password Page**

**2.1. Stworzyć `app/forgot-password/page.tsx`**
```typescript
// app/forgot-password/page.tsx

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-slate-800 p-8 rounded-lg shadow-lg w-full max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">📧</div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Sprawdź swoją skrzynkę email
            </h1>
            <p className="text-slate-300 mb-6">
              Wysłaliśmy link do resetowania hasła na adres:
            </p>
            <p className="text-blue-400 font-medium mb-6">{email}</p>
            <p className="text-slate-400 text-sm mb-6">
              Link jest ważny przez 1 godzinę. Nie widzisz emaila? Sprawdź folder SPAM.
            </p>
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              ← Powrót do logowania
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">
          Zapomniałeś hasła?
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Wprowadź swój adres email, a wyślemy Ci link do resetowania hasła.
        </p>

        {error && (
          <div className="bg-red-600/20 border border-red-600 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Adres email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="jan.kowalski@firma.pl"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors disabled:bg-slate-600 mb-4"
          >
            {loading ? 'Wysyłanie...' : 'Wyślij link resetujący'}
          </button>

          <Link
            href="/login"
            className="block text-center text-slate-400 hover:text-slate-300 text-sm"
          >
            ← Powrót do logowania
          </Link>
        </form>
      </div>
    </div>
  );
}
```

---

#### **Krok 3: Reset Password Page**

**3.1. Password validation helper**
```typescript
// lib/password-validation.ts

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Hasło musi mieć minimum 8 znaków');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Hasło musi zawierać przynajmniej jedną wielką literę');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Hasło musi zawierać przynajmniej jedną małą literę');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Hasło musi zawierać przynajmniej jedną cyfrę');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  color: string;
} {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { strength: 'weak', color: 'text-red-500' };
  if (score <= 4) return { strength: 'medium', color: 'text-yellow-500' };
  return { strength: 'strong', color: 'text-green-500' };
}
```

**3.2. Stworzyć `app/reset-password/page.tsx`**
```typescript
// app/reset-password/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { validatePassword, getPasswordStrength } from '@/lib/password-validation';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const validation = validatePassword(password);
  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password
    if (!validation.isValid) {
      setError(validation.errors.join('. '));
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-slate-800 p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white mb-4">
            Hasło zostało zmienione!
          </h1>
          <p className="text-slate-300 mb-6">
            Przekierowanie do strony logowania...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">
          Ustaw nowe hasło
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Wprowadź nowe, bezpieczne hasło do swojego konta.
        </p>

        {error && (
          <div className="bg-red-600/20 border border-red-600 text-red-400 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nowe hasło
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
              minLength={8}
            />

            {password && (
              <div className="mt-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Siła hasła:</span>
                  <span className={`font-medium ${strength.color}`}>
                    {strength.strength === 'weak' && 'Słabe'}
                    {strength.strength === 'medium' && 'Średnie'}
                    {strength.strength === 'strong' && 'Silne'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Potwierdź hasło
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Password requirements */}
          <div className="bg-slate-700/50 p-3 rounded-lg mb-6">
            <p className="text-xs font-medium text-slate-300 mb-2">
              Wymagania dla hasła:
            </p>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Minimum 8 znaków</li>
              <li>• Przynajmniej jedna wielka litera</li>
              <li>• Przynajmniej jedna mała litera</li>
              <li>• Przynajmniej jedna cyfra</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || !validation.isValid || password !== confirmPassword}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            {loading ? 'Zmienianie hasła...' : 'Zmień hasło'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

#### **Krok 4: Update Login Page**

**4.1. Dodać link "Zapomniałeś hasła?" w `app/login/page.tsx`**
```typescript
// W formularzu logowania, po przycisku submit:

<div className="text-center mt-4">
  <Link
    href="/forgot-password"
    className="text-sm text-blue-400 hover:text-blue-300"
  >
    Zapomniałeś hasła?
  </Link>
</div>
```

**4.2. Pokazać success message po resecie:**
```typescript
// Na początku komponentu, sprawdź URL params:
const searchParams = useSearchParams();
const resetSuccess = searchParams.get('reset') === 'success';

// W render:
{resetSuccess && (
  <div className="bg-green-600/20 border border-green-600 text-green-400 px-4 py-3 rounded mb-4">
    Hasło zostało zmienione! Możesz się teraz zalogować.
  </div>
)}
```

---

#### **Checklist Password Reset:**

- [ ] **Krok 1:** Skonfigurować Supabase "Reset Password" email template (polski)
- [ ] **Krok 2:** Stworzyć `app/forgot-password/page.tsx`
- [ ] **Krok 3:** Stworzyć `lib/password-validation.ts`
- [ ] **Krok 3:** Stworzyć `app/reset-password/page.tsx`
- [ ] **Krok 4:** Dodać link "Zapomniałeś hasła?" w `/login`
- [ ] **Krok 4:** Dodać success message w `/login`
- [ ] **Testing:** Wysłać request reset hasła
- [ ] **Testing:** Sprawdzić email i kliknąć link
- [ ] **Testing:** Ustawić nowe hasło i zalogować się

---

### Zadanie 2.3: Session Management Improvements

**Cel:** Lepsze zarządzanie sesjami użytkowników

**Implementacja:**

- [ ] Session timeout (auto logout po 24h nieaktywności)
- [ ] Refresh token rotation
- [ ] "Remember me" checkbox przy loginie
- [ ] Active sessions list (optional)
- [ ] Force logout all devices (optional)

**Pliki do modyfikacji:**
```
middleware.ts (session timeout)
app/login/page.tsx (remember me)
```

---

## 🎨 Część 3: UI/UX Improvements (Optional)

### Zadanie 3.1: Loading States

- [ ] Dashboard: Skeleton loaders podczas fetch
- [ ] Orders: Loading spinner przy zmianie statusu
- [ ] Forms: Disable buttons podczas submit
- [ ] Global loading bar (np. nprogress)

### Zadanie 3.2: Error Handling

- [ ] Toast notifications (react-hot-toast lub sonner)
- [ ] Error boundaries
- [ ] Friendly error messages (polski)
- [ ] Retry mechanisms dla failed requests

### Zadanie 3.3: Dashboard Enhancements

- [ ] Real-time updates (Supabase Realtime subscriptions)
- [ ] Refresh button na dashboard
- [ ] Date range picker (Last 7 days / Last 30 days / Custom)
- [ ] Export dashboard data (CSV/PDF)

---

## 📁 Nowe Pliki do Stworzenia

### Multi-Tenancy (zależnie od opcji):
```
migrations/add_subdomain_to_companies.sql          # Opcja A
migrations/add_company_code_to_companies.sql       # Opcja B
middleware_company_detection.ts                    # Opcja A lub B
lib/company-code-generator.ts                      # Opcja B
```

### Auth & Security:
```
app/auth/confirm/route.ts                          # Email verification
app/forgot-password/page.tsx                       # Password reset request
app/reset-password/page.tsx                        # Password reset handler
lib/password-validation.ts                         # Password strength check
components/auth/EmailVerificationNotice.tsx        # Notice component
```

### UI/UX (Optional):
```
components/ui/LoadingSpinner.tsx                   # Loading component
components/ui/SkeletonCard.tsx                     # Skeleton loader
components/ui/Toast.tsx                            # Toast notifications
lib/error-handler.ts                               # Global error handler
```

---

## 🧪 Testing Checklist

### Multi-Tenancy:
- [ ] User z company A nie widzi danych z company B
- [ ] RLS policies działają poprawnie
- [ ] Subdomain/code mapping działa
- [ ] Migration danych completed bez błędów

### Auth:
- [ ] Email verification działa (check spam folder)
- [ ] Password reset link jest valid przez 1h
- [ ] Walidacja hasła działa (min 8 znaków)
- [ ] Session timeout działa po 24h
- [ ] Remember me checkbox działa

### UI/UX:
- [ ] Loading states pokazują się poprawnie
- [ ] Toast notifications działają
- [ ] Error messages są w języku polskim
- [ ] Real-time updates działają

---

## 📊 Metryki Sukcesu

- **Multi-Tenancy:** Data isolation between companies verified
- **Email Verification:** Users must confirm email before access
- **Password Reset:** Complete flow tested end-to-end
- **Security:** No SQL injection or XSS vulnerabilities
- **UX:** Loading states on all async operations

---

## ⚠️ Potencjalne Problemy

### Multi-Tenancy:
- **DNS Propagation:** Subdomain może potrwać do 24h (use DNS propagation checker)
- **SSL Certificate:** Wildcard cert requires domain ownership verification
- **Local Testing:** Subdomain na localhost wymaga `/etc/hosts` config

### Auth:
- **Email Deliverability:** Gmail może blokować emails (check SPF/DKIM)
- **Reset Token Expiry:** Supabase default to 1h (może być za krótkie)
- **Rate Limiting:** Zabezpieczyć przed spam resetowania hasła

### UI/UX:
- **Real-time Subscriptions:** Supabase Free tier limit: 200 concurrent connections
- **Performance:** Sprawdzić Lighthouse score po dodaniu toastów

---

## 🚀 Deployment Checklist

- [ ] ENV variables ustawione na Vercel (COMPANY_ID, email settings)
- [ ] DNS configured (jeśli subdomain)
- [ ] SSL certificate valid
- [ ] Supabase email templates updated
- [ ] RLS policies deployed
- [ ] Database migrations run
- [ ] Smoke tests passed

---

## 📝 Następne Kroki (Day 11+)

**Po ukończeniu Day 10:**

1. **Two-Factor Authentication (2FA)** - Dodatkowa warstwa bezpieczeństwa
2. **Role-Based Permissions** - Szczegółowe uprawnienia (admin/operator)
3. **Audit Log** - Historia zmian w systemie
4. **Advanced Reporting** - Custom reports builder
5. **Real-time Features** - WebSockets/Polling dla live updates

---

## 💡 Rekomendacje

### Dla małej liczby klientów (1-10 firm):
**Wybierz Opcję B (Company Code)** - Szybka implementacja, wystarczająca izolacja

### Dla średniej/dużej liczby klientów (10+ firm):
**Wybierz Opcję A (Subdomain)** - Profesjonalne, skalowalne, lepsze UX

### Dla pilotażu z 1-3 firmami:
**Wybierz Opcję C (Separate Deployment)** - Najprostsze, maksymalna izolacja

---

## 🎯 Priorytet Zadań (jeśli brak czasu na wszystko)

**MUST HAVE:**
1. Multi-Tenancy Architecture Decision & Implementation
2. Email Verification
3. Password Reset Flow

**NICE TO HAVE:**
4. Session Management Improvements
5. Loading States
6. Toast Notifications

**OPTIONAL:**
7. Real-time Dashboard Updates
8. Export Data Features

---

**Ostatnia aktualizacja:** 2025-01-12
**Status:** 🟡 PLANNING
**Czas estymowany:** 6-8 godzin
**Zależności:** Day 9 (Dashboard + Navigation) completed

---

## 📞 Decision Required

**Przed rozpoczęciem Day 10, zdecyduj:**

1. **Która opcja multi-tenancy?** (A, B, lub C)
2. **Czy email verification jest obowiązkowy?** (Tak/Nie)
3. **Czy implementujemy 2FA w Day 10?** (Tak/Nie - rekomendacja: NIE, zostaw na Day 11)
4. **Czy real-time updates w Day 10?** (Tak/Nie - rekomendacja: NIE, focus na security)

**Rekomendowany zakres Day 10:**
- Multi-Tenancy (Opcja B - Company Code)
- Email Verification
- Password Reset
- Loading States (basic)

**Czas: ~6h**

---
