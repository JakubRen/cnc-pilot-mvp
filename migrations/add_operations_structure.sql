-- ============================================
-- Migration: Struktura operacyjna dla zleceń CNC
-- Data: 2025-01-14
-- Autor: CNC Pilot MVP
-- Cel: Zamiana płaskiej struktury na operacyjną z Setup/Run time
-- ============================================

-- =============================================
-- TABELA: order_items
-- Pozycje zlecenia (jedno zlecenie może mieć wiele pozycji)
-- =============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Produkt
  part_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),

  -- Rysunek techniczny (opcjonalny na poziomie pozycji)
  drawing_file_id UUID REFERENCES files(id),

  -- Wymiary (opcjonalne)
  length NUMERIC(10,2),
  width NUMERIC(10,2),
  height NUMERIC(10,2),

  -- Materiał
  material TEXT,

  -- Złożoność (dla automatycznej wyceny)
  complexity TEXT CHECK (complexity IN ('simple', 'medium', 'complex')),

  -- Notatki
  notes TEXT,

  -- Podsumowanie kosztów (suma z operations)
  total_setup_time_minutes INTEGER DEFAULT 0,
  total_run_time_minutes NUMERIC(10,2) DEFAULT 0,
  total_cost NUMERIC(10,2) DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indeksy dla order_items
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_drawing ON order_items(drawing_file_id);

-- Komentarze
COMMENT ON TABLE order_items IS 'Pozycje zlecenia - jedno zlecenie może zawierać wiele różnych detali';
COMMENT ON COLUMN order_items.total_setup_time_minutes IS 'Suma czasów przygotowawczych wszystkich operacji (w minutach)';
COMMENT ON COLUMN order_items.total_run_time_minutes IS 'Suma czasów roboczych wszystkich operacji (w minutach)';

-- =============================================
-- TABELA: operations
-- Operacje technologiczne dla każdej pozycji
-- =============================================
CREATE TABLE operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,

  -- Kolejność wykonania
  operation_number INTEGER NOT NULL,

  -- Typ operacji
  operation_type TEXT NOT NULL,
  -- Możliwe wartości: 'milling', 'turning', 'drilling', 'grinding', 'cutting', 'deburring', 'quality_control', 'other'

  -- Nazwa/opis operacji
  operation_name TEXT NOT NULL,
  description TEXT,

  -- Przydział maszyny (opcjonalny - może być wybierany później)
  machine_id UUID REFERENCES machines(id),

  -- KLUCZOWE: Setup Time vs Run Time
  setup_time_minutes INTEGER NOT NULL DEFAULT 0 CHECK (setup_time_minutes >= 0),
  run_time_per_unit_minutes NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (run_time_per_unit_minutes >= 0),

  -- Stawka godzinowa dla tej operacji (może różnić się od maszyny)
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Koszty obliczone automatycznie
  total_setup_cost NUMERIC(10,2) GENERATED ALWAYS AS (
    (setup_time_minutes / 60.0) * hourly_rate
  ) STORED,

  total_run_cost NUMERIC(10,2), -- będzie obliczane przez trigger (zależy od quantity z order_item)

  total_operation_cost NUMERIC(10,2) DEFAULT 0,

  -- Status operacji
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'quality_check', 'failed')),

  -- Operator przypisany do operacji
  assigned_operator_id BIGINT REFERENCES users(id),

  -- Tracking czasu
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indeksy dla operations
CREATE INDEX idx_operations_order_item ON operations(order_item_id);
CREATE INDEX idx_operations_machine ON operations(machine_id);
CREATE INDEX idx_operations_status ON operations(status);
CREATE INDEX idx_operations_operator ON operations(assigned_operator_id);

-- Unique constraint: operation_number musi być unikalny w ramach order_item
CREATE UNIQUE INDEX idx_operations_order_item_number ON operations(order_item_id, operation_number);

