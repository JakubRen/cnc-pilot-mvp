-- ============================================
-- MINI-CMMS - Zarządzanie Maszynami CNC-Pilot
-- Przeglądy, konserwacje, awarie
-- ============================================

-- 1. Tabela maszyn
CREATE TABLE IF NOT EXISTS machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Identyfikacja
  name TEXT NOT NULL, -- np. "Tokarka CNC Mazak"
  code TEXT, -- Wewnętrzny kod np. "CNC-01"
  serial_number TEXT, -- Numer seryjny producenta
  manufacturer TEXT, -- Producent
  model TEXT, -- Model

  -- Lokalizacja
  location TEXT, -- np. "Hala A, Stanowisko 3"

  -- Daty
  purchase_date DATE,
  warranty_until DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,

  -- Interwał przeglądów (dni)
  maintenance_interval_days INTEGER DEFAULT 90,

  -- Status: active, inactive, maintenance, broken
  status TEXT DEFAULT 'active',

  -- Szczegóły
  notes TEXT,
  specifications JSONB, -- Specyfikacje techniczne (opcjonalne)

  -- Audyt
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela logów konserwacji/napraw
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,

  -- Typ: scheduled (planowy), unscheduled (nieplanowy), repair (naprawa), inspection (inspekcja)
  type TEXT NOT NULL DEFAULT 'scheduled',

  -- Status: planned, in_progress, completed, cancelled
  status TEXT NOT NULL DEFAULT 'planned',

  -- Opis
  title TEXT NOT NULL, -- np. "Wymiana oleju", "Kalibracja osi X"
  description TEXT,

  -- Daty
  scheduled_date DATE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Koszty
  labor_hours NUMERIC(5,2),
  parts_cost NUMERIC(10,2),
  labor_cost NUMERIC(10,2),
  total_cost NUMERIC(10,2),

  -- Wykonawca
  performed_by INTEGER REFERENCES users(id),
  external_technician TEXT, -- Jeśli zewnętrzny serwis

  -- Załączniki / notatki
  notes TEXT,

  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela części zamiennych/materiałów użytych
CREATE TABLE IF NOT EXISTS maintenance_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_log_id UUID NOT NULL REFERENCES maintenance_logs(id) ON DELETE CASCADE,

  part_name TEXT NOT NULL,
  part_number TEXT,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_cost NUMERIC(10,2),
  total_cost NUMERIC(10,2),

  -- Opcjonalne powiązanie z magazynem
  inventory_id UUID REFERENCES inventory(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_machines_company ON machines(company_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS idx_machines_next_maint ON machines(next_maintenance_date);
CREATE INDEX IF NOT EXISTS idx_maint_logs_company ON maintenance_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_maint_logs_machine ON maintenance_logs(machine_id);
CREATE INDEX IF NOT EXISTS idx_maint_logs_status ON maintenance_logs(status);
CREATE INDEX IF NOT EXISTS idx_maint_logs_scheduled ON maintenance_logs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maint_parts_log ON maintenance_parts(maintenance_log_id);

-- RLS
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_parts ENABLE ROW LEVEL SECURITY;

-- Machines policies
CREATE POLICY "Users can view machines from their company"
  ON machines FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert machines for their company"
  ON machines FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update machines from their company"
  ON machines FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete machines from their company"
  ON machines FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Maintenance logs policies
CREATE POLICY "Users can view maintenance_logs from their company"
  ON maintenance_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert maintenance_logs for their company"
  ON maintenance_logs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update maintenance_logs from their company"
  ON maintenance_logs FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete maintenance_logs from their company"
  ON maintenance_logs FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Maintenance parts policies (via parent)
CREATE POLICY "Users can view maintenance_parts from their company"
  ON maintenance_parts FOR SELECT
  USING (maintenance_log_id IN (
    SELECT id FROM maintenance_logs WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert maintenance_parts for their company"
  ON maintenance_parts FOR INSERT
  WITH CHECK (maintenance_log_id IN (
    SELECT id FROM maintenance_logs WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update maintenance_parts from their company"
  ON maintenance_parts FOR UPDATE
  USING (maintenance_log_id IN (
    SELECT id FROM maintenance_logs WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete maintenance_parts from their company"
  ON maintenance_parts FOR DELETE
  USING (maintenance_log_id IN (
    SELECT id FROM maintenance_logs WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

-- Trigger dla updated_at
CREATE TRIGGER update_machines_timestamp
  BEFORE UPDATE ON machines
  FOR EACH ROW
  EXECUTE FUNCTION update_external_ops_timestamp();

CREATE TRIGGER update_maintenance_logs_timestamp
  BEFORE UPDATE ON maintenance_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_external_ops_timestamp();

-- Funkcja do aktualizacji daty następnego przeglądu
CREATE OR REPLACE FUNCTION update_next_maintenance()
RETURNS TRIGGER AS $$
BEGIN
  -- Gdy konserwacja jest ukończona, zaktualizuj datę następnego przeglądu
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE machines
    SET
      last_maintenance_date = CURRENT_DATE,
      next_maintenance_date = CURRENT_DATE + (maintenance_interval_days || ' days')::INTERVAL,
      status = CASE WHEN status = 'maintenance' THEN 'active' ELSE status END
    WHERE id = NEW.machine_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_next_maintenance
  AFTER UPDATE ON maintenance_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_next_maintenance();

-- Widok dla maszyn wymagających przeglądu
CREATE OR REPLACE VIEW machines_needing_maintenance AS
SELECT
  m.*,
  (m.next_maintenance_date - CURRENT_DATE) as days_until_maintenance,
  CASE
    WHEN m.next_maintenance_date < CURRENT_DATE THEN 'overdue'
    WHEN m.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'upcoming'
    ELSE 'ok'
  END as maintenance_urgency
FROM machines m
WHERE m.status = 'active'
  AND m.next_maintenance_date IS NOT NULL
ORDER BY m.next_maintenance_date ASC;

-- Komentarz dla typów
COMMENT ON TABLE machines IS 'Maszyny CNC i urządzenia produkcyjne.
Statusy:
- active: Aktywna, w użyciu
- inactive: Nieaktywna (np. wyłączona)
- maintenance: W trakcie konserwacji
- broken: Uszkodzona / awaria';

COMMENT ON TABLE maintenance_logs IS 'Historia przeglądów i napraw.
Typy:
- scheduled: Planowy przegląd
- unscheduled: Nieplanowa konserwacja
- repair: Naprawa po awarii
- inspection: Inspekcja / kontrola';
