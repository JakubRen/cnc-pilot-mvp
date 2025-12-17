-- =====================================================
-- CUSTOMERS MODULE - Complete CRM Foundation
-- =====================================================
-- Created: 2025-12-14
-- Purpose: Customer database for Quotes & Orders
-- =====================================================

-- Drop existing if recreating
DROP TABLE IF EXISTS customers CASCADE;

-- Create customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,

  -- Basic info (REQUIRED)
  name TEXT NOT NULL,

  -- Contact info (OPTIONAL but recommended)
  email TEXT,
  phone TEXT,
  nip TEXT, -- Polish tax ID (NIP)

  -- Address (OPTIONAL)
  street TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Polska',

  -- Additional
  notes TEXT,

  -- Metadata
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT customers_company_fk FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT customers_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Indexes for performance
CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_nip ON customers(nip) WHERE nip IS NOT NULL;

-- Composite index for searching
CREATE INDEX idx_customers_company_name ON customers(company_id, name);

-- RLS (Row Level Security)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see customers from their company
CREATE POLICY customers_select_policy ON customers
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Users can insert customers for their company
CREATE POLICY customers_insert_policy ON customers
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Users can update customers from their company
CREATE POLICY customers_update_policy ON customers
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Only owners can delete customers
CREATE POLICY customers_delete_policy ON customers
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_id = auth.uid()
      AND role = 'owner'
    )
  );

-- =====================================================
-- ADD customer_id to existing tables
-- =====================================================

-- Add to quotes table
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);

COMMENT ON COLUMN quotes.customer_id IS 'Link to customer record (replaces customer_name string)';

-- Add to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

COMMENT ON COLUMN orders.customer_id IS 'Link to customer record (replaces customer_name string)';

-- =====================================================
-- Helper function: Get customer name by ID
-- =====================================================
CREATE OR REPLACE FUNCTION get_customer_name(customer_uuid UUID)
RETURNS TEXT AS $$
  SELECT name FROM customers WHERE id = customer_uuid;
$$ LANGUAGE SQL STABLE;

-- =====================================================
-- Helper function: Search customers by name
-- =====================================================
CREATE OR REPLACE FUNCTION search_customers(
  p_company_id UUID,
  p_search_term TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  nip TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.email,
    c.phone,
    c.nip
  FROM customers c
  WHERE c.company_id = p_company_id
    AND (
      c.name ILIKE '%' || p_search_term || '%'
      OR c.email ILIKE '%' || p_search_term || '%'
      OR c.nip ILIKE '%' || p_search_term || '%'
    )
  ORDER BY c.name
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE customers IS 'Customer/Client database for CRM';
COMMENT ON COLUMN customers.name IS 'Company or person name (required)';
COMMENT ON COLUMN customers.email IS 'Primary contact email';
COMMENT ON COLUMN customers.phone IS 'Primary contact phone';
COMMENT ON COLUMN customers.nip IS 'Polish tax identification number (NIP)';
COMMENT ON COLUMN customers.notes IS 'Internal notes about this customer';

-- =====================================================
-- Sample data (optional - remove in production)
-- =====================================================
-- This will be empty for now - customers added via UI
