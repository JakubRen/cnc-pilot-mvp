-- ============================================
-- COMPLETE FIX: Warehouse Documents RLS
-- Run this in Supabase Studio → SQL Editor (TEST database)
-- ============================================

-- 1. Drop ALL existing policies on warehouse_documents
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'warehouse_documents'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON warehouse_documents', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- 2. Drop ALL existing policies on warehouse_document_items
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'warehouse_document_items'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON warehouse_document_items', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- 3. Ensure RLS is enabled
ALTER TABLE warehouse_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_document_items ENABLE ROW LEVEL SECURITY;

-- 4. Create clean policy for warehouse_documents
CREATE POLICY "warehouse_docs_company_access"
ON warehouse_documents
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT u.company_id
    FROM users u
    WHERE u.auth_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT u.company_id
    FROM users u
    WHERE u.auth_id = auth.uid()
  )
);

-- 5. Create clean policy for warehouse_document_items
CREATE POLICY "warehouse_items_company_access"
ON warehouse_document_items
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM warehouse_documents wd
    JOIN users u ON u.company_id = wd.company_id
    WHERE wd.id = warehouse_document_items.document_id
    AND u.auth_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM warehouse_documents wd
    JOIN users u ON u.company_id = wd.company_id
    WHERE wd.id = warehouse_document_items.document_id
    AND u.auth_id = auth.uid()
  )
);

-- 6. Verify policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename IN ('warehouse_documents', 'warehouse_document_items')
ORDER BY tablename, policyname;

-- 7. Check if any documents exist (for debugging)
SELECT
  id,
  document_number,
  document_type,
  company_id,
  status,
  created_at
FROM warehouse_documents
ORDER BY created_at DESC
LIMIT 5;
