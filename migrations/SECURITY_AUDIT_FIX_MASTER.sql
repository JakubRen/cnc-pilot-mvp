-- ============================================
-- MASTER SECURITY FIX - Supabase Linter Issues
-- Version: 1.2 (FIXED)
-- Date: 2025-12-03 14:30
-- Priority: CRITICAL
-- ============================================
-- This file combines all security fixes identified by Supabase Database Linter
-- Run this in Supabase SQL Editor to fix all 8 security issues
--
-- CHANGELOG:
-- v1.2 (2025-12-03 14:30) - Fixed column name in view: u.name → u.full_name
-- v1.1 (2025-12-03 14:00) - Fixed column name: user_id → auth_id
-- v1.0 (2025-12-03 12:00) - Initial release
-- ============================================

-- ============================================
-- SUMMARY OF ISSUES FOUND
-- ============================================
-- 1. company_email_domains - RLS not enabled (has policies but disabled)
-- 2. blocked_email_domains - RLS not enabled (no protection)
-- 3. audit_logs_with_users - SECURITY DEFINER view
-- 4. overdue_external_operations - SECURITY DEFINER view
-- 5. order_profitability - SECURITY DEFINER view
-- 6. machines_needing_maintenance - SECURITY DEFINER view
-- 7. email_statistics - SECURITY DEFINER view
-- ============================================

BEGIN;

-- ============================================
-- PART 1: ENABLE RLS ON TABLES
-- ============================================

-- FIX: company_email_domains
ALTER TABLE public.company_email_domains ENABLE ROW LEVEL SECURITY;

-- FIX: blocked_email_domains
ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;

-- Ensure policies exist for blocked_email_domains
DROP POLICY IF EXISTS "Public can read blocked domains" ON public.blocked_email_domains;
DROP POLICY IF EXISTS "Only admins can manage blocked domains" ON public.blocked_email_domains;

CREATE POLICY "Public can read blocked domains"
ON public.blocked_email_domains
FOR SELECT
USING (true);

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
-- PART 2: FIX SECURITY DEFINER VIEWS
-- ============================================

-- FIX: audit_logs_with_users
DROP VIEW IF EXISTS public.audit_logs_with_users CASCADE;
CREATE OR REPLACE VIEW public.audit_logs_with_users
WITH (security_invoker = true)
AS
SELECT
  al.id,
  al.table_name,
  al.record_id,
  al.action,
  al.old_data,
  al.new_data,
  al.company_id,
  al.created_at,
  al.user_id,
  u.email AS user_email,
  u.full_name AS user_name
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id;
GRANT SELECT ON public.audit_logs_with_users TO authenticated;

-- FIX: overdue_external_operations
DROP VIEW IF EXISTS public.overdue_external_operations CASCADE;
CREATE OR REPLACE VIEW public.overdue_external_operations
WITH (security_invoker = true)
AS
SELECT
  eo.id,
  eo.order_id,
  eo.cooperant_id,
  eo.operation_type,
  eo.status,
  eo.sent_date,
  eo.expected_return_date,
  eo.actual_return_date,
  eo.company_id,
  o.order_number,
  o.customer_name,
  c.name AS cooperant_name
FROM external_operations eo
LEFT JOIN orders o ON eo.order_id = o.id
LEFT JOIN cooperants c ON eo.cooperant_id = c.id
WHERE eo.status != 'returned'
  AND eo.expected_return_date < CURRENT_DATE;
GRANT SELECT ON public.overdue_external_operations TO authenticated;

-- FIX: order_profitability
DROP VIEW IF EXISTS public.order_profitability CASCADE;
CREATE OR REPLACE VIEW public.order_profitability
WITH (security_invoker = true)
AS
SELECT
  id,
  order_number,
  customer_name,
  material_cost,
  labor_cost,
  additional_costs,
  total_cost,
  margin_percent,
  (total_cost * margin_percent / 100) AS profit,
  (total_cost * (1 + margin_percent / 100)) AS total_price,
  company_id,
  status,
  created_at
FROM orders
WHERE total_cost IS NOT NULL
  AND total_cost > 0;
GRANT SELECT ON public.order_profitability TO authenticated;

-- FIX: machines_needing_maintenance
DROP VIEW IF EXISTS public.machines_needing_maintenance CASCADE;
CREATE OR REPLACE VIEW public.machines_needing_maintenance
WITH (security_invoker = true)
AS
SELECT
  m.id,
  m.name,
  m.machine_type,
  m.status,
  m.last_maintenance_date,
  m.next_maintenance_date,
  m.maintenance_interval_days,
  m.company_id,
  CASE
    WHEN m.next_maintenance_date < CURRENT_DATE
    THEN CURRENT_DATE - m.next_maintenance_date
    ELSE 0
  END AS days_overdue
FROM machines m
WHERE m.next_maintenance_date < CURRENT_DATE
  OR m.status = 'maintenance_needed';
GRANT SELECT ON public.machines_needing_maintenance TO authenticated;

-- FIX: email_statistics
DROP VIEW IF EXISTS public.email_statistics CASCADE;
CREATE OR REPLACE VIEW public.email_statistics
WITH (security_invoker = true)
AS
SELECT
  company_id,
  status,
  COUNT(*) AS count,
  DATE(created_at) AS date
FROM email_notifications
GROUP BY company_id, status, DATE(created_at);
GRANT SELECT ON public.email_statistics TO authenticated;

COMMIT;

-- ============================================
-- POST-MIGRATION VERIFICATION
-- ============================================

-- Verify RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('company_email_domains', 'blocked_email_domains');
-- Expected: rowsecurity = true

-- Verify views no longer have SECURITY DEFINER
SELECT
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'audit_logs_with_users',
    'overdue_external_operations',
    'order_profitability',
    'machines_needing_maintenance',
    'email_statistics'
  );

-- Check policies exist
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('company_email_domains', 'blocked_email_domains')
ORDER BY tablename, policyname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Security fixes applied successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed issues:';
  RAISE NOTICE '  ✓ Enabled RLS on company_email_domains';
  RAISE NOTICE '  ✓ Enabled RLS on blocked_email_domains';
  RAISE NOTICE '  ✓ Fixed 5 SECURITY DEFINER views';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run verification queries above';
  RAISE NOTICE '  2. Test application functionality';
  RAISE NOTICE '  3. Re-run Supabase Database Linter';
  RAISE NOTICE '  4. Confirm all 8 errors are resolved';
END $$;
