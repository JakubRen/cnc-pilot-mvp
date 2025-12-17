-- =====================================================
-- QUOTES SYSTEM - FREE MVP
-- =====================================================
-- Tabela ofert + funkcje pomocnicze
-- Bez AI, bez auto-email, bez PDF
-- Focus: szybkie wyceny + portal klienta
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: quotes
-- =====================================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number TEXT UNIQUE NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Customer info
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,

  -- Product details
  part_name TEXT,
  material TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  deadline DATE,

  -- Pricing
  total_price NUMERIC(10,2) NOT NULL,
  price_per_unit NUMERIC(10,2),
  breakdown JSONB, -- { materialCost, laborCost, setupCost, marginPercentage }

  -- Pricing metadata (FREE version - no AI)
  pricing_method TEXT, -- 'rule_based' | 'historical' | 'hybrid'
  confidence_score INTEGER, -- 0-100
  reasoning TEXT,

  -- Status & tracking
  status TEXT DEFAULT 'draft',
  -- draft = utworzona, nie wysłana
  -- sent = link skopiowany/wysłany
  -- viewed = klient zobaczył
  -- accepted = klient zaakceptował
  -- rejected = klient odrzucił
  -- expired = przekroczony termin ważności

  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  expires_at TIMESTAMP, -- domyślnie +14 dni od utworzenia

  -- Client portal (tokenized access)
  token TEXT UNIQUE NOT NULL,

  -- Relations
  converted_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT quotes_company_fk FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT quotes_status_check CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
  CONSTRAINT quotes_pricing_method_check CHECK (pricing_method IN ('rule_based', 'historical', 'hybrid'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_company ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_token ON quotes(token);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_email ON quotes(customer_email);

-- =====================================================
-- TABLE: quote_items (for multi-item quotes)
-- =====================================================
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

  part_name TEXT NOT NULL,
  material TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,

  -- Optional details
  dimensions TEXT, -- e.g. "100x50x20mm"
  complexity TEXT, -- simple/medium/complex
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

-- =====================================================
-- RPC FUNCTION: Generate Quote Number
-- =====================================================
-- Format: QT-YYYY-NNNN
-- Example: QT-2024-0001
-- =====================================================
CREATE OR REPLACE FUNCTION generate_quote_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
  v_quote_number TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Count quotes for this company in current year
  SELECT COUNT(*) INTO v_count
  FROM quotes
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Generate padded number (0001, 0002, etc.)
  v_number := LPAD((v_count + 1)::TEXT, 4, '0');

  -- Combine into quote number
  v_quote_number := 'QT-' || v_year || '-' || v_number;

  RETURN v_quote_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RPC FUNCTION: Generate Random Token
-- =====================================================
-- 32-character random token for client portal
-- =====================================================
CREATE OR REPLACE FUNCTION generate_quote_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_updated_at_trigger
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quotes_updated_at();

-- =====================================================
-- TRIGGER: Auto-calculate price_per_unit
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_quote_price_per_unit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity > 0 THEN
    NEW.price_per_unit = NEW.total_price / NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_price_per_unit_trigger
  BEFORE INSERT OR UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_price_per_unit();

-- =====================================================
-- TRIGGER: Auto-set expires_at (14 days from creation)
-- =====================================================
CREATE OR REPLACE FUNCTION set_quote_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at = NOW() + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_expiry_trigger
  BEFORE INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_expiry();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see quotes from their company
CREATE POLICY quotes_company_isolation ON quotes
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY quote_items_company_isolation ON quote_items
  FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM quotes WHERE company_id IN (
        SELECT company_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- =====================================================
-- HELPER FUNCTION: Get quote stats for company
-- =====================================================
CREATE OR REPLACE FUNCTION get_quote_stats(p_company_id UUID)
RETURNS TABLE(
  total_quotes BIGINT,
  draft_quotes BIGINT,
  sent_quotes BIGINT,
  accepted_quotes BIGINT,
  expired_quotes BIGINT,
  total_value NUMERIC,
  acceptance_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_quotes,
    COUNT(*) FILTER (WHERE status = 'draft')::BIGINT as draft_quotes,
    COUNT(*) FILTER (WHERE status = 'sent' OR status = 'viewed')::BIGINT as sent_quotes,
    COUNT(*) FILTER (WHERE status = 'accepted')::BIGINT as accepted_quotes,
    COUNT(*) FILTER (WHERE status = 'expired')::BIGINT as expired_quotes,
    COALESCE(SUM(total_price), 0) as total_value,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('sent', 'viewed', 'accepted', 'rejected')) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE status = 'accepted')::NUMERIC /
        COUNT(*) FILTER (WHERE status IN ('sent', 'viewed', 'accepted', 'rejected'))::NUMERIC * 100,
        2
      )
      ELSE 0
    END as acceptance_rate
  FROM quotes
  WHERE company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE quotes IS 'Oferty cenowe - FREE MVP bez AI/email';
COMMENT ON COLUMN quotes.token IS 'Random token dla portalu klienta (32 chars hex)';
COMMENT ON COLUMN quotes.pricing_method IS 'rule_based | historical | hybrid (brak AI w FREE)';
COMMENT ON COLUMN quotes.expires_at IS 'Domyślnie +14 dni od created_at';
COMMENT ON FUNCTION generate_quote_number IS 'Generuje numer oferty: QT-YYYY-NNNN';
COMMENT ON FUNCTION get_quote_stats IS 'Statystyki ofert dla firmy (acceptance rate, wartość itp.)';
