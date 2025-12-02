-- =====================================================
-- QUALITY CONTROL MODULE
-- =====================================================
-- Karty pomiarowe, wymiary, tolerancje, raporty

-- =====================================================
-- Table: quality_control_plans
-- Definicje planów kontroli dla części
-- =====================================================
CREATE TABLE IF NOT EXISTS quality_control_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  part_name TEXT,
  description TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- Table: quality_control_items
-- Poszczególne wymiary/cechy do kontroli w planie
-- =====================================================
CREATE TABLE IF NOT EXISTS quality_control_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES quality_control_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  nominal_value NUMERIC NOT NULL,
  tolerance_plus NUMERIC NOT NULL DEFAULT 0,
  tolerance_minus NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'mm',
  measurement_type TEXT DEFAULT 'dimension',
  sort_order INTEGER DEFAULT 0,
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: quality_measurements
-- Rzeczywiste pomiary wykonane przez operatorów
-- =====================================================
CREATE TABLE IF NOT EXISTS quality_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES quality_control_plans(id) ON DELETE SET NULL,
  item_id UUID NOT NULL REFERENCES quality_control_items(id) ON DELETE CASCADE,
  measured_value NUMERIC NOT NULL,
  is_pass BOOLEAN NOT NULL,
  measured_by BIGINT NOT NULL REFERENCES users(id),
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  batch_number TEXT,
  sample_number INTEGER DEFAULT 1
);

-- =====================================================
-- Table: quality_reports
-- Raporty zbiorcze (karty pomiarowe)
-- =====================================================
CREATE TABLE IF NOT EXISTS quality_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES quality_control_plans(id) ON DELETE SET NULL,
  report_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  total_measurements INTEGER DEFAULT 0,
  passed_measurements INTEGER DEFAULT 0,
  failed_measurements INTEGER DEFAULT 0,
  overall_result TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_qc_plans_company ON quality_control_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_qc_items_plan ON quality_control_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_qc_measurements_order ON quality_measurements(order_id);
CREATE INDEX IF NOT EXISTS idx_qc_measurements_company ON quality_measurements(company_id);
CREATE INDEX IF NOT EXISTS idx_qc_reports_order ON quality_reports(order_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE quality_control_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_control_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_reports ENABLE ROW LEVEL SECURITY;

-- Plans policies
CREATE POLICY "Users can view own company QC plans"
  ON quality_control_plans FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can create QC plans for own company"
  ON quality_control_plans FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update own company QC plans"
  ON quality_control_plans FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete own company QC plans"
  ON quality_control_plans FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Items policies (through plan relationship)
CREATE POLICY "Users can view QC items"
  ON quality_control_items FOR SELECT
  USING (plan_id IN (
    SELECT id FROM quality_control_plans
    WHERE company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  ));

CREATE POLICY "Users can manage QC items"
  ON quality_control_items FOR ALL
  USING (plan_id IN (
    SELECT id FROM quality_control_plans
    WHERE company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  ));

-- Measurements policies
CREATE POLICY "Users can view own company measurements"
  ON quality_measurements FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can create measurements for own company"
  ON quality_measurements FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update own company measurements"
  ON quality_measurements FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Reports policies
CREATE POLICY "Users can view own company reports"
  ON quality_reports FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can manage own company reports"
  ON quality_reports FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE quality_control_plans IS 'Plany kontroli jakości - definicje wymiarów do sprawdzenia';
COMMENT ON TABLE quality_control_items IS 'Poszczególne wymiary/cechy w planie kontroli';
COMMENT ON TABLE quality_measurements IS 'Rzeczywiste pomiary wykonane przez operatorów';
COMMENT ON TABLE quality_reports IS 'Raporty zbiorcze - karty pomiarowe';
COMMENT ON COLUMN quality_control_items.is_critical IS 'Czy wymiar jest krytyczny (wymaga 100% kontroli)';
COMMENT ON COLUMN quality_measurements.is_pass IS 'Czy pomiar mieści się w tolerancji';
