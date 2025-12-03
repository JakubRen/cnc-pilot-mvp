-- ============================================
-- SECURITY FIX: Remove SECURITY DEFINER from Views
-- Date: 2025-12-03
-- Priority: HIGH (not critical but important)
-- ============================================

-- PROBLEM: Views defined with SECURITY DEFINER bypass RLS
-- RISK: Users can access data they shouldn't via views
-- FIX: Change to SECURITY INVOKER (default) or add explicit RLS checks

-- ============================================
-- WHY SECURITY DEFINER IS RISKY:
-- ============================================
-- SECURITY DEFINER = View runs with CREATOR's permissions (usually postgres/admin)
-- SECURITY INVOKER = View runs with QUERYING USER's permissions (safer)
--
-- Example vulnerability:
-- 1. Admin creates view with SECURITY DEFINER
-- 2. View shows all orders (no RLS)
-- 3. Regular user queries view → sees ALL companies' orders!
--
-- SECURITY INVOKER respects RLS, so user only sees their company's data.
-- ============================================

-- ============================================
-- VIEW 1: audit_logs_with_users
-- ============================================

DROP VIEW IF EXISTS public.audit_logs_with_users CASCADE;

CREATE OR REPLACE VIEW public.audit_logs_with_users
WITH (security_invoker = true)  -- Use SECURITY INVOKER
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

-- Grant access to authenticated users
GRANT SELECT ON public.audit_logs_with_users TO authenticated;

-- ============================================
-- VIEW 2: overdue_external_operations
-- ============================================

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
  -- Calculate profit
  (total_cost * margin_percent / 100) AS profit,
  -- Calculate total with margin
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
  -- Calculate days overdue
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

-- ============================================
-- VERIFICATION
-- ============================================

-- Check views no longer have SECURITY DEFINER:
SELECT
  schemaname,
  viewname,
  viewowner,
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

-- Test as regular user (should only see own company data):
-- SELECT * FROM audit_logs_with_users LIMIT 5;
-- SELECT * FROM order_profitability LIMIT 5;

-- ============================================
-- NOTES
-- ============================================

-- Q: Why use security_invoker = true instead of SECURITY INVOKER?
-- A: PostgreSQL 15+ supports "security_invoker" as view option.
--    It's the modern, cleaner syntax. Both work the same.

-- Q: Will this break anything?
-- A: Only if code explicitly relies on bypassing RLS via these views.
--    If RLS policies are correct, everything should work fine.
--    Users will now see ONLY their company's data (as intended).

-- Q: What if I NEED a view to bypass RLS?
-- A: Use SECURITY DEFINER but add explicit filters:
--    WHERE company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid())
--    This gives you control while being secure.

-- ============================================
