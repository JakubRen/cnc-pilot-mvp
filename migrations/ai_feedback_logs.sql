-- ============================================
-- AI FEEDBACK LOGS - Data Feedback Loop (CNC MOAT)
-- Run this in Supabase SQL Editor
-- ============================================

-- Table: ai_feedback_logs
-- Stores pairs: [AI suggestion] vs [User correction]
-- This builds our unique training dataset (Golden Dataset)

CREATE TABLE IF NOT EXISTS ai_feedback_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- User context
  user_id BIGINT REFERENCES users(id),
  company_id UUID REFERENCES companies(id),

  -- Feature context
  feature_name TEXT NOT NULL,          -- e.g., 'estimate_time', 'material_select', 'price_calculation'
  input_context JSONB,                 -- e.g., { "material": "stal_304", "dimensions": "100x20", "quantity": 5 }

  -- The Gold (training data)
  ai_output TEXT NOT NULL,             -- AI suggested value (e.g., "45")
  user_correction TEXT NOT NULL,       -- User final value (e.g., "60")
  correction_reason TEXT,              -- Optional reason for correction

  -- Metadata
  session_id TEXT,                     -- Optional session tracking
  metadata JSONB                       -- Additional context if needed
);

-- Comment for documentation
COMMENT ON TABLE ai_feedback_logs IS 'Stores AI suggestion vs User correction pairs for model fine-tuning (CNC MOAT)';
COMMENT ON COLUMN ai_feedback_logs.feature_name IS 'Feature identifier: estimate_time, material_select, price_calculation, etc.';
COMMENT ON COLUMN ai_feedback_logs.ai_output IS 'What AI suggested';
COMMENT ON COLUMN ai_feedback_logs.user_correction IS 'What user actually entered (different from AI)';

-- Indexes for analytics (fast retrieval for training)
CREATE INDEX IF NOT EXISTS idx_feedback_feature ON ai_feedback_logs(feature_name);
CREATE INDEX IF NOT EXISTS idx_feedback_company ON ai_feedback_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON ai_feedback_logs(created_at DESC);

-- RLS (Row Level Security) - Data protection
ALTER TABLE ai_feedback_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only INSERT their own feedback
CREATE POLICY "Users can insert own feedback"
  ON ai_feedback_logs FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Policy: Users can view their company's feedback (for analytics)
CREATE POLICY "Users can view company feedback"
  ON ai_feedback_logs FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

-- Policy: Service role can do everything (for admin/analytics)
CREATE POLICY "Service role full access"
  ON ai_feedback_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Check table exists:
-- SELECT * FROM ai_feedback_logs LIMIT 1;

-- Check indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'ai_feedback_logs';

-- Check RLS policies:
-- SELECT policyname FROM pg_policies WHERE tablename = 'ai_feedback_logs';
