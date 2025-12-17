-- =====================================================
-- REFACTOR: Proper Order → Order Items → Production Plans → Operations structure
-- =====================================================
-- Date: 2025-12-17
-- Purpose: Separate commercial layer (orders) from technical layer (production plans)
--
-- OLD STRUCTURE (WRONG):
--   orders → order_items (mixed: commercial + technical) → operations
--
-- NEW STRUCTURE (CORRECT):
--   orders → order_items (commercial only) → production_plans (technical) → operations
--
-- Benefits:
-- - Clear separation of concerns (commercial vs technical)
-- - Orders can exist without production plans
-- - Multiple plans per order item (versions, revisions)
-- - Better tracking and history
-- =====================================================

-- =====================================================
-- STEP 1: Create production_plans table
-- =====================================================

CREATE TABLE IF NOT EXISTS production_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  plan_number TEXT UNIQUE NOT NULL, -- PP-2025-0001 (auto-generated)

  -- Link to order item
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,

  -- Product details (copied from order_item but can be modified by technician)
  part_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  material TEXT,

  -- Dimensions (optional)
  length NUMERIC(10,2),
  width NUMERIC(10,2),
  height NUMERIC(10,2),

  -- Technical drawing
  drawing_file_id UUID REFERENCES files(id),
  technical_notes TEXT,

  -- Plan status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'in_progress', 'completed', 'cancelled')),
  is_active BOOLEAN DEFAULT true, -- Only one active plan per order_item

  -- Summary costs (calculated from operations)
  total_setup_time_minutes INTEGER DEFAULT 0,
  total_run_time_minutes NUMERIC(10,2) DEFAULT 0,
  estimated_cost NUMERIC(10,2) DEFAULT 0,
  actual_cost NUMERIC(10,2),

  -- Approval workflow
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMP,

  -- Metadata
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for production_plans
CREATE INDEX idx_production_plans_company ON production_plans(company_id);
CREATE INDEX idx_production_plans_order ON production_plans(order_id);
CREATE INDEX idx_production_plans_order_item ON production_plans(order_item_id);
CREATE INDEX idx_production_plans_status ON production_plans(status);
CREATE INDEX idx_production_plans_active ON production_plans(is_active) WHERE is_active = true;

-- Unique constraint: only one active plan per order_item
CREATE UNIQUE INDEX idx_production_plans_active_per_order_item
ON production_plans(order_item_id)
WHERE is_active = true;

-- =====================================================
-- STEP 2: Migrate data from order_items to production_plans
-- =====================================================

-- Disable triggers during migration
SET session_replication_role = replica;

-- Copy all existing order_items to production_plans
INSERT INTO production_plans (
  company_id,
  plan_number,
  order_id,
  order_item_id,
  part_name,
  quantity,
  material,
  length,
  width,
  height,
  drawing_file_id,
  technical_notes,
  status,
  is_active,
  total_setup_time_minutes,
  total_run_time_minutes,
  estimated_cost,
  created_by,
  created_at,
  updated_at
)
SELECT
  o.company_id,
  'PP-MIGRATED-' || oi.id::text AS plan_number, -- Temporary number (will be regenerated)
  oi.order_id,
  oi.id AS order_item_id,
  oi.part_name,
  oi.quantity,
  oi.material,
  oi.length,
  oi.width,
  oi.height,
  oi.drawing_file_id,
  oi.notes AS technical_notes,
  'active' AS status, -- All existing plans are active
  true AS is_active,
  oi.total_setup_time_minutes,
  oi.total_run_time_minutes,
  oi.total_cost AS estimated_cost,
  o.created_by,
  oi.created_at,
  oi.updated_at
FROM order_items oi
JOIN orders o ON oi.order_id = o.id;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- =====================================================
-- STEP 3: Update operations table to reference production_plans
-- =====================================================

-- Add new column for production_plan_id
ALTER TABLE operations ADD COLUMN IF NOT EXISTS production_plan_id UUID REFERENCES production_plans(id) ON DELETE CASCADE;

