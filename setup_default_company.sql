-- Setup script: Create default company and fix existing users
-- Run this ONCE in Supabase SQL Editor

-- 1. Create default company (if doesn't exist)
INSERT INTO companies (id, name, industry, employees_count)
VALUES (
  'default-company-id-00000000000000'::uuid,
  'Default Company',
  'manufacturing',
  '10-50'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Update all users without company_id to use default company
UPDATE users
SET company_id = 'default-company-id-00000000000000'::uuid
WHERE company_id IS NULL;

-- 3. Verify
SELECT u.id, u.email, u.full_name, u.company_id, c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id;