-- Komentarze
COMMENT ON TABLE operations IS 'Operacje technologiczne - routing produkcyjny dla każdej pozycji zlecenia';
COMMENT ON COLUMN operations.setup_time_minutes IS 'Czas przygotowawczy maszyny (Setup Time) - jednorazowy, niezależny od ilości';
COMMENT ON COLUMN operations.run_time_per_unit_minutes IS 'Czas obróbki jednej sztuki (Run Time) - mnożony przez quantity';
COMMENT ON COLUMN operations.total_setup_cost IS 'Koszt przygotowania = (setup_time / 60) * hourly_rate';
COMMENT ON COLUMN operations.total_run_cost IS 'Koszt obróbki = (run_time_per_unit * quantity / 60) * hourly_rate';

-- =============================================
-- TRIGGER: Automatyczna aktualizacja kosztów operacji
-- =============================================
CREATE OR REPLACE FUNCTION update_operation_costs()
RETURNS TRIGGER AS $$
DECLARE
  v_quantity INTEGER;
BEGIN
  -- Pobierz ilość z order_item
  SELECT quantity INTO v_quantity
  FROM order_items
  WHERE id = NEW.order_item_id;

  -- Oblicz total_run_cost
  NEW.total_run_cost := (NEW.run_time_per_unit_minutes * v_quantity / 60.0) * NEW.hourly_rate;

  -- Oblicz total_operation_cost (setup + run)
  NEW.total_operation_cost := NEW.total_setup_cost + NEW.total_run_cost;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_operation_costs
BEFORE INSERT OR UPDATE ON operations
FOR EACH ROW
EXECUTE FUNCTION update_operation_costs();

