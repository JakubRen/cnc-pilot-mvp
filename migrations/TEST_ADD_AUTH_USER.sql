-- ============================================================================
-- ADD AUTH USER TO TEST DATABASE
-- Creates test@cnc-pilot.pl in auth.users table for E2E test authentication
-- ============================================================================

-- IMPORTANT: Run this ONLY in TEST database!
-- Supabase SQL Editor: https://app.supabase.com/project/vvetjctdjswgwebhgbpd/sql/new

-- STEP 1: Create or update auth user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test@cnc-pilot.pl',
  crypt('test123456', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated'
)
ON CONFLICT (email) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = NOW(),
  updated_at = NOW();

-- STEP 2: Verify auth user exists
SELECT
  email,
  email_confirmed_at,
  confirmed_at,
  role,
  created_at
FROM auth.users
WHERE email = 'test@cnc-pilot.pl';

-- STEP 3: Verify public.users record exists (should be auto-created by trigger)
SELECT
  email,
  full_name,
  role,
  company_id,
  created_at
FROM public.users
WHERE email = 'test@cnc-pilot.pl';

-- Expected output:
-- auth.users: 1 row with email_confirmed_at and confirmed_at set to NOW()
-- public.users: 1 row with role='owner' and company_id set

-- If public.users doesn't exist, the trigger might not have fired.
-- In that case, check if the trigger exists:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Success message
SELECT 'AUTH USER CREATED - Login should work now!' AS status;
