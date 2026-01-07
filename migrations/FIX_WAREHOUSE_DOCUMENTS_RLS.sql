-- Fix RLS policies for warehouse_documents and warehouse_document_items
-- Run this on TEST database

-- Drop old policies
DROP POLICY IF EXISTS "warehouse_documents_company_isolation" ON warehouse_documents;
DROP POLICY IF EXISTS "Users can access their company warehouse documents" ON warehouse_documents;
DROP POLICY IF EXISTS "warehouse_document_items_isolation" ON warehouse_document_items;
DROP POLICY IF EXISTS "Users can access their company warehouse document items" ON warehouse_document_items;

-- Enable RLS
ALTER TABLE warehouse_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_document_items ENABLE ROW LEVEL SECURITY;

-- Policy for warehouse_documents - ALL operations (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Users can access their company warehouse documents"
ON warehouse_documents
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT users.company_id
    FROM users
    WHERE users.auth_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT users.company_id
    FROM users
    WHERE users.auth_id = auth.uid()
  )
);

-- Policy for warehouse_document_items - ALL operations
CREATE POLICY "Users can access their company warehouse document items"
ON warehouse_document_items
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM warehouse_documents wd
    WHERE wd.id = warehouse_document_items.document_id
    AND wd.company_id IN (
      SELECT users.company_id
      FROM users
      WHERE users.auth_id = auth.uid()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM warehouse_documents wd
    WHERE wd.id = warehouse_document_items.document_id
    AND wd.company_id IN (
      SELECT users.company_id
      FROM users
      WHERE users.auth_id = auth.uid()
    )
  )
);

-- Verify
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('warehouse_documents', 'warehouse_document_items')
ORDER BY tablename, policyname;
