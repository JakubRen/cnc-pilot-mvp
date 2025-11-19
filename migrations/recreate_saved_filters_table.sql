-- NUCLEAR OPTION: Recreate saved_filters table correctly
-- This ensures all columns exist and have correct types
-- WARNING: This deletes existing saved filters (acceptable for new feature)

-- 1. Drop table completely
DROP TABLE IF EXISTS saved_filters CASCADE;

-- 2. Recreate with ALL columns
CREATE TABLE saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE, -- Can be NULL for system filters
  name TEXT NOT NULL,
  filter_type TEXT NOT NULL CHECK (filter_type IN ('order', 'inventory')),
  filter_config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Indexes
CREATE INDEX idx_saved_filters_company_id ON saved_filters(company_id);
CREATE INDEX idx_saved_filters_user_id ON saved_filters(user_id);
CREATE INDEX idx_saved_filters_filter_type ON saved_filters(filter_type);

-- 4. Enable RLS & Policies
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own filters or company defaults"
  ON saved_filters FOR SELECT
  USING (
    (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
    OR
    (is_default = true AND company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid()))
  );

CREATE POLICY "Users can manage own filters"
  ON saved_filters FOR ALL
  USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- 5. Seed Default Filters for ALL Companies
INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'Pilne zamówienia (3 dni)',
  'order',
  '{"status": "all", "deadline": "urgent", "search": "", "sortBy": "deadline", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies;

INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'Opóźnione zamówienia',
  'order',
  '{"status": "all", "deadline": "overdue", "search": "", "sortBy": "deadline", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies;

INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'W trakcie realizacji',
  'order',
  '{"status": "in_progress", "deadline": "all", "search": "", "sortBy": "deadline", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies;

INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'Niski stan magazynowy',
  'inventory',
  '{"category": "all", "stockStatus": "low", "search": "", "sortBy": "quantity_asc", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies;

INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'Wyczerpany zapas',
  'inventory',
  '{"category": "all", "stockStatus": "out", "search": "", "sortBy": "name", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies;

SELECT count(*) as created_filters FROM saved_filters;
