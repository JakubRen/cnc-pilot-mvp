-- =====================================================
-- SYNC QUOTES SCHEMA - Run on PROD to match TEST
-- =====================================================
-- Created: 2026-01-19
-- Purpose: Add missing columns, FKs, and RLS policies
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =====================================================

-- =====================================================
-- STEP 1: ADD MISSING COLUMNS TO quotes
-- =====================================================

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- STEP 2: ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

-- FK: quotes.created_by -> users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'quotes' AND constraint_name = 'quotes_created_by_fkey'
  ) THEN
    ALTER TABLE quotes
    ADD CONSTRAINT quotes_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- FK: quotes.customer_id -> customers.id (optional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'quotes' AND constraint_name = 'quotes_customer_id_fkey'
    ) THEN
      ALTER TABLE quotes
      ADD CONSTRAINT quotes_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- =====================================================
-- STEP 3: RLS POLICIES FOR quotes
-- =====================================================

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe cleanup)
DROP POLICY IF EXISTS "quotes_select" ON quotes;
DROP POLICY IF EXISTS "quotes_insert" ON quotes;
DROP POLICY IF EXISTS "quotes_update" ON quotes;
DROP POLICY IF EXISTS "quotes_delete" ON quotes;
DROP POLICY IF EXISTS "Users can view quotes for their company" ON quotes;
DROP POLICY IF EXISTS "Users can insert quotes for their company" ON quotes;
DROP POLICY IF EXISTS "Users can update quotes for their company" ON quotes;
DROP POLICY IF EXISTS "Users can delete quotes for their company" ON quotes;
DROP POLICY IF EXISTS "quotes_company_isolation" ON quotes;

-- Create clean policies
CREATE POLICY "quotes_select" ON quotes FOR SELECT
USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "quotes_insert" ON quotes FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "quotes_update" ON quotes FOR UPDATE
USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "quotes_delete" ON quotes FOR DELETE
USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- =====================================================
-- STEP 4: RLS POLICIES FOR quote_items
-- =====================================================

-- Enable RLS
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "quote_items_select" ON quote_items;
DROP POLICY IF EXISTS "quote_items_insert" ON quote_items;
DROP POLICY IF EXISTS "quote_items_update" ON quote_items;
DROP POLICY IF EXISTS "quote_items_delete" ON quote_items;

-- Create policies (access via quote's company_id)
CREATE POLICY "quote_items_select" ON quote_items FOR SELECT
USING (
  quote_id IN (
    SELECT id FROM quotes WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

CREATE POLICY "quote_items_insert" ON quote_items FOR INSERT
WITH CHECK (
  quote_id IN (
    SELECT id FROM quotes WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

CREATE POLICY "quote_items_update" ON quote_items FOR UPDATE
USING (
  quote_id IN (
    SELECT id FROM quotes WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

CREATE POLICY "quote_items_delete" ON quote_items FOR DELETE
USING (
  quote_id IN (
    SELECT id FROM quotes WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

-- =====================================================
-- STEP 5: VERIFICATION
-- =====================================================

-- Check quotes columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'quotes'
  AND column_name IN ('customer_id', 'notes', 'created_by')
ORDER BY column_name;

-- Check FKs
SELECT constraint_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'quotes' AND constraint_name LIKE '%fkey%';

-- Check policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('quotes', 'quote_items')
ORDER BY tablename, cmd;
