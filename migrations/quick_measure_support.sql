-- =====================================================
-- MIGRATION: Quick Measure Support
-- =====================================================
-- Dodaje wsparcie dla "szybkich pomiarów" bez planu QC
-- Nowe kolumny pozwalają zapisywać pomiary bezpośrednio
-- z wymiarów order_items
--
-- Created: 2026-02-03
-- =====================================================

-- 1. Zrób item_id NULLABLE (quick measure nie ma quality_control_items)
ALTER TABLE quality_measurements
  ALTER COLUMN item_id DROP NOT NULL;

-- 2. Dodaj kolumny dla quick measure
ALTER TABLE quality_measurements
  ADD COLUMN IF NOT EXISTS order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dimension_type TEXT,
  ADD COLUMN IF NOT EXISTS nominal_value NUMERIC,
  ADD COLUMN IF NOT EXISTS tolerance_value NUMERIC;

-- 3. Dodaj constraint: albo item_id (plan-based) albo order_item_id (quick measure)
-- (nie dodajemy CHECK constraint żeby zachować kompatybilność wsteczną)

-- 4. Indeksy
CREATE INDEX IF NOT EXISTS idx_qm_order_item ON quality_measurements(order_item_id);
CREATE INDEX IF NOT EXISTS idx_qm_dimension_type ON quality_measurements(dimension_type);

-- 5. Komentarze
COMMENT ON COLUMN quality_measurements.order_item_id IS 'Pozycja zamowienia (dla quick measure)';
COMMENT ON COLUMN quality_measurements.dimension_type IS 'Typ wymiaru: length/width/height (dla quick measure)';
COMMENT ON COLUMN quality_measurements.nominal_value IS 'Wartosc nominalna z order_item (dla quick measure)';
COMMENT ON COLUMN quality_measurements.tolerance_value IS 'Tolerancja symetryczna +/- (dla quick measure)';

-- 6. Verification
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'quality_measurements'
  AND column_name IN ('item_id', 'order_item_id', 'dimension_type', 'nominal_value', 'tolerance_value')
ORDER BY column_name;
