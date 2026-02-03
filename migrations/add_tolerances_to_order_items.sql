-- =====================================================
-- MIGRATION: Add tolerance columns to order_items
-- =====================================================
-- FIX: UI (OrderItemCard.tsx) has tolerance inputs but
-- the database doesn't have these columns - data loss bug!
--
-- Created: 2026-02-03
-- =====================================================

-- Add tolerance columns with default 0.1mm (symmetric tolerances)
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS tolerance_length NUMERIC(6,3) DEFAULT 0.1,
  ADD COLUMN IF NOT EXISTS tolerance_width NUMERIC(6,3) DEFAULT 0.1,
  ADD COLUMN IF NOT EXISTS tolerance_height NUMERIC(6,3) DEFAULT 0.1;

-- Add comments for documentation
COMMENT ON COLUMN order_items.tolerance_length IS 'Tolerancja dlugosci +/- X mm (domyslnie 0.1)';
COMMENT ON COLUMN order_items.tolerance_width IS 'Tolerancja szerokosci +/- X mm (domyslnie 0.1)';
COMMENT ON COLUMN order_items.tolerance_height IS 'Tolerancja wysokosci +/- X mm (domyslnie 0.1)';

-- Verification query
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'order_items'
  AND column_name IN ('tolerance_length', 'tolerance_width', 'tolerance_height');
