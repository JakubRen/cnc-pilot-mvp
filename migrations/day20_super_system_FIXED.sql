-- DAY 20 SUPER SYSTEM - Fixed Migration (without IF NOT EXISTS on policies)
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- Tags system
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Polymorphic entity tags
CREATE TABLE IF NOT EXISTS entity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'inventory', 'document', 'user')),
  entity_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tag_id, entity_type, entity_id)
);

-- Saved filters per user
CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  page TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- File metadata
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT CHECK (entity_type IN ('order', 'inventory', 'document', 'user')),
  entity_id TEXT,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'pl',
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  dashboard_layout JSONB,
  preferences JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI price estimates cache
CREATE TABLE IF NOT EXISTS ai_price_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material TEXT NOT NULL,
  dimensions TEXT,
  complexity TEXT CHECK (complexity IN ('low', 'medium', 'high')),
  quantity INTEGER,
  estimated_price NUMERIC,
  estimated_hours NUMERIC,
  confidence_score NUMERIC,
  prompt_used TEXT,
  response_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Scheduled reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('orders', 'inventory', 'time', 'revenue', 'productivity')),
  recipients TEXT[] NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  time_of_day TIME NOT NULL,
  filters JSONB,
  last_sent_at TIMESTAMP,
  next_send_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tags_company_id ON tags(company_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_tag_id ON entity_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id ON saved_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_page ON saved_filters(page);
CREATE INDEX IF NOT EXISTS idx_files_company_id ON files(company_id);
CREATE INDEX IF NOT EXISTS idx_files_entity ON files(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_price_estimates_company_id ON ai_price_estimates(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_company_id ON scheduled_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_send ON scheduled_reports(next_send_at) WHERE is_active = true;

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_price_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. DROP EXISTING POLICIES (if any)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view company tags" ON tags;
DROP POLICY IF EXISTS "Users can create company tags" ON tags;
DROP POLICY IF EXISTS "Users can update company tags" ON tags;
DROP POLICY IF EXISTS "Users can delete company tags" ON tags;

DROP POLICY IF EXISTS "Users can view company entity tags" ON entity_tags;
DROP POLICY IF EXISTS "Users can create entity tags" ON entity_tags;
DROP POLICY IF EXISTS "Users can delete entity tags" ON entity_tags;

DROP POLICY IF EXISTS "Users can view own filters" ON saved_filters;
DROP POLICY IF EXISTS "Users can create own filters" ON saved_filters;
DROP POLICY IF EXISTS "Users can update own filters" ON saved_filters;
DROP POLICY IF EXISTS "Users can delete own filters" ON saved_filters;

DROP POLICY IF EXISTS "Users can view company files" ON files;
DROP POLICY IF EXISTS "Users can upload files" ON files;
DROP POLICY IF EXISTS "Users can delete own files" ON files;

DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can create own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

DROP POLICY IF EXISTS "Users can view company estimates" ON ai_price_estimates;
DROP POLICY IF EXISTS "Users can create estimates" ON ai_price_estimates;

DROP POLICY IF EXISTS "Users can view company reports" ON scheduled_reports;
DROP POLICY IF EXISTS "Admins can manage reports" ON scheduled_reports;

-- ============================================================================
-- 5. CREATE RLS POLICIES
-- ============================================================================

-- Tags policies
CREATE POLICY "Users can view company tags"
  ON tags FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can create company tags"
  ON tags FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can update company tags"
  ON tags FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can delete company tags"
  ON tags FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

-- Entity tags policies
CREATE POLICY "Users can view company entity tags"
  ON entity_tags FOR SELECT
  USING (tag_id IN (
    SELECT id FROM tags WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

CREATE POLICY "Users can create entity tags"
  ON entity_tags FOR INSERT
  WITH CHECK (tag_id IN (
    SELECT id FROM tags WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete entity tags"
  ON entity_tags FOR DELETE
  USING (tag_id IN (
    SELECT id FROM tags WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

-- Saved filters policies
CREATE POLICY "Users can view own filters"
  ON saved_filters FOR SELECT
  USING (user_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can create own filters"
  ON saved_filters FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can update own filters"
  ON saved_filters FOR UPDATE
  USING (user_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can delete own filters"
  ON saved_filters FOR DELETE
  USING (user_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

-- Files policies
CREATE POLICY "Users can view company files"
  ON files FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can upload files"
  ON files FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can delete own files"
  ON files FOR DELETE
  USING (uploaded_by IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

-- User preferences policies
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (user_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can create own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (user_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

-- AI price estimates policies
CREATE POLICY "Users can view company estimates"
  ON ai_price_estimates FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can create estimates"
  ON ai_price_estimates FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

-- Scheduled reports policies
CREATE POLICY "Users can view company reports"
  ON scheduled_reports FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Admins can manage reports"
  ON scheduled_reports FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 6. CREATE FUNCTIONS
-- ============================================================================

-- Update trigger for user_preferences
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Update trigger for scheduled_reports
DROP TRIGGER IF EXISTS trigger_update_scheduled_reports_updated_at ON scheduled_reports;
CREATE TRIGGER trigger_update_scheduled_reports_updated_at
  BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- Tables created: 7 (tags, entity_tags, saved_filters, files, user_preferences, ai_price_estimates, scheduled_reports)
-- Indexes created: 12
-- RLS policies: 20
-- Functions: 1
-- Triggers: 2
