-- =====================================================
-- SYNC_ABC_TO_PROD.sql
-- Synchronizacja tabel ABC Pricing do bazy PROD
-- =====================================================
-- Data: 2026-01-19
-- Cel: Wyrównanie schematów TEST i PROD dla CNC-Pilot
-- Zawiera: 4 tabele ABC + kolumny machines/products
-- UWAGA: operations.production_plan_id juz istnieje w PROD (zweryfikowano)
-- =====================================================

-- =====================================================
-- 1. TABELA: machine_costs (21 kolumn)
-- Koszty operacyjne maszyn do obliczenia Real Hourly Rate
-- =====================================================

CREATE TABLE IF NOT EXISTS machine_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Wartości do obliczenia kosztów stałych (Annual Fixed Cost)
  replacement_value NUMERIC(12,2),           -- Wartość odtworzeniowa
  economic_life_years INTEGER DEFAULT 10,     -- Żywotność ekonomiczna (lata)
  floor_space_m2 NUMERIC(6,2),               -- Zajmowana powierzchnia (m²)
  cost_per_m2_yearly NUMERIC(8,2),           -- Koszt hali za m²/rok
  software_subscriptions_yearly NUMERIC(10,2) DEFAULT 0,
  financing_costs_yearly NUMERIC(10,2) DEFAULT 0,

  -- OEE i dostępny czas pracy
  shift_hours_per_day NUMERIC(4,1) DEFAULT 8,
  working_days_per_year INTEGER DEFAULT 250,
  oee_percentage NUMERIC(5,2) DEFAULT 65,

  -- Koszty zmienne (Variable Costs per hour)
  power_kw NUMERIC(6,2),
  average_load_factor NUMERIC(4,2) DEFAULT 0.7,
  consumables_rate_hour NUMERIC(8,2) DEFAULT 5,
  maintenance_reserve_hour NUMERIC(8,2) DEFAULT 10,

  -- Stawki operatora
  operator_hourly_rate NUMERIC(8,2) DEFAULT 50,
  machines_per_operator NUMERIC(3,1) DEFAULT 1,
  setup_specialist_rate NUMERIC(8,2) DEFAULT 70,

  -- Metadane
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(machine_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_machine_costs_company ON machine_costs(company_id);
CREATE INDEX IF NOT EXISTS idx_machine_costs_machine ON machine_costs(machine_id);

-- =====================================================
-- 2. TABELA: external_services (14 kolumn)
-- Usługi kooperacyjne: anodowanie, hartowanie, etc.
-- =====================================================

CREATE TABLE IF NOT EXISTS external_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  vendor_name TEXT,
  vendor_contact TEXT,

  -- Cennik
  base_price NUMERIC(10,2) NOT NULL,
  price_unit TEXT DEFAULT 'szt',
  min_order_value NUMERIC(10,2),

  -- Handling fee
  handling_fee_percent NUMERIC(5,2) DEFAULT 20,

  -- Lead time
  lead_time_days INTEGER DEFAULT 7,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_services_company ON external_services(company_id);
CREATE INDEX IF NOT EXISTS idx_external_services_active ON external_services(company_id, is_active);

-- =====================================================
-- 3. TABELA: pricing_config (12 kolumn)
-- Globalne ustawienia wyceny dla firmy
-- =====================================================

CREATE TABLE IF NOT EXISTS pricing_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,

  -- Cena energii
  electricity_price_kwh NUMERIC(6,4) DEFAULT 0.85,

  -- Marże
  default_margin_percent NUMERIC(5,2) DEFAULT 25,
  min_margin_percent NUMERIC(5,2) DEFAULT 15,

  -- Volume discounts
  margin_qty_1 NUMERIC(5,2) DEFAULT 45,
  margin_qty_10 NUMERIC(5,2) DEFAULT 35,
  margin_qty_50 NUMERIC(5,2) DEFAULT 25,
  margin_qty_100_plus NUMERIC(5,2) DEFAULT 20,

  -- Bar end loss
  bar_end_waste_kg NUMERIC(6,3) DEFAULT 0.5,

  -- Tool cost mode
  include_tool_costs BOOLEAN DEFAULT false,
  default_tool_cost_percent NUMERIC(5,2) DEFAULT 5,

  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 4. TABELA: quote_services (7 kolumn)
-- Powiązanie ofert z usługami kooperacyjnymi
-- =====================================================

CREATE TABLE IF NOT EXISTS quote_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL,
  external_service_id UUID REFERENCES external_services(id) ON DELETE CASCADE,

  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(10,2),
  total_price NUMERIC(10,2),

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(quote_id, external_service_id)
);

-- Dodaj FK do quotes jeśli tabela istnieje
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'quote_services_quote_id_fkey'
      AND table_name = 'quote_services'
    ) THEN
      ALTER TABLE quote_services
        ADD CONSTRAINT quote_services_quote_id_fkey
        FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quote_services_quote ON quote_services(quote_id);

-- =====================================================
-- 5. ALTER TABLE machines - hourly_rate
-- =====================================================

ALTER TABLE machines ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2);

