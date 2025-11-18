-- ============================================
-- INVENTORY HISTORY TABLE & TRIGGER
-- DAY_18 - FAZA 3
-- Automatyczne logowanie zmian stanów magazynowych
-- ============================================

-- Tabela przechowująca historię zmian
CREATE TABLE IF NOT EXISTS inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Dokument źródłowy
  document_id UUID NOT NULL REFERENCES warehouse_documents(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('PW', 'RW', 'WZ')),
  document_number TEXT NOT NULL,

  -- Zmiana
  quantity_change NUMERIC NOT NULL,  -- np. +10, -5
  quantity_before NUMERIC NOT NULL,  -- stan przed
  quantity_after NUMERIC NOT NULL,   -- stan po

  -- Metadane
  changed_by BIGINT NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_inventory_history_inventory_id ON inventory_history(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_company_id ON inventory_history(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_document_id ON inventory_history(document_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_changed_at ON inventory_history(changed_at DESC);

-- Row Level Security
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's inventory history"
  ON inventory_history
  FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- ============================================
-- TRIGGER FUNCTION - Log inventory changes
-- ============================================

CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
DECLARE
  doc_item RECORD;
  inv_item RECORD;
BEGIN
  -- Tylko dla dokumentów zatwierdzonych (draft -> confirmed)
  IF NEW.status = 'confirmed' AND OLD.status = 'draft' THEN

    -- Dla każdego itemu w dokumencie
    FOR doc_item IN
      SELECT * FROM warehouse_document_items WHERE document_id = NEW.id
    LOOP
      -- Pobierz aktualny stan magazynu (przed zmianą)
      SELECT * INTO inv_item FROM inventory WHERE id = doc_item.inventory_id;

      IF FOUND THEN
        -- Oblicz zmianę w zależności od typu dokumentu
        DECLARE
          quantity_change NUMERIC;
          quantity_after NUMERIC;
        BEGIN
          IF NEW.document_type = 'PW' THEN
            -- Przyjęcie - dodajemy
            quantity_change := doc_item.quantity;
            quantity_after := inv_item.quantity + doc_item.quantity;
          ELSIF NEW.document_type IN ('RW', 'WZ') THEN
            -- Rozchód/Wydanie - odejmujemy
            quantity_change := -doc_item.quantity;
            quantity_after := inv_item.quantity - doc_item.quantity;
          END IF;

          -- Loguj zmianę
          INSERT INTO inventory_history (
            inventory_id,
            company_id,
            document_id,
            document_type,
            document_number,
            quantity_change,
            quantity_before,
            quantity_after,
            changed_by,
            changed_at,
            notes
          ) VALUES (
            doc_item.inventory_id,
            NEW.company_id,
            NEW.id,
            NEW.document_type,
            NEW.document_number,
            quantity_change,
            inv_item.quantity,
            quantity_after,
            NEW.created_by,
            NOW(),
            doc_item.notes
          );
        END;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Przypnij trigger do warehouse_documents
DROP TRIGGER IF EXISTS trigger_log_inventory_change ON warehouse_documents;
CREATE TRIGGER trigger_log_inventory_change
  AFTER UPDATE ON warehouse_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_inventory_change();

-- ============================================
-- INFORMACJE
-- ============================================

-- Trigger działa AFTER UPDATE na warehouse_documents
-- Sprawdza czy status zmienił się z 'draft' na 'confirmed'
-- Dla każdego itemu w dokumencie:
--   1. Pobiera aktualny stan magazynu (przed zmianą)
--   2. Oblicza zmianę (+/-)
--   3. Oblicza stan po zmianie
--   4. Loguje do inventory_history

-- Trigger wykonuje się PRZED triggerem który aktualizuje inventory,
-- dzięki czemu możemy zapisać "before" wartość.

COMMENT ON TABLE inventory_history IS 'Historia zmian stanów magazynowych - automatycznie logowana przy zatwierdzaniu dokumentów';
