-- ============================================
-- WAREHOUSE DOCUMENTS SYSTEM
-- Dokumenty magazynowe: PW (Przyjęcie), RW (Rozchód), WZ (Wydanie)
-- ============================================

-- 1. ENUM dla typów dokumentów
CREATE TYPE document_type AS ENUM ('PW', 'RW', 'WZ');

-- 2. Tabela główna dokumentów magazynowych
CREATE TABLE warehouse_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  document_number TEXT NOT NULL, -- np. PW/001/2025
  contractor TEXT NOT NULL, -- nazwa kontrahenta
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')), -- draft = szkic, confirmed = zatwierdzony (wpływa na stany)
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique document number per company
  UNIQUE(company_id, document_number)
);

-- 3. Tabela pozycji dokumentu (wiele komponentów na dokumencie)
CREATE TABLE warehouse_document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES warehouse_documents(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indeksy dla wydajności
CREATE INDEX idx_warehouse_documents_company ON warehouse_documents(company_id);
CREATE INDEX idx_warehouse_documents_type ON warehouse_documents(document_type);
CREATE INDEX idx_warehouse_documents_status ON warehouse_documents(status);
CREATE INDEX idx_warehouse_documents_created_at ON warehouse_documents(created_at DESC);
CREATE INDEX idx_warehouse_document_items_document ON warehouse_document_items(document_id);
CREATE INDEX idx_warehouse_document_items_inventory ON warehouse_document_items(inventory_id);

-- 5. RLS (Row Level Security) - tylko dane z własnej firmy
ALTER TABLE warehouse_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_document_items ENABLE ROW LEVEL SECURITY;

-- Policy dla warehouse_documents
CREATE POLICY warehouse_documents_company_isolation ON warehouse_documents
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- Policy dla warehouse_document_items (przez document_id)
CREATE POLICY warehouse_document_items_isolation ON warehouse_document_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM warehouse_documents wd
      WHERE wd.id = warehouse_document_items.document_id
      AND wd.company_id = current_setting('app.current_company_id', true)::uuid
    )
  );

-- 6. Funkcja automatycznej aktualizacji stanów magazynowych
CREATE OR REPLACE FUNCTION update_inventory_on_document_confirm()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  -- Tylko gdy dokument zostaje potwierdzony (draft → confirmed)
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN

    -- Iteruj przez wszystkie pozycje dokumentu
    FOR item IN
      SELECT inventory_id, quantity
      FROM warehouse_document_items
      WHERE document_id = NEW.id
    LOOP
      -- PW (Przyjęcie Wewnętrzne) → dodaj do magazynu
      IF NEW.document_type = 'PW' THEN
        UPDATE inventory
        SET quantity = quantity + item.quantity,
            updated_at = NOW()
        WHERE id = item.inventory_id;

      -- RW (Rozchód Wewnętrzny) lub WZ (Wydanie Zewnętrzne) → odejmij z magazynu
      ELSIF NEW.document_type IN ('RW', 'WZ') THEN
        UPDATE inventory
        SET quantity = quantity - item.quantity,
            updated_at = NOW()
        WHERE id = item.inventory_id;

        -- Opcjonalnie: sprawdź czy stan nie jest ujemny
        IF (SELECT quantity FROM inventory WHERE id = item.inventory_id) < 0 THEN
          RAISE EXCEPTION 'Insufficient inventory for item %', item.inventory_id;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger uruchamiający aktualizację stanów
CREATE TRIGGER trigger_update_inventory_on_confirm
  AFTER INSERT OR UPDATE OF status ON warehouse_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_on_document_confirm();

-- 8. Funkcja do automatycznego generowania numeru dokumentu
CREATE OR REPLACE FUNCTION generate_document_number(
  p_company_id UUID,
  p_document_type document_type
)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_counter INTEGER;
  v_document_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW())::TEXT;

  -- Znajdź ostatni numer dla tego typu i roku
  SELECT COUNT(*) + 1 INTO v_counter
  FROM warehouse_documents
  WHERE company_id = p_company_id
    AND document_type = p_document_type
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Format: PW/001/2025
  v_document_number := p_document_type::TEXT || '/' || LPAD(v_counter::TEXT, 3, '0') || '/' || v_year;

  RETURN v_document_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- WAREHOUSE DOCUMENTS MIGRATION COMPLETE
-- ============================================
