-- =====================================================
-- FIX: RPC Function - Use MAX instead of COUNT
-- =====================================================
-- Date: 2026-01-05
-- Problem: COUNT(*) doesn't account for gaps in numbering
--          from deleted plans or timestamp-based fallbacks
--
-- Solution: Extract MAX number from existing plan_numbers
--           and increment from there
-- =====================================================

DROP FUNCTION IF EXISTS generate_production_plan_number(UUID);

CREATE OR REPLACE FUNCTION generate_production_plan_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_max_num INTEGER;
  v_next_num INTEGER;
  v_plan_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Extract the highest number from existing plan_numbers for this year
  -- Pattern: PP-YYYY-NNNN (e.g., PP-2026-0123)
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(plan_number FROM 'PP-' || v_year || '-([0-9]+)')
        AS INTEGER
      )
    ),
    0
  ) INTO v_max_num
  FROM production_plans
  WHERE company_id = p_company_id
    AND plan_number LIKE 'PP-' || v_year || '-%';

  v_next_num := v_max_num + 1;
  v_plan_number := 'PP-' || v_year || '-' || LPAD(v_next_num::TEXT, 4, '0');

  RETURN v_plan_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_production_plan_number(UUID) TO authenticated;

-- Test the function
SELECT generate_production_plan_number('e58a8d1d-b0c5-45ac-8db1-22417a87ae8e') as next_plan_number;
