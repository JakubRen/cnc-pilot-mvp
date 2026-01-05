-- =====================================================
-- FIX TEST DATABASE: Add missing columns to production_plans
-- =====================================================
-- Date: 2026-01-04
-- Purpose: TEST database has outdated production_plans schema
--          Missing columns that app requires for production plan creation
--
-- Problem: E2E test "should link back to order from production plan details" fails
--          because order_id is NULL (and other fields are missing)
--
-- Root Cause: TEST database schema doesn't match PROD schema
-- =====================================================

-- Add missing columns to production_plans table
-- NOTE: order_item_id NOT included (order_items table doesn't exist in TEST)
-- NOTE: drawing_file_id NO foreign key (files table doesn't exist in TEST)
ALTER TABLE production_plans
  ADD COLUMN IF NOT EXISTS part_name TEXT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER,
  ADD COLUMN IF NOT EXISTS material TEXT,
  ADD COLUMN IF NOT EXISTS length NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS width NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS height NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS drawing_file_id UUID,
  ADD COLUMN IF NOT EXISTS technical_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS total_setup_time_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_run_time_minutes NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS approved_by BIGINT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Make part_name and quantity NOT NULL after adding them
-- (new rows will need these columns)
-- First set defaults for existing rows if any
UPDATE production_plans SET part_name = 'Unknown Part' WHERE part_name IS NULL;
UPDATE production_plans SET quantity = 1 WHERE quantity IS NULL;

-- Set NOT NULL constraints (safely handle if already set)
DO $$
BEGIN
  ALTER TABLE production_plans ALTER COLUMN part_name SET NOT NULL;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'part_name already NOT NULL or error, skipping';
END $$;

DO $$
BEGIN
  ALTER TABLE production_plans ALTER COLUMN quantity SET NOT NULL;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'quantity already NOT NULL or error, skipping';
END $$;

-- Add CHECK constraint for quantity (if not exists)
DO $$
BEGIN
  ALTER TABLE production_plans
    ADD CONSTRAINT production_plans_quantity_check CHECK (quantity > 0);
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Constraint production_plans_quantity_check already exists, skipping';
END $$;

-- Add index for is_active column
CREATE INDEX IF NOT EXISTS idx_production_plans_active ON production_plans(is_active) WHERE is_active = true;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  -- Count columns in production_plans
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'production_plans'
    AND table_schema = 'public';

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'SCHEMA FIX VERIFICATION:';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'production_plans table now has % columns', column_count;
  RAISE NOTICE 'Expected: ~21 columns (was ~8 before fix)';
  RAISE NOTICE 'NOTE: order_item_id excluded (no order_items table)';
  RAISE NOTICE '==========================================';

  IF column_count >= 19 THEN
    RAISE NOTICE '✅ SUCCESS: Schema updated for TEST database';
  ELSE
    RAISE WARNING '⚠️ WARNING: Schema may still be incomplete!';
  END IF;
END $$;

-- List all columns for verification
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'production_plans'
  AND table_schema = 'public'
ORDER BY ordinal_position;