-- =============================================
-- TRIGGER: Aktualizacja sum w order_items
-- =============================================
CREATE OR REPLACE FUNCTION update_order_item_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Zaktualizuj sumy w order_item po dodaniu/edycji/usunięciu operacji
  UPDATE order_items
  SET
    total_setup_time_minutes = (
      SELECT COALESCE(SUM(setup_time_minutes), 0)
      FROM operations
      WHERE order_item_id = COALESCE(NEW.order_item_id, OLD.order_item_id)
    ),
    total_run_time_minutes = (
      SELECT COALESCE(SUM(run_time_per_unit_minutes * (SELECT quantity FROM order_items WHERE id = COALESCE(NEW.order_item_id, OLD.order_item_id))), 0)
      FROM operations
      WHERE order_item_id = COALESCE(NEW.order_item_id, OLD.order_item_id)
    ),
    total_cost = (
      SELECT COALESCE(SUM(total_operation_cost), 0)
      FROM operations
      WHERE order_item_id = COALESCE(NEW.order_item_id, OLD.order_item_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.order_item_id, OLD.order_item_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_item_totals_on_operation
AFTER INSERT OR UPDATE OR DELETE ON operations
FOR EACH ROW
EXECUTE FUNCTION update_order_item_totals();

-- =============================================
-- TRIGGER: Aktualizacja sumy w orders
-- =============================================
CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Zaktualizuj całkowity koszt zlecenia
  UPDATE orders
  SET
    total_cost = (
      SELECT COALESCE(SUM(total_cost), 0)
      FROM order_items
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_totals_on_item
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_totals();

-- =============================================
-- FUNKCJA RPC: Oblicz rekomendowane czasy na podstawie złożoności
-- =============================================
CREATE OR REPLACE FUNCTION estimate_operation_times(
  p_operation_type TEXT,
  p_complexity TEXT,
  p_material TEXT DEFAULT 'steel'
)
RETURNS TABLE(
  setup_time_minutes INTEGER,
  run_time_per_unit_minutes NUMERIC
) AS $$
BEGIN
  -- Bazowe czasy dla różnych operacji
  -- To są PRZYKŁADOWE wartości - powinny być dostosowane do rzeczywistych danych

  RETURN QUERY
  SELECT
    CASE
      -- MILLING (Frezowanie)
      WHEN p_operation_type = 'milling' THEN
        CASE p_complexity
          WHEN 'simple' THEN 15    -- 15 min setup
          WHEN 'medium' THEN 30    -- 30 min setup
          WHEN 'complex' THEN 60   -- 60 min setup
          ELSE 30
        END

      -- TURNING (Toczenie)
      WHEN p_operation_type = 'turning' THEN
        CASE p_complexity
          WHEN 'simple' THEN 10
          WHEN 'medium' THEN 20
          WHEN 'complex' THEN 45
          ELSE 20
        END

      -- DRILLING (Wiercenie)
      WHEN p_operation_type = 'drilling' THEN
        CASE p_complexity
          WHEN 'simple' THEN 5
          WHEN 'medium' THEN 10
          WHEN 'complex' THEN 20
          ELSE 10
        END

      -- GRINDING (Szlifowanie)
      WHEN p_operation_type = 'grinding' THEN
        CASE p_complexity
          WHEN 'simple' THEN 20
          WHEN 'medium' THEN 35
          WHEN 'complex' THEN 50
          ELSE 35
        END

      -- CUTTING (Cięcie)
      WHEN p_operation_type = 'cutting' THEN
        CASE p_complexity
          WHEN 'simple' THEN 5
          WHEN 'medium' THEN 10
          WHEN 'complex' THEN 15
          ELSE 10
        END

      -- Domyślnie
      ELSE 15
    END AS setup_time_minutes,

    CASE
      -- MILLING (Frezowanie)
      WHEN p_operation_type = 'milling' THEN
        CASE p_complexity
          WHEN 'simple' THEN 3.0::NUMERIC    -- 3 min/szt
          WHEN 'medium' THEN 8.0::NUMERIC    -- 8 min/szt
          WHEN 'complex' THEN 20.0::NUMERIC  -- 20 min/szt
          ELSE 8.0::NUMERIC
        END

      -- TURNING (Toczenie)
      WHEN p_operation_type = 'turning' THEN
        CASE p_complexity
          WHEN 'simple' THEN 2.0::NUMERIC
          WHEN 'medium' THEN 6.0::NUMERIC
          WHEN 'complex' THEN 15.0::NUMERIC
          ELSE 6.0::NUMERIC
        END

      -- DRILLING (Wiercenie)
      WHEN p_operation_type = 'drilling' THEN
        CASE p_complexity
          WHEN 'simple' THEN 1.0::NUMERIC
          WHEN 'medium' THEN 2.5::NUMERIC
          WHEN 'complex' THEN 5.0::NUMERIC
          ELSE 2.5::NUMERIC
        END

      -- GRINDING (Szlifowanie)
      WHEN p_operation_type = 'grinding' THEN
        CASE p_complexity
          WHEN 'simple' THEN 5.0::NUMERIC
          WHEN 'medium' THEN 12.0::NUMERIC
          WHEN 'complex' THEN 25.0::NUMERIC
          ELSE 12.0::NUMERIC
        END

      -- CUTTING (Cięcie)
      WHEN p_operation_type = 'cutting' THEN
        CASE p_complexity
          WHEN 'simple' THEN 0.5::NUMERIC
          WHEN 'medium' THEN 1.5::NUMERIC
          WHEN 'complex' THEN 3.0::NUMERIC
          ELSE 1.5::NUMERIC
        END

      -- Domyślnie
      ELSE 5.0::NUMERIC
    END AS run_time_per_unit_minutes;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION estimate_operation_times IS 'Szacuje Setup Time i Run Time na podstawie typu operacji i złożoności';

-- =============================================
-- VIEW: Podsumowanie operacji dla łatwego raportowania
-- =============================================
CREATE OR REPLACE VIEW operations_summary AS
SELECT
  o.id,
  o.order_item_id,
  oi.order_id,
  ord.order_number,
  oi.part_name,
  oi.quantity,
  o.operation_number,
  o.operation_type,
  o.operation_name,
  m.name AS machine_name,
  u.full_name AS operator_name,

  -- Czasy
  o.setup_time_minutes,
  o.run_time_per_unit_minutes,
  (o.run_time_per_unit_minutes * oi.quantity) AS total_run_time_minutes,
  (o.setup_time_minutes + (o.run_time_per_unit_minutes * oi.quantity)) AS total_time_minutes,

  -- Koszty
  o.hourly_rate,
  o.total_setup_cost,
  o.total_run_cost,
  o.total_operation_cost,

  -- Status
  o.status,
  o.started_at,
  o.completed_at,

  -- Czas realizacji (jeśli ukończone)
  EXTRACT(EPOCH FROM (o.completed_at - o.started_at)) / 60 AS actual_duration_minutes

FROM operations o
JOIN order_items oi ON o.order_item_id = oi.id
JOIN orders ord ON oi.order_id = ord.id
LEFT JOIN machines m ON o.machine_id = m.id
LEFT JOIN users u ON o.assigned_operator_id = u.id;

COMMENT ON VIEW operations_summary IS 'Podsumowanie operacji z obliczonymi czasami i kosztami';

-- =============================================
-- RLS Policies
-- =============================================

-- order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view order items from their company"
ON order_items FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert order items for their company orders"
ON order_items FOR INSERT
WITH CHECK (
  order_id IN (
    SELECT id FROM orders WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update order items from their company"
ON order_items FOR UPDATE
USING (
  order_id IN (
    SELECT id FROM orders WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete order items from their company"
ON order_items FOR DELETE
USING (
  order_id IN (
    SELECT id FROM orders WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

-- operations
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view operations from their company"
ON operations FOR SELECT
USING (
  order_item_id IN (
    SELECT oi.id FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert operations for their company"
ON operations FOR INSERT
WITH CHECK (
  order_item_id IN (
    SELECT oi.id FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update operations from their company"
ON operations FOR UPDATE
USING (
  order_item_id IN (
    SELECT oi.id FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete operations from their company"
ON operations FOR DELETE
USING (
  order_item_id IN (
    SELECT oi.id FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

-- =============================================
-- Przykładowe dane testowe (opcjonalne)
-- =============================================
-- Można odkomentować aby dodać przykładowe dane

/*
-- Przykład: Zlecenie z dwoma pozycjami i operacjami
DO $$
DECLARE
  v_order_id UUID;
  v_item1_id UUID;
  v_item2_id UUID;
  v_company_id UUID;
BEGIN
  -- Załóżmy że mamy order_id (podstaw prawdziwy)
  -- v_order_id := 'your-order-uuid-here';

  -- Pozycja 1: Flansza
  INSERT INTO order_items (order_id, part_name, quantity, material, complexity)
  VALUES (v_order_id, 'Flansza Ø100', 50, 'Stal nierdzewna', 'medium')
  RETURNING id INTO v_item1_id;

  -- Operacje dla Flanszy
  INSERT INTO operations (order_item_id, operation_number, operation_type, operation_name, setup_time_minutes, run_time_per_unit_minutes, hourly_rate)
  VALUES
    (v_item1_id, 1, 'turning', 'Toczenie zgrubne', 20, 6.0, 180),
    (v_item1_id, 2, 'turning', 'Toczenie wykończeniowe', 10, 4.0, 180),
    (v_item1_id, 3, 'drilling', 'Wiercenie otworów montażowych', 5, 2.0, 150);

  -- Pozycja 2: Wałek
  INSERT INTO order_items (order_id, part_name, quantity, material, complexity)
  VALUES (v_order_id, 'Wałek Ø50x300', 100, 'Stal C45', 'simple')
  RETURNING id INTO v_item2_id;

  -- Operacje dla Wałka
  INSERT INTO operations (order_item_id, operation_number, operation_type, operation_name, setup_time_minutes, run_time_per_unit_minutes, hourly_rate)
  VALUES
    (v_item2_id, 1, 'turning', 'Toczenie wałka', 15, 3.0, 180),
    (v_item2_id, 2, 'grinding', 'Szlifowanie powierzchni', 25, 5.0, 220);
END $$;
*/

-- =============================================
-- Koniec migracji
-- =============================================
