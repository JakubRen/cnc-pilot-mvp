-- Create saved_filters table for storing user filter presets
CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filter_type TEXT NOT NULL CHECK (filter_type IN ('order', 'inventory')),
  filter_config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_saved_filters_user_id ON saved_filters(user_id);
CREATE INDEX idx_saved_filters_company_id ON saved_filters(company_id);
CREATE INDEX idx_saved_filters_filter_type ON saved_filters(filter_type);
CREATE INDEX idx_saved_filters_is_default ON saved_filters(is_default);

-- Enable RLS
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own filters OR default filters from their company
CREATE POLICY "Users can view own filters or company defaults"
  ON saved_filters
  FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR (is_default = true AND company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid()))
  );

-- RLS Policy: Users can insert their own filters
CREATE POLICY "Users can create own filters"
  ON saved_filters
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

-- RLS Policy: Users can update their own filters (not defaults)
CREATE POLICY "Users can update own filters"
  ON saved_filters
  FOR UPDATE
  USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND is_default = false
  );

-- RLS Policy: Users can delete their own filters (not defaults)
CREATE POLICY "Users can delete own filters"
  ON saved_filters
  FOR DELETE
  USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND is_default = false
  );

-- Insert default filters for orders
INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'Pilne zamówienia (3 dni)',
  'order',
  '{"status": "all", "deadline": "urgent", "search": "", "sortBy": "deadline", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies
ON CONFLICT DO NOTHING;

INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'Opóźnione zamówienia',
  'order',
  '{"status": "all", "deadline": "overdue", "search": "", "sortBy": "deadline", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies
ON CONFLICT DO NOTHING;

INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'W trakcie realizacji',
  'order',
  '{"status": "in_progress", "deadline": "all", "search": "", "sortBy": "deadline", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies
ON CONFLICT DO NOTHING;

-- Insert default filters for inventory
INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'Niski stan magazynowy',
  'inventory',
  '{"category": "all", "stockStatus": "low", "search": "", "sortBy": "quantity_asc", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies
ON CONFLICT DO NOTHING;

INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'Wyczerpany zapas',
  'inventory',
  '{"category": "all", "stockStatus": "out", "search": "", "sortBy": "name", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE saved_filters IS 'Stores user-defined filter presets for orders and inventory';
