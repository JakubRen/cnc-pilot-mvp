-- ============================================
-- EXTERNAL OPERATIONS (Kooperacja) - CNC-Pilot
-- Manager procesów zewnętrznych (hartowanie, anodowanie, cynkowanie)
-- ============================================

-- 1. Tabela kooperantów (zewnętrznych dostawców usług)
CREATE TABLE IF NOT EXISTS cooperants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL, -- hartowanie, anodowanie, cynkowanie, malowanie, etc.
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  avg_lead_days INTEGER DEFAULT 7, -- średni czas realizacji w dniach
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela operacji zewnętrznych (wysyłki do kooperantów)
CREATE TABLE IF NOT EXISTS external_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cooperant_id UUID REFERENCES cooperants(id) ON DELETE SET NULL,

  -- Dane operacji
  operation_number TEXT NOT NULL, -- np. EXT-2024-001
  operation_type TEXT NOT NULL, -- hartowanie, anodowanie, cynkowanie, etc.

  -- Status: pending (przygotowane), sent (wysłane), in_progress (u kooperanta),
  --         returning (w drodze powrotnej), completed (zakończone), delayed (opóźnione)
  status TEXT NOT NULL DEFAULT 'pending',

  -- Daty
  sent_date TIMESTAMP WITH TIME ZONE, -- data wysyłki
  expected_return_date DATE, -- planowany powrót
  actual_return_date TIMESTAMP WITH TIME ZONE, -- rzeczywisty powrót

  -- Szczegóły
  notes TEXT,
  transport_info TEXT, -- np. numer przesyłki, kurier

  -- Kto wysłał/odebrał
  sent_by INTEGER REFERENCES users(id),
  received_by INTEGER REFERENCES users(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Pozycje operacji (które zamówienia/części zostały wysłane)
CREATE TABLE IF NOT EXISTS external_operation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_operation_id UUID NOT NULL REFERENCES external_operations(id) ON DELETE CASCADE,

  -- Powiązanie z zamówieniem (opcjonalne - może być też osobna część)
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Dane części
  part_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'szt',

  -- Status pozycji
  status TEXT DEFAULT 'sent', -- sent, returned, lost

  -- Notatki specyficzne dla pozycji
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Dodanie nowego statusu do zamówień
-- (status 'external_processing' będzie używany gdy zamówienie jest u kooperanta)

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_cooperants_company ON cooperants(company_id);
CREATE INDEX IF NOT EXISTS idx_cooperants_service ON cooperants(service_type);
CREATE INDEX IF NOT EXISTS idx_external_ops_company ON external_operations(company_id);
CREATE INDEX IF NOT EXISTS idx_external_ops_status ON external_operations(status);
CREATE INDEX IF NOT EXISTS idx_external_ops_cooperant ON external_operations(cooperant_id);
CREATE INDEX IF NOT EXISTS idx_external_ops_return ON external_operations(expected_return_date);
CREATE INDEX IF NOT EXISTS idx_external_op_items_op ON external_operation_items(external_operation_id);
CREATE INDEX IF NOT EXISTS idx_external_op_items_order ON external_operation_items(order_id);

-- RLS Policies
ALTER TABLE cooperants ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_operation_items ENABLE ROW LEVEL SECURITY;

-- Cooperants policies
CREATE POLICY "Users can view cooperants from their company"
  ON cooperants FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can insert cooperants for their company"
  ON cooperants FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can update cooperants from their company"
  ON cooperants FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can delete cooperants from their company"
  ON cooperants FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

-- External operations policies
CREATE POLICY "Users can view external_operations from their company"
  ON external_operations FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can insert external_operations for their company"
  ON external_operations FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can update external_operations from their company"
  ON external_operations FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can delete external_operations from their company"
  ON external_operations FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

-- External operation items policies (based on parent operation)
CREATE POLICY "Users can view external_operation_items from their company"
  ON external_operation_items FOR SELECT
  USING (external_operation_id IN (
    SELECT id FROM external_operations WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert external_operation_items for their company"
  ON external_operation_items FOR INSERT
  WITH CHECK (external_operation_id IN (
    SELECT id FROM external_operations WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update external_operation_items from their company"
  ON external_operation_items FOR UPDATE
  USING (external_operation_id IN (
    SELECT id FROM external_operations WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete external_operation_items from their company"
  ON external_operation_items FOR DELETE
  USING (external_operation_id IN (
    SELECT id FROM external_operations WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

-- Trigger dla updated_at
CREATE OR REPLACE FUNCTION update_external_ops_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cooperants_timestamp
  BEFORE UPDATE ON cooperants
  FOR EACH ROW
  EXECUTE FUNCTION update_external_ops_timestamp();

CREATE TRIGGER update_external_operations_timestamp
  BEFORE UPDATE ON external_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_external_ops_timestamp();

-- Funkcja do generowania numeru operacji
CREATE OR REPLACE FUNCTION generate_operation_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) + 1 INTO v_count
  FROM external_operations
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  RETURN 'EXT-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Widok dla alertów o opóźnionych powrotach
CREATE OR REPLACE VIEW overdue_external_operations AS
SELECT
  eo.*,
  c.name as cooperant_name,
  c.phone as cooperant_phone,
  c.email as cooperant_email,
  (eo.expected_return_date - CURRENT_DATE) as days_overdue
FROM external_operations eo
LEFT JOIN cooperants c ON eo.cooperant_id = c.id
WHERE eo.status IN ('sent', 'in_progress')
  AND eo.expected_return_date < CURRENT_DATE
  AND eo.actual_return_date IS NULL;

-- Przykładowe typy usług kooperacyjnych (reference)
COMMENT ON TABLE cooperants IS 'Zewnętrzni dostawcy usług obróbki:
- hartowanie (heat treatment)
- anodowanie (anodizing)
- cynkowanie (galvanizing)
- malowanie proszkowe (powder coating)
- szlifowanie (grinding)
- chromowanie (chrome plating)
- niklowanie (nickel plating)
- trawienie (etching)
- piaskowanie (sandblasting)';
