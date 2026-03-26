-- ============================================
-- Migration: API Keys for MCP Server
-- ============================================
-- Stores hashed API keys for external MCP clients (Claude Desktop, Cursor, etc.)
-- Raw key is shown once on creation; only the SHA-256 hash is persisted.

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,          -- SHA-256 of the full key
  key_prefix TEXT NOT NULL,        -- first 8 chars for display, e.g. "cncp_a1b2"
  name TEXT NOT NULL,              -- user label, e.g. "Claude Desktop"
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Lookup by hash on every MCP request
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- List keys for a company (settings page)
CREATE INDEX IF NOT EXISTS idx_api_keys_company ON api_keys(company_id);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- All authenticated company members can view their keys (masked)
CREATE POLICY "Users can view own company api keys"
  ON api_keys FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

-- Only owner/admin can create, update, delete
CREATE POLICY "Admins can insert api keys"
  ON api_keys FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM users
    WHERE auth_id = auth.uid()
    AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can update api keys"
  ON api_keys FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM users
    WHERE auth_id = auth.uid()
    AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can delete api keys"
  ON api_keys FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM users
    WHERE auth_id = auth.uid()
    AND role IN ('owner', 'admin')
  ));
