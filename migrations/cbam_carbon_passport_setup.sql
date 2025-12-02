-- ============================================
-- CBAM - Paszport Węglowy Lite
-- Carbon Border Adjustment Mechanism Reporting
-- ============================================

-- 1. Tabela emisji materiałów (współczynniki CO2)
CREATE TABLE IF NOT EXISTS material_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL = globalne wartości domyślne

  -- Identyfikacja materiału
  material_name TEXT NOT NULL, -- np. "Stal S235", "Aluminium 6061"
  material_category TEXT NOT NULL, -- steel, aluminum, copper, plastic, etc.

  -- Współczynnik emisji CO2 (kg CO2 / kg materiału)
  emission_factor NUMERIC(10,4) NOT NULL, -- np. 1.85 dla stali

  -- Źródło danych
  source TEXT, -- np. "IPCC 2023", "Producent", "Własne obliczenia"
  year INTEGER, -- rok danych

  -- Aktywność
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela emisji energii (współczynniki CO2 per kWh)
CREATE TABLE IF NOT EXISTS energy_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Typ energii
  energy_type TEXT NOT NULL, -- electricity, gas, diesel, etc.
  energy_name TEXT NOT NULL, -- np. "Energia elektryczna PL", "Gaz ziemny"

  -- Współczynnik emisji CO2 (kg CO2 / kWh lub kg CO2 / m3)
  emission_factor NUMERIC(10,4) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kWh', -- kWh, m3, litr

  -- Źródło
  source TEXT,
  year INTEGER,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Raporty emisji (Paszporty Węglowe)
CREATE TABLE IF NOT EXISTS carbon_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Powiązanie (może być z zamówieniem lub dokumentem WZ)
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  document_id UUID, -- opcjonalne powiązanie z dokumentem wydania

  -- Numer raportu
  report_number TEXT NOT NULL,

  -- Dane produktu
  product_name TEXT NOT NULL,
  product_quantity NUMERIC(10,2) NOT NULL,
  product_unit TEXT DEFAULT 'szt',

  -- Emisje z materiału
  material_name TEXT,
  material_weight_kg NUMERIC(10,3), -- waga w kg
  material_emission_factor NUMERIC(10,4),
  material_co2_kg NUMERIC(10,3), -- obliczona emisja materiału

  -- Emisje z energii (produkcja)
  energy_kwh NUMERIC(10,2), -- zużyta energia w kWh
  energy_emission_factor NUMERIC(10,4),
  energy_co2_kg NUMERIC(10,3), -- obliczona emisja energii

  -- Transport (opcjonalne)
  transport_km NUMERIC(10,2),
  transport_co2_kg NUMERIC(10,3),

  -- Suma
  total_co2_kg NUMERIC(10,3) NOT NULL, -- całkowita emisja CO2 w kg
  co2_per_unit NUMERIC(10,4), -- emisja na sztukę

  -- Metadane
  calculation_method TEXT DEFAULT 'simplified', -- simplified, detailed, verified
  notes TEXT,

  -- Audyt
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Domyślne współczynniki emisji materiałów (globalne)
INSERT INTO material_emissions (company_id, material_name, material_category, emission_factor, source, year) VALUES
(NULL, 'Stal S235', 'steel', 1.85, 'World Steel Association 2023', 2023),
(NULL, 'Stal S355', 'steel', 1.85, 'World Steel Association 2023', 2023),
(NULL, 'Stal nierdzewna 304', 'steel', 6.15, 'World Steel Association 2023', 2023),
(NULL, 'Stal nierdzewna 316', 'steel', 6.15, 'World Steel Association 2023', 2023),
(NULL, 'Aluminium 6061', 'aluminum', 8.24, 'International Aluminium Institute 2023', 2023),
(NULL, 'Aluminium 7075', 'aluminum', 8.24, 'International Aluminium Institute 2023', 2023),
(NULL, 'Miedź', 'copper', 3.81, 'IPCC 2023', 2023),
(NULL, 'Mosiądz', 'copper', 3.50, 'IPCC 2023', 2023),
(NULL, 'Brąz', 'copper', 3.60, 'IPCC 2023', 2023),
(NULL, 'Tytan Grade 5', 'titanium', 35.00, 'IPCC 2023', 2023),
(NULL, 'POM (Delrin)', 'plastic', 3.40, 'PlasticsEurope 2023', 2023),
(NULL, 'PA6 (Nylon)', 'plastic', 7.90, 'PlasticsEurope 2023', 2023),
(NULL, 'PEEK', 'plastic', 26.40, 'PlasticsEurope 2023', 2023),
(NULL, 'Żeliwo szare', 'iron', 1.51, 'World Steel Association 2023', 2023)
ON CONFLICT DO NOTHING;

-- 5. Domyślne współczynniki emisji energii (Polska)
INSERT INTO energy_emissions (company_id, energy_type, energy_name, emission_factor, unit, source, year) VALUES
(NULL, 'electricity', 'Energia elektryczna (PL mix)', 0.708, 'kWh', 'KOBiZE 2023', 2023),
(NULL, 'electricity', 'Energia elektryczna (OZE)', 0.000, 'kWh', 'Standard', 2023),
(NULL, 'gas', 'Gaz ziemny', 2.02, 'm3', 'IPCC 2023', 2023),
(NULL, 'diesel', 'Olej napędowy', 2.68, 'litr', 'IPCC 2023', 2023)
ON CONFLICT DO NOTHING;

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_material_emissions_company ON material_emissions(company_id);
CREATE INDEX IF NOT EXISTS idx_material_emissions_category ON material_emissions(material_category);
CREATE INDEX IF NOT EXISTS idx_energy_emissions_company ON energy_emissions(company_id);
CREATE INDEX IF NOT EXISTS idx_carbon_reports_company ON carbon_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_carbon_reports_order ON carbon_reports(order_id);

-- RLS
ALTER TABLE material_emissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_emissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_reports ENABLE ROW LEVEL SECURITY;

-- Material emissions policies (allow reading global + own company)
CREATE POLICY "Users can view global and company material emissions"
  ON material_emissions FOR SELECT
  USING (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can insert material emissions for their company"
  ON material_emissions FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update material emissions from their company"
  ON material_emissions FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Energy emissions policies
CREATE POLICY "Users can view global and company energy emissions"
  ON energy_emissions FOR SELECT
  USING (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can insert energy emissions for their company"
  ON energy_emissions FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Carbon reports policies
CREATE POLICY "Users can view carbon_reports from their company"
  ON carbon_reports FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert carbon_reports for their company"
  ON carbon_reports FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update carbon_reports from their company"
  ON carbon_reports FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete carbon_reports from their company"
  ON carbon_reports FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Funkcja do generowania numeru raportu
CREATE OR REPLACE FUNCTION generate_carbon_report_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) + 1 INTO v_count
  FROM carbon_reports
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  RETURN 'CO2-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Komentarz
COMMENT ON TABLE carbon_reports IS 'Paszporty Węglowe - raporty emisji CO2 zgodne z CBAM.
Formuła: Total CO2 = (Waga_kg * Emisja_Materiału) + (kWh * Emisja_Energii) + Transport';
