-- =========================================
-- UTWÓRZ TEST COMPANY + USER
-- =========================================
-- Uruchom to w TEST SQL Editor
-- =========================================

-- KROK 1: Utwórz company
INSERT INTO public.companies (id, name, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Test Company',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- KROK 2: Whitelist domeny cnc-pilot.pl
INSERT INTO public.company_email_domains (company_id, email_domain, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'cnc-pilot.pl',
  NOW()
)
ON CONFLICT DO NOTHING;

-- KROK 3: Sprawdź czy user istnieje w auth.users
-- (to zrobi trigger handle_new_user automatycznie po rejestracji)
-- Ale jeśli user już jest w auth.users, dodaj go do public.users:

INSERT INTO public.users (auth_id, email, full_name, role, company_id)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', 'Test User'),
  'owner',
  '00000000-0000-0000-0000-000000000001'::UUID
FROM auth.users
WHERE email = 'test@cnc-pilot.pl'
ON CONFLICT (auth_id) DO UPDATE
SET
  company_id = '00000000-0000-0000-0000-000000000001'::UUID,
  role = 'owner';
