-- ============================================
-- Phase 4.3: AI Conversations for CNC Copilot
-- Chat history persistence
-- ============================================

-- 1. Create ai_conversations table
-- Messages stored as JSONB array (loaded as whole, never queried per-message)
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Conversation metadata
  title TEXT,                          -- Auto-generated or user-set title

  -- Messages as JSONB array
  -- Each: { role: 'user'|'assistant'|'system', content: string, createdAt: string, toolInvocations?: [...] }
  messages JSONB NOT NULL DEFAULT '[]',

  -- Context snapshot (what page user was on, etc.)
  context JSONB DEFAULT '{}',

  -- Quick stats
  message_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversations_company
ON ai_conversations(company_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user
ON ai_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated
ON ai_conversations(updated_at DESC);

-- 3. RLS — users see ONLY their own conversations
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON ai_conversations FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    AND company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can insert their own conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    AND company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can update their own conversations"
  ON ai_conversations FOR UPDATE
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can delete their own conversations"
  ON ai_conversations FOR DELETE
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- 4. Verification
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'ai_conversations';

COMMENT ON TABLE ai_conversations IS 'Phase 4.3: CNC Copilot chat history. Messages stored as JSONB array for efficient whole-conversation loading.';
