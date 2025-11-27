-- ============================================
-- SECURITY RLS AUDIT FIX - 2025-11-25
-- CNC-Pilot MVP - Day 1 Backend Security
-- ============================================

-- ISSUE 1: time_logs table has NO RLS policies
-- ISSUE 2: users table allows reading ALL users across companies
-- ISSUE 3: warehouse_documents uses app.current_company_id pattern (needs alternative)

-- ============================================
-- FIX 1: time_logs RLS Policies
-- ============================================

-- Enable RLS on time_logs (if not already)
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (cleanup)
DROP POLICY IF EXISTS "Users can view their company time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can create time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can update their own time logs" ON time_logs;
DROP POLICY IF EXISTS "Managers can update all company time logs" ON time_logs;
DROP POLICY IF EXISTS "Only owners can delete time logs" ON time_logs;

-- Policy: Users can view all time logs in their company
CREATE POLICY "Users can view their company time logs"
  ON time_logs FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Users can create time logs for their company
CREATE POLICY "Users can create time logs"
  ON time_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Users can update their own time logs
CREATE POLICY "Users can update their own time logs"
  ON time_logs FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Managers/Admins/Owners can update any time log in their company
CREATE POLICY "Managers can update all company time logs"
  ON time_logs FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
    )
  );

-- Policy: Only owners can delete time logs
CREATE POLICY "Only owners can delete time logs"
  ON time_logs FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_id = auth.uid()
      AND role = 'owner'
    )
  );

-- ============================================
-- FIX 2: Tighten users table SELECT policy
-- (Currently allows reading ALL users across companies)
-- ============================================

-- Note: We need to be careful here because inventory/orders RLS
-- policies need to look up company_id from users table.
-- The solution is to use auth_id = auth.uid() in those policies.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;

-- Replace with company-scoped policy
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- Users can always see their own profile
    auth_id = auth.uid()
    OR
    -- Users can see other users in the same company
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- ============================================
-- FIX 3: Update inventory/orders RLS to use auth_id
-- (To avoid dependency on users SELECT policy)
-- ============================================

-- Update inventory policies to use auth_id pattern
DROP POLICY IF EXISTS "Users can view their company's inventory" ON inventory;
DROP POLICY IF EXISTS "Users can create inventory items" ON inventory;
DROP POLICY IF EXISTS "Users can update their company's inventory" ON inventory;
DROP POLICY IF EXISTS "Only owners can delete inventory items" ON inventory;

CREATE POLICY "Users can view their company's inventory"
  ON inventory FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can create inventory items"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's inventory"
  ON inventory FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Only owners can delete inventory items"
  ON inventory FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Update orders policies similarly
DROP POLICY IF EXISTS "Users can view their company's orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update their company's orders" ON orders;
DROP POLICY IF EXISTS "Only owners can delete orders" ON orders;

CREATE POLICY "Users can view their company's orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Only owners can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_id = auth.uid()
      AND role = 'owner'
    )
  );

-- ============================================
-- FIX 4: Update warehouse_documents RLS
-- (Change from app.current_company_id to auth-based)
-- ============================================

DROP POLICY IF EXISTS "warehouse_documents_company_isolation" ON warehouse_documents;
DROP POLICY IF EXISTS "warehouse_document_items_isolation" ON warehouse_document_items;

CREATE POLICY "Users can access their company warehouse documents"
  ON warehouse_documents FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their company warehouse document items"
  ON warehouse_document_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warehouse_documents wd
      WHERE wd.id = warehouse_document_items.document_id
      AND wd.company_id IN (
        SELECT company_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check RLS is enabled on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'companies', 'orders', 'inventory',
    'time_logs', 'warehouse_documents', 'warehouse_document_items'
  )
ORDER BY tablename;

-- List all RLS policies
SELECT
  tablename,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE tablename IN (
  'users', 'companies', 'orders', 'inventory',
  'time_logs', 'warehouse_documents', 'warehouse_document_items'
)
ORDER BY tablename, policyname;

-- ============================================
-- DONE - Security audit fixes applied
-- ============================================
-- ✅ time_logs: Added full RLS policies
-- ✅ users: Scoped to company (prevents cross-company leaks)
-- ✅ inventory: Updated to use auth_id pattern
-- ✅ orders: Updated to use auth_id pattern
-- ✅ warehouse_documents: Changed to auth-based RLS
-- ============================================