-- =====================================================
-- 6. ALTER TABLE products - 7 kolumn ABC Pricing
-- =====================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS cycle_time_minutes NUMERIC(8,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS setup_time_minutes NUMERIC(8,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS efficiency_factor NUMERIC(4,2) DEFAULT 1.15;
ALTER TABLE products ADD COLUMN IF NOT EXISTS default_machine_id UUID REFERENCES machines(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS scrap_risk_factor NUMERIC(4,2) DEFAULT 1.0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_markup_percent NUMERIC(5,2) DEFAULT 15;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_weight_kg NUMERIC(8,4);

-- =====================================================
-- 7. operations.production_plan_id - JUZ ISTNIEJE W PROD
-- =====================================================
-- Zweryfikowano 2026-01-19: PROD juz ma kolumne production_plan_id
-- Nie trzeba dodawac - pomijamy ten krok

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

-- machine_costs
ALTER TABLE machine_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS machine_costs_select ON machine_costs;
CREATE POLICY machine_costs_select ON machine_costs
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS machine_costs_insert ON machine_costs;
CREATE POLICY machine_costs_insert ON machine_costs
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS machine_costs_update ON machine_costs;
CREATE POLICY machine_costs_update ON machine_costs
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS machine_costs_delete ON machine_costs;
CREATE POLICY machine_costs_delete ON machine_costs
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

-- external_services
ALTER TABLE external_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS external_services_select ON external_services;
CREATE POLICY external_services_select ON external_services
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS external_services_insert ON external_services;
CREATE POLICY external_services_insert ON external_services
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS external_services_update ON external_services;
CREATE POLICY external_services_update ON external_services
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS external_services_delete ON external_services;
CREATE POLICY external_services_delete ON external_services
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

-- pricing_config
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pricing_config_select ON pricing_config;
CREATE POLICY pricing_config_select ON pricing_config
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS pricing_config_insert ON pricing_config;
CREATE POLICY pricing_config_insert ON pricing_config
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS pricing_config_update ON pricing_config;
CREATE POLICY pricing_config_update ON pricing_config
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

-- quote_services (RLS przez quote_id -> quotes -> company_id)
ALTER TABLE quote_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quote_services_select ON quote_services;
CREATE POLICY quote_services_select ON quote_services
  FOR SELECT USING (
    quote_id IN (
      SELECT id FROM quotes WHERE company_id IN (
        SELECT company_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS quote_services_insert ON quote_services;
CREATE POLICY quote_services_insert ON quote_services
  FOR INSERT WITH CHECK (
    quote_id IN (
      SELECT id FROM quotes WHERE company_id IN (
        SELECT company_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS quote_services_delete ON quote_services;
CREATE POLICY quote_services_delete ON quote_services
  FOR DELETE USING (
    quote_id IN (
      SELECT id FROM quotes WHERE company_id IN (
        SELECT company_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- =====================================================
-- 9. SEED FUNCTION - Domyślne dane dla firmy
-- =====================================================

CREATE OR REPLACE FUNCTION seed_pricing_defaults(p_company_id UUID)
RETURNS void AS $$
BEGIN
  -- Wstaw domyślną konfigurację wyceny
  INSERT INTO pricing_config (company_id)
  VALUES (p_company_id)
  ON CONFLICT (company_id) DO NOTHING;

  -- Wstaw przykładowe usługi kooperacyjne
  IF NOT EXISTS (SELECT 1 FROM external_services WHERE company_id = p_company_id) THEN
    INSERT INTO external_services (company_id, name, description, base_price, price_unit, handling_fee_percent, lead_time_days)
    VALUES
      (p_company_id, 'Anodowanie naturalne', 'Anodowanie aluminium - warstwa naturalna', 5.00, 'szt', 20, 5),
      (p_company_id, 'Anodowanie czarne', 'Anodowanie aluminium - kolor czarny', 7.00, 'szt', 20, 5),
      (p_company_id, 'Hartowanie', 'Hartowanie stali do 60 HRC', 8.00, 'szt', 25, 7),
      (p_company_id, 'Cynkowanie galwaniczne', 'Cynkowanie galwaniczne z pasywacją', 4.00, 'szt', 20, 5),
      (p_company_id, 'Malowanie proszkowe', 'Malowanie proszkowe RAL', 12.00, 'szt', 15, 7),
      (p_company_id, 'Chromowanie twarde', 'Chromowanie twarde przemysłowe', 25.00, 'szt', 25, 10),
      (p_company_id, 'Piaskowanie', 'Piaskowanie powierzchni', 3.00, 'szt', 15, 3);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Sprawdź tabele ABC Pricing
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('machine_costs', 'external_services', 'pricing_config', 'quote_services')
ORDER BY tablename;

-- Sprawdź kolumny w machines
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'machines' AND column_name = 'hourly_rate';

-- Sprawdź kolumny ABC w products
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('cycle_time_minutes', 'setup_time_minutes', 'efficiency_factor',
                      'default_machine_id', 'scrap_risk_factor', 'material_markup_percent',
                      'material_weight_kg')
ORDER BY column_name;

-- Oczekiwany wynik:
-- 4 tabele ABC z RLS włączonym
-- machines.hourly_rate
-- 7 kolumn ABC w products
