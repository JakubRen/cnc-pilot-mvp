-- ============================================
-- FIX: Users table RLS infinite recursion
-- Problem: Policy on "users" references "users" table
-- Solution: Use security definer function to get company_id
-- ============================================

-- Step 1: Create a security definer function that bypasses RLS
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_my_company_id() TO authenticated;

-- Step 2: Drop the problematic policy
DROP POLICY IF EXISTS "Users can view users in their company" ON users;

-- Step 3: Create fixed policy using the function
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- Users can always see their own profile
    auth_id = auth.uid()
    OR
    -- Users can see other users in the same company (using function to avoid recursion)
    company_id = get_my_company_id()
  );

-- ============================================
-- ALSO FIX: Other tables that might have same issue
-- Update them to use the function instead of subquery
-- ============================================

-- Fix inventory policies
DROP POLICY IF EXISTS "Users can view their company's inventory" ON inventory;
CREATE POLICY "Users can view their company's inventory"
  ON inventory FOR SELECT
  TO authenticated
  USING (company_id = get_my_company_id());

DROP POLICY IF EXISTS "Users can create inventory items" ON inventory;
CREATE POLICY "Users can create inventory items"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_my_company_id());

DROP POLICY IF EXISTS "Users can update their company's inventory" ON inventory;
CREATE POLICY "Users can update their company's inventory"
  ON inventory FOR UPDATE
  TO authenticated
  USING (company_id = get_my_company_id());

-- Fix orders policies
DROP POLICY IF EXISTS "Users can view their company's orders" ON orders;
CREATE POLICY "Users can view their company's orders"
  ON orders FOR SELECT
  TO authenticated
  USING (company_id = get_my_company_id());

DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_my_company_id());

DROP POLICY IF EXISTS "Users can update their company's orders" ON orders;
CREATE POLICY "Users can update their company's orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (company_id = get_my_company_id());

-- Fix time_logs policies
DROP POLICY IF EXISTS "Users can view their company time logs" ON time_logs;
CREATE POLICY "Users can view their company time logs"
  ON time_logs FOR SELECT
  TO authenticated
  USING (company_id = get_my_company_id());

DROP POLICY IF EXISTS "Users can create time logs" ON time_logs;
CREATE POLICY "Users can create time logs"
  ON time_logs FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_my_company_id());

-- Fix ai_feedback_logs policies (the new table)
DROP POLICY IF EXISTS "Users can insert own feedback" ON ai_feedback_logs;
DROP POLICY IF EXISTS "Users can view company feedback" ON ai_feedback_logs;

CREATE POLICY "Users can insert own feedback"
  ON ai_feedback_logs FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can view company feedback"
  ON ai_feedback_logs FOR SELECT
  TO authenticated
  USING (company_id = get_my_company_id());

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this, test with:
-- SELECT * FROM users; (should work without recursion error)