-- Migrate foreign keys from order_item_id to production_plan_id
UPDATE operations op
SET production_plan_id = pp.id
FROM production_plans pp
WHERE op.order_item_id = pp.order_item_id;

-- Make production_plan_id NOT NULL after data migration
ALTER TABLE operations ALTER COLUMN production_plan_id SET NOT NULL;

-- Drop old order_item_id column (after backup!)
-- UNCOMMENT after verifying data migration:
-- ALTER TABLE operations DROP COLUMN IF EXISTS order_item_id;

-- Add index for new FK
CREATE INDEX IF NOT EXISTS idx_operations_production_plan ON operations(production_plan_id);

-- =====================================================
-- STEP 4: Simplify order_items table (remove technical fields)
-- =====================================================

-- Remove technical fields that now belong to production_plans
-- UNCOMMENT after verifying data migration:
-- ALTER TABLE order_items DROP COLUMN IF EXISTS total_setup_time_minutes;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS total_run_time_minutes;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS total_cost;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS length;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS width;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS height;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS material;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS complexity;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS drawing_file_id;

-- order_items now contains ONLY commercial data:
-- - part_name (what customer ordered)
-- - quantity (how many)
-- - notes (customer notes)
-- Technical details moved to production_plans

-- =====================================================
-- STEP 5: Add RLS policies for production_plans
-- =====================================================

-- Enable RLS
ALTER TABLE production_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see production plans from their company
CREATE POLICY production_plans_company_isolation ON production_plans
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

-- =====================================================
-- STEP 6: Update auto-numbering function for production plans
-- =====================================================

-- Function already exists from auto_document_numbering.sql:
-- generate_production_plan_number(p_company_id UUID)
-- Returns: PP-2025-0001, PP-2025-0002, etc.

-- Update migrated plan numbers to use proper format
DO $$
DECLARE
  plan_record RECORD;
  new_plan_number TEXT;
BEGIN
  FOR plan_record IN
    SELECT id, company_id FROM production_plans WHERE plan_number LIKE 'PP-MIGRATED-%'
  LOOP
    -- Generate new plan number
    SELECT generate_production_plan_number(plan_record.company_id) INTO new_plan_number;

    -- Update the plan
    UPDATE production_plans
    SET plan_number = new_plan_number
    WHERE id = plan_record.id;
  END LOOP;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

DO $$
DECLARE
  order_items_count INTEGER;
  production_plans_count INTEGER;
  operations_with_plan_id INTEGER;
  operations_without_plan_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO order_items_count FROM order_items;
  SELECT COUNT(*) INTO production_plans_count FROM production_plans;
  SELECT COUNT(*) INTO operations_with_plan_id FROM operations WHERE production_plan_id IS NOT NULL;
  SELECT COUNT(*) INTO operations_without_plan_id FROM operations WHERE production_plan_id IS NULL;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'MIGRATION VERIFICATION:';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Order items: %', order_items_count;
  RAISE NOTICE 'Production plans created: %', production_plans_count;
  RAISE NOTICE 'Operations linked to plans: %', operations_with_plan_id;
  RAISE NOTICE 'Operations NOT linked (should be 0): %', operations_without_plan_id;
  RAISE NOTICE '==========================================';

  IF production_plans_count = order_items_count THEN
    RAISE NOTICE '✅ SUCCESS: All order items have production plans';
  ELSE
    RAISE WARNING '⚠️ WARNING: Mismatch in counts!';
  END IF;

  IF operations_without_plan_id = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All operations linked to production plans';
  ELSE
    RAISE WARNING '⚠️ WARNING: Some operations not linked to plans!';
  END IF;
END $$;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. This migration is SAFE - creates new table without dropping old data
-- 2. Old order_items data is preserved (commented DROP COLUMN statements)
-- 3. After verification, uncomment DROP COLUMN statements to clean up
-- 4. All existing operations are preserved and relinked
-- 5. All existing plan numbers are regenerated to PP-2025-NNNN format
--
-- ROLLBACK (if needed):
-- - DROP TABLE production_plans CASCADE;
-- - ALTER TABLE operations DROP COLUMN production_plan_id;
-- - Restore order_items structure from backup
-- =====================================================
