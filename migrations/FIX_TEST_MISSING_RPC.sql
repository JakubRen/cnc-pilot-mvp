-- =====================================================
-- FIX: Missing RPC Function in TEST Database
-- =====================================================
-- Date: 2026-01-05
-- Purpose: Add generate_production_plan_number() function
--          which is causing E2E test failures
--
-- Error: duplicate key value violates unique constraint
--        "production_plans_company_id_plan_number_key"
--
-- Root cause: RPC function doesn't exist, so app uses
--             fallback PP-{timestamp} which creates duplicates
-- =====================================================

-- Drop if exists (safe re-run)
DROP FUNCTION IF EXISTS generate_production_plan_number(UUID);

-- Create the function
CREATE OR REPLACE FUNCTION generate_production_plan_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
  v_plan_number TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Count production plans for this company in current year
  SELECT COUNT(*) INTO v_count
  FROM production_plans
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Generate padded number
  v_number := LPAD((v_count + 1)::TEXT, 4, '0');

  -- Combine into plan number: PP-2026-0001
  v_plan_number := 'PP-' || v_year || '-' || v_number;

  RETURN v_plan_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION generate_production_plan_number(UUID) TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Test the function (replace with actual company_id):
-- SELECT generate_production_plan_number('your-company-uuid');

-- Check if function exists:
SELECT
  proname AS function_name,
  'SUCCESS: Function created!' AS status
FROM pg_proc
WHERE proname = 'generate_production_plan_number';
