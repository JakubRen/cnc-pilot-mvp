-- FIX: Add missing columns AND fix user_id constraint
-- This migration handles EVERYTHING in one go

DO $$
BEGIN
    -- 1. Add filter_type column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'saved_filters' AND column_name = 'filter_type'
    ) THEN
        ALTER TABLE saved_filters
        ADD COLUMN filter_type TEXT NOT NULL DEFAULT 'order';

        -- Add constraint
        ALTER TABLE saved_filters
        ADD CONSTRAINT filter_type_check
        CHECK (filter_type IN ('order', 'inventory'));
    END IF;

    -- 2. Add filter_config column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'saved_filters' AND column_name = 'filter_config'
    ) THEN
        ALTER TABLE saved_filters
        ADD COLUMN filter_config JSONB NOT NULL DEFAULT '{}';
    END IF;

    -- 3. Add is_default column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'saved_filters' AND column_name = 'is_default'
    ) THEN
        ALTER TABLE saved_filters
        ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
    END IF;

    -- 4. Allow user_id to be NULL (for system filters)
    ALTER TABLE saved_filters ALTER COLUMN user_id DROP NOT NULL;
END $$;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_filters_filter_type ON saved_filters(filter_type);
CREATE INDEX IF NOT EXISTS idx_saved_filters_is_default ON saved_filters(is_default);

-- 6. Insert Default Filters
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
  WHERE name = 'Pilne zamówienia (3 dni)' AND filter_type = 'order' AND is_default = true AND company_id = companies.id
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
  WHERE name = 'Opóźnione zamówienia' AND filter_type = 'order' AND is_default = true AND company_id = companies.id
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
  WHERE name = 'W trakcie realizacji' AND filter_type = 'order' AND is_default = true AND company_id = companies.id
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
  WHERE name = 'Niski stan magazynowy' AND filter_type = 'inventory' AND is_default = true AND company_id = companies.id
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
  WHERE name = 'Wyczerpany zapas' AND filter_type = 'inventory' AND is_default = true AND company_id = companies.id
);

-- 7. Update RLS
DROP POLICY IF EXISTS "Users can view own filters or company defaults" ON saved_filters;

CREATE POLICY "Users can view own filters or company defaults"
  ON saved_filters FOR SELECT
  USING (
    (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
    OR
    (is_default = true AND company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid()))
  );
