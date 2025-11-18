-- ============================================================================
-- DAY 20 SUPER SYSTEM - Database Migration
-- Created: 2025-01-18
-- Description: Complete database schema for all 6 sections (A-F)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION A: ANALYTICS
-- ----------------------------------------------------------------------------

-- Add analytics columns to existing tables
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC,
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC,
ADD COLUMN IF NOT EXISTS profit_margin NUMERIC;

ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS reorder_point NUMERIC,
ADD COLUMN IF NOT EXISTS supplier_name TEXT,
ADD COLUMN IF NOT EXISTS last_ordered_at TIMESTAMP WITH TIME ZONE;

-- ----------------------------------------------------------------------------
-- SECTION B: REAL-TIME (Using Supabase Realtime - enable publications)
-- ----------------------------------------------------------------------------

-- Enable realtime for key tables (run in Supabase Dashboard - SQL Editor)
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE inventory;
-- ALTER PUBLICATION supabase_realtime ADD TABLE time_logs;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ----------------------------------------------------------------------------
-- SECTION C: TAGS & SEARCH
-- ----------------------------------------------------------------------------

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_company_id ON tags(company_id);

-- Entity Tags (polymorphic join table)
CREATE TABLE IF NOT EXISTS entity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'inventory', 'document', 'user')),
  entity_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tag_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_tags_tag_id ON entity_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_type, entity_id);

-- Saved Filters
CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  page TEXT NOT NULL, -- 'orders', 'inventory', etc.
  filters JSONB NOT NULL, -- Saved filter state
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id ON saved_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_page ON saved_filters(page);

-- ----------------------------------------------------------------------------
-- SECTION D: FILE STORAGE
-- ----------------------------------------------------------------------------

-- Files table (metadata - actual files in Supabase Storage)
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT CHECK (entity_type IN ('order', 'inventory', 'document', 'user', 'company')),
  entity_id TEXT,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'pdf', 'document', 'other'
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  public_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_company_id ON files(company_id);
CREATE INDEX IF NOT EXISTS idx_files_entity ON files(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

-- ----------------------------------------------------------------------------
-- SECTION E: UI/UX (User Preferences)
-- ----------------------------------------------------------------------------

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'pl' CHECK (language IN ('pl', 'en')),
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  dashboard_layout JSONB, -- Customizable dashboard widget layout
  preferences JSONB, -- Other custom preferences
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ----------------------------------------------------------------------------
-- SECTION F: AUTOMATION & AI
-- ----------------------------------------------------------------------------

-- AI Price Estimates Cache
CREATE TABLE IF NOT EXISTS ai_price_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material TEXT NOT NULL,
  dimensions TEXT,
  complexity TEXT,
  quantity INTEGER,
  estimated_price NUMERIC,
  estimated_hours NUMERIC,
  confidence_score NUMERIC, -- 0-1
  prompt_used TEXT,
  response_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_price_estimates_company_id ON ai_price_estimates(company_id);

-- Scheduled Reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('orders', 'inventory', 'time', 'revenue', 'productivity')),
  recipients TEXT[] NOT NULL, -- Array of email addresses
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER, -- 0-6 for weekly
  day_of_month INTEGER, -- 1-31 for monthly
  time_of_day TIME, -- HH:MM
  filters JSONB,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_company_id ON scheduled_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_send ON scheduled_reports(next_send_at) WHERE is_active = true;

-- Email Queue
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, scheduled_for);

-- ----------------------------------------------------------------------------
-- RLS POLICIES
-- ----------------------------------------------------------------------------

-- Tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view company tags"
  ON tags FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can manage tags"
  ON tags FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
    )
  );

-- Entity Tags
ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view company entity tags"
  ON entity_tags FOR SELECT
  USING (
    tag_id IN (
      SELECT id FROM tags
      WHERE company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY IF NOT EXISTS "Users can manage entity tags"
  ON entity_tags FOR ALL
  USING (
    tag_id IN (
      SELECT id FROM tags
      WHERE company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Saved Filters
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage own filters"
  ON saved_filters FOR ALL
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Files
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view company files"
  ON files FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "Users can upload files"
  ON files FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
    AND uploaded_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "Users can delete own files"
  ON files FOR DELETE
  USING (
    uploaded_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- User Preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage own preferences"
  ON user_preferences FOR ALL
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- AI Price Estimates
ALTER TABLE ai_price_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view company estimates"
  ON ai_price_estimates FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "Users can create estimates"
  ON ai_price_estimates FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

-- Scheduled Reports
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins can manage scheduled reports"
  ON scheduled_reports FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Email Queue
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "System can manage email queue"
  ON email_queue FOR ALL
  USING (true);

-- ----------------------------------------------------------------------------
-- FUNCTIONS
-- ----------------------------------------------------------------------------

-- Auto-update user_preferences.updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_preferences_updated_at ON user_preferences;

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Function to get next scheduled reports
CREATE OR REPLACE FUNCTION get_next_scheduled_reports()
RETURNS TABLE (
  id UUID,
  company_id UUID,
  name TEXT,
  report_type TEXT,
  recipients TEXT[],
  filters JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id,
    sr.company_id,
    sr.name,
    sr.report_type,
    sr.recipients,
    sr.filters
  FROM scheduled_reports sr
  WHERE sr.is_active = true
  AND sr.next_send_at <= NOW()
  ORDER BY sr.next_send_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate next send time
CREATE OR REPLACE FUNCTION calculate_next_send_time(
  p_frequency TEXT,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER,
  p_time_of_day TIME
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  next_time TIMESTAMP WITH TIME ZONE;
  current_time TIMESTAMP WITH TIME ZONE;
BEGIN
  current_time := NOW();

  IF p_frequency = 'daily' THEN
    next_time := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE;
  ELSIF p_frequency = 'weekly' THEN
    next_time := (CURRENT_DATE + INTERVAL '7 days')::TIMESTAMP WITH TIME ZONE;
  ELSIF p_frequency = 'monthly' THEN
    next_time := (CURRENT_DATE + INTERVAL '1 month')::TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Set time of day
  IF p_time_of_day IS NOT NULL THEN
    next_time := next_time + p_time_of_day;
  END IF;

  RETURN next_time;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- NOTES:
-- 1. Run this migration in Supabase SQL Editor
-- 2. For Realtime, manually enable publications in Dashboard:
--    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
--    ALTER PUBLICATION supabase_realtime ADD TABLE inventory;
--    ALTER PUBLICATION supabase_realtime ADD TABLE time_logs;
--    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- 3. Create Storage buckets manually in Dashboard:
--    - company-files
--    - order-attachments
--    - inventory-images
--    - user-avatars
-- 4. Add environment variables for:
--    - OPENAI_API_KEY
--    - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
