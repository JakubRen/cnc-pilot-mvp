ALTER TABLE saved_filters ALTER COLUMN user_id DROP NOT NULL;

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

DROP POLICY IF EXISTS "Users can view own filters or company defaults" ON saved_filters;

CREATE POLICY "Users can view own filters or company defaults"
  ON saved_filters FOR SELECT
  USING (
    (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
    OR
    (is_default = true AND company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid()))
  );
