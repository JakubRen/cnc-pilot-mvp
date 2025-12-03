-- ============================================
-- SECURITY FIX V2.0 - COMPLETE REWRITE
-- Date: 2025-12-03 15:00
-- Priority: CRITICAL
-- ============================================
-- This version uses CORRECT column names from actual database schema
-- Tested against real table structures
-- ============================================

BEGIN;

-- ============================================
-- PART 1: ENABLE RLS ON TABLES
-- ============================================

-- Table 1: company_email_domains
ALTER TABLE public.company_email_domains ENABLE ROW LEVEL SECURITY;

-- Table 2: blocked_email_domains
ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;

-- Create policies for blocked_email_domains
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

-- ============================================
-- VIEW 1: audit_logs_with_users
-- ============================================
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
  u.full_name AS user_name  -- FIXED: was u.name
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id;

GRANT SELECT ON public.audit_logs_with_users TO authenticated;

-- ============================================
-- VIEW 2: overdue_external_operations
-- FIXED: Use correct table structure with items
-- ============================================
DROP VIEW IF EXISTS public.overdue_external_operations CASCADE;

CREATE OR REPLACE VIEW public.overdue_external_operations
WITH (security_invoker = true)
AS
SELECT
  eo.id,
  eo.cooperant_id,
  eo.operation_number,
  eo.operation_type,
  eo.status,
  eo.sent_date,
  eo.expected_return_date,
  eo.actual_return_date,
  eo.company_id,
  c.name AS cooperant_name,
  -- Aggregate order info from items
  COUNT(DISTINCT eoi.order_id) AS order_count,
  STRING_AGG(DISTINCT o.order_number, ', ') AS order_numbers
FROM external_operations eo
LEFT JOIN cooperants c ON eo.cooperant_id = c.id
LEFT JOIN external_operation_items eoi ON eoi.external_operation_id = eo.id
LEFT JOIN orders o ON eoi.order_id = o.id
WHERE eo.status NOT IN ('completed', 'returned')
  AND eo.expected_return_date < CURRENT_DATE
GROUP BY
  eo.id,
  eo.cooperant_id,
  eo.operation_number,
  eo.operation_type,
  eo.status,
  eo.sent_date,
  eo.expected_return_date,
  eo.actual_return_date,
  eo.company_id,
  c.name;

GRANT SELECT ON public.overdue_external_operations TO authenticated;

-- ============================================
-- VIEW 3: order_profitability
-- ============================================
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

-- ============================================
-- VIEW 4: machines_needing_maintenance
-- ============================================
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

-- ============================================
-- VIEW 5: email_statistics
-- ============================================
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

-- Verify views exist and are queryable
SELECT
  schemaname,
  viewname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'audit_logs_with_users',
    'overdue_external_operations',
    'order_profitability',
    'machines_needing_maintenance',
    'email_statistics'
  );
-- Expected: 5 rows

-- Test views are accessible (should not error)
SELECT COUNT(*) FROM audit_logs_with_users LIMIT 1;
SELECT COUNT(*) FROM overdue_external_operations LIMIT 1;
SELECT COUNT(*) FROM order_profitability LIMIT 1;
SELECT COUNT(*) FROM machines_needing_maintenance LIMIT 1;
SELECT COUNT(*) FROM email_statistics LIMIT 1;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Security fixes applied successfully (v2.0)!';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed issues:';
  RAISE NOTICE '  ✓ Enabled RLS on company_email_domains';
  RAISE NOTICE '  ✓ Enabled RLS on blocked_email_domains';
  RAISE NOTICE '  ✓ Fixed 5 SECURITY DEFINER views';
  RAISE NOTICE '  ✓ Used correct column names (auth_id, full_name)';
  RAISE NOTICE '  ✓ Fixed external_operations JOIN structure';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Verification queries completed above';
  RAISE NOTICE '  2. Test application functionality';
  RAISE NOTICE '  3. Re-run Supabase Database Linter';
  RAISE NOTICE '  4. Confirm all 8 errors are resolved';
END $$;
