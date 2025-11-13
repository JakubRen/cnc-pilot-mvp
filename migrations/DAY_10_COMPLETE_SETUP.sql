-- ============================================
-- DAY 10 COMPLETE SQL SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: Tabela domen firmowych
-- ============================================

CREATE TABLE IF NOT EXISTS company_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email_domain TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_company_email_domains_domain
  ON company_email_domains(email_domain);

CREATE INDEX IF NOT EXISTS idx_company_email_domains_company
  ON company_email_domains(company_id);

ALTER TABLE company_email_domains ENABLE ROW LEVEL SECURITY;

-- Policy: Users mogą tylko czytać domeny swojej firmy
DROP POLICY IF EXISTS "Users can view their company domains" ON company_email_domains;
CREATE POLICY "Users can view their company domains"
  ON company_email_domains FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

-- Policy: Tylko admin może dodawać/usuwać domeny
DROP POLICY IF EXISTS "Only admins can manage domains" ON company_email_domains;
CREATE POLICY "Only admins can manage domains"
  ON company_email_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================
-- STEP 2: Tabela zablokowanych domen
-- ============================================

CREATE TABLE IF NOT EXISTS blocked_email_domains (
  domain TEXT PRIMARY KEY,
  reason TEXT DEFAULT 'Public email provider',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Najpopularniejsze publiczne domeny
INSERT INTO blocked_email_domains (domain, reason) VALUES
  ('gmail.com', 'Public email provider - Google'),
  ('googlemail.com', 'Public email provider - Google'),
  ('yahoo.com', 'Public email provider - Yahoo'),
  ('yahoo.co.uk', 'Public email provider - Yahoo'),
  ('hotmail.com', 'Public email provider - Microsoft'),
  ('hotmail.co.uk', 'Public email provider - Microsoft'),
  ('outlook.com', 'Public email provider - Microsoft'),
  ('live.com', 'Public email provider - Microsoft'),
  ('wp.pl', 'Public email provider - Polska'),
  ('o2.pl', 'Public email provider - Polska'),
  ('interia.pl', 'Public email provider - Polska'),
  ('onet.pl', 'Public email provider - Polska'),
  ('interia.eu', 'Public email provider - Polska'),
  ('icloud.com', 'Public email provider - Apple'),
  ('me.com', 'Public email provider - Apple'),
  ('proton.me', 'Public email provider - Proton'),
  ('protonmail.com', 'Public email provider - Proton'),
  ('protonmail.ch', 'Public email provider - Proton'),
  ('aol.com', 'Public email provider - AOL'),
  ('mail.com', 'Public email provider - Mail.com'),
  ('yandex.com', 'Public email provider - Yandex'),
  ('zoho.com', 'Public email provider - Zoho')
ON CONFLICT (domain) DO NOTHING;

-- ============================================
-- STEP 3: Update Database Trigger
-- ============================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- New trigger with email domain detection
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

  -- Fallback: If no domain found, try metadata
  IF user_company_id IS NULL THEN
    user_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
  END IF;

  -- Insert new user
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

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 4: Dodaj testową firmę i domenę
-- ============================================
-- ZASTĄP "test.pl" SWOJĄ DOMENĄ!

-- Sprawdź czy istnieje firma (możesz użyć istniejącej)
DO $$
DECLARE
  test_company_id UUID;
BEGIN
  -- Pobierz pierwszą firmę z bazy lub utwórz nową
  SELECT id INTO test_company_id FROM companies LIMIT 1;

  IF test_company_id IS NULL THEN
    -- Utwórz testową firmę jeśli nie ma żadnej
    INSERT INTO companies (id, name, industry, employees_count)
    VALUES (
      gen_random_uuid(),
      'Test Company',
      'manufacturing',
      '10-50'
    )
    RETURNING id INTO test_company_id;
  END IF;

  -- Dodaj domenę email do tej firmy
  -- **ZMIEŃ "test.pl" NA SWOJĄ DOMENĘ!**
  INSERT INTO company_email_domains (company_id, email_domain)
  VALUES (test_company_id, 'test.pl')
  ON CONFLICT (email_domain) DO NOTHING;

  -- Wyświetl informację
  RAISE NOTICE 'Company ID: %', test_company_id;
  RAISE NOTICE 'Dodano domenę: test.pl';
END $$;

-- ============================================
-- STEP 5: Sprawdź czy wszystko działa
-- ============================================

-- Pokaż companies i ich domeny
SELECT
  c.id,
  c.name,
  array_agg(ced.email_domain) as email_domains
FROM companies c
LEFT JOIN company_email_domains ced ON c.id = ced.company_id
GROUP BY c.id, c.name;

-- Pokaż zablokowane domeny
SELECT COUNT(*) as blocked_domains_count FROM blocked_email_domains;

-- Sprawdź trigger
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ============================================
-- GOTOWE! ✅
-- ============================================
-- Teraz możesz przetestować rejestrację z:
-- - Firmowym emailem (np. test@test.pl) - POWINNO ZADZIAŁAĆ
-- - Publicznym emailem (np. test@gmail.com) - POWINIEN BYĆ BŁĄD
-- ============================================
