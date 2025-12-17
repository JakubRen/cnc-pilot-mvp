-- =====================================================
-- AUTO DOCUMENT NUMBERING SYSTEM
-- =====================================================
-- This migration adds RPC functions for automatic
-- document number generation across the entire system.
--
-- Created: 2025-12-16
-- Purpose: Eliminate manual document numbering
-- =====================================================

-- =====================================================
-- 1. ORDERS - Automatyczne numerowanie zamówień
-- =====================================================

CREATE OR REPLACE FUNCTION generate_order_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
  v_order_number TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Count orders for this company in current year
  SELECT COUNT(*) INTO v_count
  FROM orders
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Generate padded number (0001, 0002, etc.)
  v_number := LPAD((v_count + 1)::TEXT, 4, '0');

  -- Combine into order number: ORD-2025-0001
  v_order_number := 'ORD-' || v_year || '-' || v_number;

  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION generate_order_number(UUID) TO authenticated;

-- =====================================================
-- 2. INVENTORY - Automatyczne numerowanie SKU
-- =====================================================
-- Format: SKU-2025-0001

CREATE OR REPLACE FUNCTION generate_inventory_sku(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
  v_sku TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Count inventory items for this company in current year
  SELECT COUNT(*) INTO v_count
  FROM inventory
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Generate padded number (0001, 0002, etc.)
  v_number := LPAD((v_count + 1)::TEXT, 4, '0');

  -- Combine into SKU: SKU-2025-0001
  v_sku := 'SKU-' || v_year || '-' || v_number;

  RETURN v_sku;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_inventory_sku(UUID) TO authenticated;

-- =====================================================
-- 3. QUALITY CONTROL - Automatyczne numerowanie raportów QC
-- =====================================================
-- Format: QC-2025-0001

CREATE OR REPLACE FUNCTION generate_qc_report_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
  v_qc_number TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Count QC reports for this company in current year
  SELECT COUNT(*) INTO v_count
  FROM quality_inspections
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Generate padded number
  v_number := LPAD((v_count + 1)::TEXT, 4, '0');

  -- Combine into QC number: QC-2025-0001
  v_qc_number := 'QC-' || v_year || '-' || v_number;

  RETURN v_qc_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_qc_report_number(UUID) TO authenticated;

-- =====================================================
-- 4. CUSTOMERS - Automatyczne numerowanie klientów
-- =====================================================
-- Format: CUS-2025-0001

CREATE OR REPLACE FUNCTION generate_customer_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
  v_customer_number TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Count customers for this company in current year
  SELECT COUNT(*) INTO v_count
  FROM customers
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Generate padded number
  v_number := LPAD((v_count + 1)::TEXT, 4, '0');

  -- Combine into customer number: CUS-2025-0001
  v_customer_number := 'CUS-' || v_year || '-' || v_number;

  RETURN v_customer_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_customer_number(UUID) TO authenticated;

-- =====================================================
-- 5. PRODUCTION PLANS - Automatyczne numerowanie planów produkcji
-- =====================================================
-- Format: PP-2025-0001

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

  -- Combine into plan number: PP-2025-0001
  v_plan_number := 'PP-' || v_year || '-' || v_number;

  RETURN v_plan_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_production_plan_number(UUID) TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Test order number generation:
-- SELECT generate_order_number('your-company-uuid');

-- Test inventory SKU generation:
-- SELECT generate_inventory_sku('your-company-uuid');

-- Test QC report number generation:
-- SELECT generate_qc_report_number('your-company-uuid');

-- Test customer number generation:
-- SELECT generate_customer_number('your-company-uuid');

-- Test production plan number generation:
-- SELECT generate_production_plan_number('your-company-uuid');

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. All functions use SECURITY DEFINER to bypass RLS
-- 2. Numbers reset yearly (format: PREFIX-YYYY-NNNN)
-- 3. Numbers are zero-padded to 4 digits
-- 4. Functions are idempotent (safe to run multiple times)
-- 5. Existing documents keep their manual numbers
-- 6. New documents will use auto-generated numbers
