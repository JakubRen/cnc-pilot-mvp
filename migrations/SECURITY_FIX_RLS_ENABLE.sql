-- ============================================
-- SECURITY FIX: Enable RLS on Missing Tables
-- Date: 2025-12-03
-- Priority: CRITICAL
-- ============================================

-- PROBLEM 1: company_email_domains - RLS policies exist but RLS not enabled
-- RISK: Anyone can read/modify company domains despite policies
-- FIX: Enable RLS

ALTER TABLE public.company_email_domains ENABLE ROW LEVEL SECURITY;

-- Verify policies exist (they should based on the error)
-- If not, uncomment and adjust:
-- DROP POLICY IF EXISTS "Only admins can manage domains" ON public.company_email_domains;
-- DROP POLICY IF EXISTS "Public can read domains for registration" ON public.company_email_domains;
-- DROP POLICY IF EXISTS "Users can view their company domains" ON public.company_email_domains;

-- CREATE POLICY "Only admins can manage domains"
-- ON public.company_email_domains
-- FOR ALL
-- USING (auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin'));

-- CREATE POLICY "Public can read domains for registration"
-- ON public.company_email_domains
-- FOR SELECT
-- USING (true); -- Allow registration flow to check domains

-- CREATE POLICY "Users can view their company domains"
-- ON public.company_email_domains
-- FOR SELECT
-- USING (company_id IN (SELECT company_id FROM users WHERE user_id = auth.uid()));

-- ============================================

-- PROBLEM 2: blocked_email_domains - No RLS at all
-- RISK: Public table without any protection
-- FIX: Enable RLS + Create policies

ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Public can read blocked domains" ON public.blocked_email_domains;
DROP POLICY IF EXISTS "Only admins can manage blocked domains" ON public.blocked_email_domains;

-- Allow public read (needed for registration validation)
CREATE POLICY "Public can read blocked domains"
ON public.blocked_email_domains
FOR SELECT
USING (true);

-- Only admins can modify
CREATE POLICY "Only admins can manage blocked domains"
ON public.blocked_email_domains
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE auth_id = auth.uid()
      AND role = 'admin'
  )
);

-- ============================================
-- VERIFICATION QUERIES
-- Run these after applying migration to verify
-- ============================================

-- Check RLS is enabled:
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('company_email_domains', 'blocked_email_domains');
-- Expected: rowsecurity = true for both

-- Check policies exist:
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('company_email_domains', 'blocked_email_domains')
ORDER BY tablename, policyname;

-- ============================================
-- NOTES
-- ============================================

-- Q: Why allow public read on these tables?
-- A: Registration flow needs to check if email domain is allowed/blocked
--    before user is created. This is safe because:
--    1. These are whitelists/blacklists (not sensitive data)
--    2. Only admins can MODIFY
--    3. Prevents user enumeration (can't determine if domain exists)

-- Q: What if I want stricter security?
-- A: Change public read policy to authenticated-only:
--    USING (auth.role() = 'authenticated')

-- ============================================
