-- ============================================================================
-- FIX INFINITE RECURSION IN POLICIES
-- Quick fix - disable RLS temporarily, then re-enable with correct policies
-- ============================================================================

-- STEP 1: Disable RLS on all tables (temporary)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE operations DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_email_domains DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_email_domains DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop all existing policies (they might have infinite recursion)
DROP POLICY IF EXISTS "Users can view own company users" ON users;
DROP POLICY IF EXISTS "Users can insert own company users" ON users;
DROP POLICY IF EXISTS "Users can update own company users" ON users;
DROP POLICY IF EXISTS "Users can delete own company users" ON users;

DROP POLICY IF EXISTS "Users can view own company orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own company orders" ON orders;
DROP POLICY IF EXISTS "Users can update own company orders" ON orders;
DROP POLICY IF EXISTS "Users can delete own company orders" ON orders;

DROP POLICY IF EXISTS "Users can view own company inventory" ON inventory;
DROP POLICY IF EXISTS "Users can insert own company inventory" ON inventory;
DROP POLICY IF EXISTS "Users can update own company inventory" ON inventory;
DROP POLICY IF EXISTS "Users can delete own company inventory" ON inventory;

DROP POLICY IF EXISTS "Users can view own company time_logs" ON time_logs;
DROP POLICY IF EXISTS "Users can insert own company time_logs" ON time_logs;
DROP POLICY IF EXISTS "Users can update own company time_logs" ON time_logs;
DROP POLICY IF EXISTS "Users can delete own company time_logs" ON time_logs;

DROP POLICY IF EXISTS "Users can view own company production_plans" ON production_plans;
DROP POLICY IF EXISTS "Users can insert own company production_plans" ON production_plans;
DROP POLICY IF EXISTS "Users can update own company production_plans" ON production_plans;
DROP POLICY IF EXISTS "Users can delete own company production_plans" ON production_plans;

DROP POLICY IF EXISTS "Users can view own company operations" ON operations;
DROP POLICY IF EXISTS "Users can insert own company operations" ON operations;
DROP POLICY IF EXISTS "Users can update own company operations" ON operations;
DROP POLICY IF EXISTS "Users can delete own company operations" ON operations;

DROP POLICY IF EXISTS "Users can view own company email domains" ON company_email_domains;
DROP POLICY IF EXISTS "Users can view blocked domains" ON blocked_email_domains;

-- STEP 3: Create helper function for safe policy checks
CREATE OR REPLACE FUNCTION get_user_company_id(user_auth_id UUID)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM users WHERE auth_id = user_auth_id LIMIT 1;
$$;

-- STEP 4: Re-create policies using helper function (NO RECURSION)

-- Users table policies
CREATE POLICY "Users can view own company users"
  ON users FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company users"
  ON users FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company users"
  ON users FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

-- Orders table policies
CREATE POLICY "Users can view own company orders"
  ON orders FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company orders"
  ON orders FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company orders"
  ON orders FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete own company orders"
  ON orders FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()));

-- Inventory table policies
CREATE POLICY "Users can view own company inventory"
  ON inventory FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company inventory"
  ON inventory FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company inventory"
  ON inventory FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete own company inventory"
  ON inventory FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()));

-- Time logs table policies
CREATE POLICY "Users can view own company time_logs"
  ON time_logs FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company time_logs"
  ON time_logs FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company time_logs"
  ON time_logs FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete own company time_logs"
  ON time_logs FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()));

-- Production plans table policies
CREATE POLICY "Users can view own company production_plans"
  ON production_plans FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company production_plans"
  ON production_plans FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company production_plans"
  ON production_plans FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete own company production_plans"
  ON production_plans FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()));

-- Operations table policies
CREATE POLICY "Users can view own company operations"
  ON operations FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company operations"
  ON operations FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company operations"
  ON operations FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete own company operations"
  ON operations FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()));

-- Company email domains (read-only for most users)
CREATE POLICY "Users can view own company email domains"
  ON company_email_domains FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

-- Blocked domains (read-only for all authenticated users)
CREATE POLICY "Users can view blocked domains"
  ON blocked_email_domains FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- STEP 5: Re-enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_email_domains ENABLE ROW LEVEL SECURITY;

-- STEP 6: Verify - should return rows now
SELECT 'POLICIES FIXED - Run check-test-db.js to verify' AS status;
