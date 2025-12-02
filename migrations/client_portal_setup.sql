-- =====================================================
-- CLIENT PORTAL - Access Tokens
-- =====================================================
-- Allows generating magic links for customers to view their orders
-- without requiring login/password

-- Table: client_access_tokens
CREATE TABLE IF NOT EXISTS client_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  is_active BOOLEAN DEFAULT true,
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_client_tokens_token ON client_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_client_tokens_customer ON client_access_tokens(company_id, customer_name);

-- RLS Policies
ALTER TABLE client_access_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see tokens from their company
CREATE POLICY "Users can view own company tokens"
  ON client_access_tokens FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

-- Users can create tokens for their company
CREATE POLICY "Users can create tokens for own company"
  ON client_access_tokens FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

-- Users can update tokens from their company
CREATE POLICY "Users can update own company tokens"
  ON client_access_tokens FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

-- Users can delete tokens from their company
CREATE POLICY "Users can delete own company tokens"
  ON client_access_tokens FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

-- Public read policy for valid tokens (for client portal)
-- This allows unauthenticated access via token
CREATE POLICY "Anyone can read with valid token"
  ON client_access_tokens FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE client_access_tokens IS 'Magic links for customers to view their orders without login';
COMMENT ON COLUMN client_access_tokens.token IS 'UUID token used in the portal URL';
COMMENT ON COLUMN client_access_tokens.customer_name IS 'Customer name - used to filter orders';
COMMENT ON COLUMN client_access_tokens.expires_at IS 'Token expiration date (default 30 days)';
COMMENT ON COLUMN client_access_tokens.access_count IS 'Number of times the portal was accessed';
