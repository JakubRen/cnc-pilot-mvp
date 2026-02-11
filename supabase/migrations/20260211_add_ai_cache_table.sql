-- AI Cache table for caching Gemini API responses
-- Used by: report summaries, customer intelligence, inventory predictions

CREATE TABLE IF NOT EXISTS ai_cache (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cache_key text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  model text NOT NULL DEFAULT 'gemini-2.5-flash',
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '6 hours'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT ai_cache_pkey PRIMARY KEY (id),
  CONSTRAINT ai_cache_company_key_unique UNIQUE (company_id, cache_key)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_cache_company_key ON ai_cache (company_id, cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires_at ON ai_cache (expires_at);

-- RLS: users can only access their own company's cache
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own company ai_cache"
  ON ai_cache FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own company ai_cache"
  ON ai_cache FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own company ai_cache"
  ON ai_cache FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );
