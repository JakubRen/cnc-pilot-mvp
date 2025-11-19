-- FIX: Add missing columns to saved_filters table
-- This migration safely adds missing columns without losing existing data

-- Dodaj brakujące kolumny jeśli nie istnieją
DO $$
BEGIN
    -- Dodaj company_id jeśli nie istnieje
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'saved_filters' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE saved_filters
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    -- Dodaj user_id jeśli nie istnieje
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'saved_filters' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE saved_filters
        ADD COLUMN user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Dodaj filter_type jeśli nie istnieje
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'saved_filters' AND column_name = 'filter_type'
    ) THEN
        ALTER TABLE saved_filters
        ADD COLUMN filter_type TEXT NOT NULL DEFAULT 'order';

        -- Dodaj constraint
        ALTER TABLE saved_filters
        ADD CONSTRAINT filter_type_check
        CHECK (filter_type IN ('order', 'inventory'));
    END IF;

    -- Dodaj filter_config jeśli nie istnieje
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'saved_filters' AND column_name = 'filter_config'
    ) THEN
        ALTER TABLE saved_filters
        ADD COLUMN filter_config JSONB NOT NULL DEFAULT '{}';
    END IF;

    -- Dodaj is_default jeśli nie istnieje
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'saved_filters' AND column_name = 'is_default'
    ) THEN
        ALTER TABLE saved_filters
        ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
    END IF;

    -- Dodaj created_at jeśli nie istnieje
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'saved_filters' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE saved_filters
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Dodaj updated_at jeśli nie istnieje
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'saved_filters' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE saved_filters
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create indexes (skip if exist)
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id ON saved_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_company_id ON saved_filters(company_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_filter_type ON saved_filters(filter_type);
CREATE INDEX IF NOT EXISTS idx_saved_filters_is_default ON saved_filters(is_default);

-- Enable RLS
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own filters or company defaults" ON saved_filters;
DROP POLICY IF EXISTS "Users can create own filters" ON saved_filters;
DROP POLICY IF EXISTS "Users can update own filters" ON saved_filters;
DROP POLICY IF EXISTS "Users can delete own filters" ON saved_filters;

-- Create RLS policies
CREATE POLICY "Users can view own filters or company defaults"
  ON saved_filters FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR (is_default = true AND company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid()))
  );

CREATE POLICY "Users can create own filters"
  ON saved_filters FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can update own filters"
  ON saved_filters FOR UPDATE
  USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND is_default = false
  );

CREATE POLICY "Users can delete own filters"
  ON saved_filters FOR DELETE
  USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND is_default = false
  );

-- Insert default filters
INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'Pilne zamówienia (3 dni)',
  'order',
  '{"status": "all", "deadline": "urgent", "search": "", "sortBy": "deadline", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM saved_filters
  WHERE name = 'Pilne zamówienia (3 dni)' AND filter_type = 'order' AND is_default = true
);

INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'Opóźnione zamówienia',
  'order',
  '{"status": "all", "deadline": "overdue", "search": "", "sortBy": "deadline", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM saved_filters
  WHERE name = 'Opóźnione zamówienia' AND filter_type = 'order' AND is_default = true
);

INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'W trakcie realizacji',
  'order',
  '{"status": "in_progress", "deadline": "all", "search": "", "sortBy": "deadline", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM saved_filters
  WHERE name = 'W trakcie realizacji' AND filter_type = 'order' AND is_default = true
);

INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'Niski stan magazynowy',
  'inventory',
  '{"category": "all", "stockStatus": "low", "search": "", "sortBy": "quantity_asc", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM saved_filters
  WHERE name = 'Niski stan magazynowy' AND filter_type = 'inventory' AND is_default = true
);

INSERT INTO saved_filters (name, filter_type, filter_config, is_default, company_id, user_id)
SELECT
  'Wyczerpany zapas',
  'inventory',
  '{"category": "all", "stockStatus": "out", "search": "", "sortBy": "name", "tagIds": [], "tagLogic": "OR"}'::jsonb,
  true,
  id,
  NULL
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM saved_filters
  WHERE name = 'Wyczerpany zapas' AND filter_type = 'inventory' AND is_default = true
);

-- Weryfikacja
SELECT 'Migration completed successfully!' as status;
SELECT filter_type, COUNT(*) as count
FROM saved_filters
WHERE is_default = true
GROUP BY filter_type;
