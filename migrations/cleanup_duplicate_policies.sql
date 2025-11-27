-- ============================================
-- CLEANUP DUPLICATE RLS POLICIES
-- 2025-11-25
-- ============================================
-- Usuwamy stare policies z rolą {public} które zostały zastąpione
-- przez nowe z {authenticated}

-- ============================================
-- ORDERS - usuń stare {public} policies
-- ============================================
DROP POLICY IF EXISTS "authenticated_users_insert_orders" ON orders;
DROP POLICY IF EXISTS "orders_select_own_company" ON orders;
DROP POLICY IF EXISTS "owners_delete_orders" ON orders;
DROP POLICY IF EXISTS "users_update_own_company_orders" ON orders;

-- ============================================
-- USERS - usuń stare {public} policies
-- ============================================
DROP POLICY IF EXISTS "users_delete_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- ============================================
-- TIME_LOGS - usuń duplikaty
-- ============================================
-- Zostaw tylko jedną SELECT policy
DROP POLICY IF EXISTS "Users can view their company's time logs" ON time_logs;

-- Zostaw tylko jedną DELETE policy (owners and managers)
DROP POLICY IF EXISTS "Only owners can delete time logs" ON time_logs;

-- ============================================
-- VERIFY - sprawdź wynik
-- ============================================
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
