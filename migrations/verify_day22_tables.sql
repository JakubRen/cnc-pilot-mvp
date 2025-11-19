-- VERIFICATION SCRIPT
-- Run this to ensure ALL Day 22 tables exist correctly.
-- It is safe to run multiple times (IF NOT EXISTS).

-- 1. Verify TAGS
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- 2. Verify ENTITY TAGS
CREATE TABLE IF NOT EXISTS entity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'inventory', 'document', 'user')),
  entity_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tag_id, entity_type, entity_id)
);

-- 3. Verify FILES
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT CHECK (entity_type IN ('order', 'inventory', 'document', 'user', 'company')),
  entity_id TEXT,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Verify USER PREFERENCES
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'pl' CHECK (language IN ('pl', 'en')),
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  dashboard_layout JSONB,
  preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (safe to run if already enabled)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Verify Policies (Drop and Recreate to ensure correctness)

-- TAGS
DROP POLICY IF EXISTS "Users can view company tags" ON tags;
CREATE POLICY "Users can view company tags" ON tags FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage tags" ON tags;
CREATE POLICY "Admins can manage tags" ON tags FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- ENTITY TAGS
DROP POLICY IF EXISTS "Users can view entity tags" ON entity_tags;
CREATE POLICY "Users can view entity tags" ON entity_tags FOR SELECT USING (tag_id IN (SELECT id FROM tags WHERE company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())));

DROP POLICY IF EXISTS "Users can manage entity tags" ON entity_tags;
CREATE POLICY "Users can manage entity tags" ON entity_tags FOR ALL USING (tag_id IN (SELECT id FROM tags WHERE company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())));

-- FILES
DROP POLICY IF EXISTS "View company files" ON files;
CREATE POLICY "View company files" ON files FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Upload files" ON files;
CREATE POLICY "Upload files" ON files FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own files" ON files;
CREATE POLICY "Users can delete own files" ON files FOR DELETE USING (uploaded_by IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- PREFERENCES
DROP POLICY IF EXISTS "Manage own preferences" ON user_preferences;
CREATE POLICY "Manage own preferences" ON user_preferences FOR ALL USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));


SELECT 'All Day 22 tables verified!' as status;
