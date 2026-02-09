-- ============================================
-- AI INSIGHTS CACHE - Dashboard AI Widget
-- Run this in Supabase SQL Editor
-- ============================================

-- Table: ai_insights
-- Stores cached AI-generated insights per company (max 1 row per company)
-- Insights are refreshed max once per 6 hours to minimize API costs

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Company scope (1 row per company via UNIQUE)
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- AI output
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',

  -- Cache control
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '6 hours'),

  -- Usage tracking
  tokens_used INTEGER DEFAULT 0,

  -- Unique: 1 insight row per company (enables upsert)
  CONSTRAINT uq_ai_insights_company UNIQUE (company_id)
);

-- Comments
COMMENT ON TABLE ai_insights IS 'Cached AI-generated dashboard insights (1 row per company, refreshed every 6h)';
COMMENT ON COLUMN ai_insights.insights IS 'JSONB array of insight objects: [{type, severity, icon, title, description}]';
COMMENT ON COLUMN ai_insights.data_snapshot IS 'Snapshot of aggregated data used to generate insights';
COMMENT ON COLUMN ai_insights.expires_at IS 'Cache expiry timestamp (generated_at + 6 hours)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_company ON ai_insights(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_expires ON ai_insights(expires_at);

-- RLS (Row Level Security)
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own company's insights
CREATE POLICY "Users can view company insights"
  ON ai_insights FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

-- Policy: Users can insert their own company's insights
CREATE POLICY "Users can insert company insights"
  ON ai_insights FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

-- Policy: Users can update their own company's insights
CREATE POLICY "Users can update company insights"
  ON ai_insights FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

-- Policy: Service role full access
CREATE POLICY "Service role full access"
  ON ai_insights FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Check table exists:
-- SELECT * FROM ai_insights LIMIT 1;

-- Check indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'ai_insights';

-- Check RLS policies:
-- SELECT policyname FROM pg_policies WHERE tablename = 'ai_insights';
