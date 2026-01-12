-- ============================================
-- FIX WAREHOUSE DOCUMENTS RLS POLICIES
-- Problem: Old policies used current_setting() which doesn't work with Supabase
-- Solution: Use auth.uid() to match user's company_id
-- ============================================

-- Drop old problematic policies
DROP POLICY IF EXISTS warehouse_documents_company_isolation ON warehouse_documents;
DROP POLICY IF EXISTS warehouse_document_items_isolation ON warehouse_document_items;

-- Create new policies for warehouse_documents
CREATE POLICY warehouse_documents_select ON warehouse_documents
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY warehouse_documents_insert ON warehouse_documents
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY warehouse_documents_update ON warehouse_documents
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY warehouse_documents_delete ON warehouse_documents
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Create new policies for warehouse_document_items
CREATE POLICY warehouse_document_items_select ON warehouse_document_items
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM warehouse_documents WHERE company_id IN (
        SELECT company_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY warehouse_document_items_insert ON warehouse_document_items
  FOR INSERT WITH CHECK (
    document_id IN (
      SELECT id FROM warehouse_documents WHERE company_id IN (
        SELECT company_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY warehouse_document_items_update ON warehouse_document_items
  FOR UPDATE USING (
    document_id IN (
      SELECT id FROM warehouse_documents WHERE company_id IN (
        SELECT company_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY warehouse_document_items_delete ON warehouse_document_items
  FOR DELETE USING (
    document_id IN (
      SELECT id FROM warehouse_documents WHERE company_id IN (
        SELECT company_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- ============================================
-- ALSO FIX: Recreate trigger for inventory updates
-- ============================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_inventory_on_confirm ON warehouse_documents;
DROP FUNCTION IF EXISTS update_inventory_on_document_confirm();

-- Recreate function
CREATE OR REPLACE FUNCTION update_inventory_on_document_confirm()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  -- Only when document is confirmed (draft → confirmed)
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status = 'draft') THEN

    -- Iterate through all document items
    FOR item IN
      SELECT inventory_id, quantity
      FROM warehouse_document_items
      WHERE document_id = NEW.id
    LOOP
      -- PW (Przyjęcie Wewnętrzne) → add to inventory
      IF NEW.document_type = 'PW' THEN
        UPDATE inventory
        SET quantity = quantity + item.quantity,
            updated_at = NOW()
        WHERE id = item.inventory_id;

      -- RW (Rozchód) or WZ (Wydanie) → subtract from inventory
      ELSIF NEW.document_type IN ('RW', 'WZ') THEN
        UPDATE inventory
        SET quantity = quantity - item.quantity,
            updated_at = NOW()
        WHERE id = item.inventory_id;

        -- Check for negative stock
        IF (SELECT quantity FROM inventory WHERE id = item.inventory_id) < 0 THEN
          RAISE EXCEPTION 'Insufficient inventory for item %', item.inventory_id;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER trigger_update_inventory_on_confirm
  AFTER INSERT OR UPDATE OF status ON warehouse_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_on_document_confirm();

-- ============================================
-- DONE
-- ============================================
