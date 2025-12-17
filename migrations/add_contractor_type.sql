-- =====================================================
-- ADD CONTRACTOR TYPE TO CUSTOMERS
-- =====================================================
-- Dodanie typu kontrahenta: Klient, Sprzedawca, Kooperant
-- =====================================================

-- Dodaj kolumnę type (domyślnie 'client' dla kompatybilności wstecznej)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'client'
CHECK (type IN ('client', 'supplier', 'cooperator'));

-- Dodaj index dla szybkiego filtrowania po typie
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_company_type ON customers(company_id, type);

-- Komentarze
COMMENT ON COLUMN customers.type IS 'Typ kontrahenta: client (klient), supplier (sprzedawca), cooperator (kooperant)';
