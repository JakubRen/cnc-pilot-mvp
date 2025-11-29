-- ============================================
-- AI CONVERSATIONS - Chat History for AI Bot
-- Run this in Supabase SQL Editor
-- ============================================

-- Table: ai_conversations
-- Stores conversation history with AI assistant
-- Different from ai_feedback_logs which stores training data pairs

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- User context (multi-tenant)
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  -- Conversation metadata
  title TEXT,                              -- e.g., "Wycena zamówienia #123"
  model TEXT DEFAULT 'claude-3-5-sonnet',  -- Which AI model used

  -- Conversation history (array of messages)
  -- Format: [{ role: 'user'|'assistant', content: '...', timestamp: '...', tokens?: number }]
  messages JSONB NOT NULL DEFAULT '[]',

  -- Additional context (order_id, etc.)
  -- Format: { order_id: '...', customer_name: '...', context_type: 'order_estimation' }
  context JSONB DEFAULT '{}',

  -- Usage tracking (for cost monitoring)
  total_tokens INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments for documentation
COMMENT ON TABLE ai_conversations IS 'Stores AI chat conversation history for the AI Bot feature';
COMMENT ON COLUMN ai_conversations.messages IS 'Array of messages: [{ role, content, timestamp, tokens? }]';
COMMENT ON COLUMN ai_conversations.context IS 'Additional context like related order_id, customer_name, etc.';
COMMENT ON COLUMN ai_conversations.total_tokens IS 'Sum of all tokens used in this conversation (for cost tracking)';

-- Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_company ON ai_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created ON ai_conversations(created_at DESC);

-- Index for searching within context JSONB (e.g., find conversations about specific order)
CREATE INDEX IF NOT EXISTS idx_ai_conversations_context ON ai_conversations USING GIN (context);

-- RLS (Row Level Security) - Data protection
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view ONLY their own conversations
CREATE POLICY "Users can view own conversations"
  ON ai_conversations FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Policy: Users can create conversations (must be their own user_id)
CREATE POLICY "Users can create conversations"
  ON ai_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Policy: Users can update ONLY their own conversations
CREATE POLICY "Users can update own conversations"
  ON ai_conversations FOR UPDATE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Policy: Users can delete ONLY their own conversations
CREATE POLICY "Users can delete own conversations"
  ON ai_conversations FOR DELETE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Policy: Service role can do everything (for admin/analytics)
CREATE POLICY "Service role full access on ai_conversations"
  ON ai_conversations FOR ALL
  TO service_role
  USING (true);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_conversations_updated_at();

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Check table exists:
-- SELECT * FROM ai_conversations LIMIT 1;

-- Check indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'ai_conversations';

-- Check RLS policies:
-- SELECT policyname FROM pg_policies WHERE tablename = 'ai_conversations';

-- Test insert (replace with real user_id and company_id):
-- INSERT INTO ai_conversations (user_id, company_id, title, messages)
-- VALUES (1, 'your-company-uuid', 'Test conversation', '[{"role":"user","content":"Test","timestamp":"2025-01-01T00:00:00Z"}]');
