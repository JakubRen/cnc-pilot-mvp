-- =========================================
-- PEŁNY DUMP SCHEMATU Z PROD
-- =========================================
-- Uruchom to w PROD SQL Editor
-- Skopiuj OUTPUT i zapisz do pliku
-- Potem uruchom ten plik w TEST
-- =========================================

-- CZĘŚĆ 1: TABLES (pełne definicje z typami, constraints, defaults)
SELECT
  'CREATE TABLE IF NOT EXISTS ' || c.table_name || ' (' || E'\n  ' ||
  string_agg(
    c.column_name || ' ' ||
    CASE
      WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
      WHEN c.data_type = 'ARRAY' THEN
        CASE
          WHEN c.udt_name = '_text' THEN 'TEXT[]'
          WHEN c.udt_name = '_int4' THEN 'INTEGER[]'
          WHEN c.udt_name = '_int8' THEN 'BIGINT[]'
          WHEN c.udt_name = '_uuid' THEN 'UUID[]'
          ELSE c.udt_name
        END
      WHEN c.data_type IN ('character varying', 'varchar') AND c.character_maximum_length IS NOT NULL
        THEN 'VARCHAR(' || c.character_maximum_length || ')'
      WHEN c.data_type = 'numeric' AND c.numeric_precision IS NOT NULL
        THEN 'NUMERIC(' || c.numeric_precision || ',' || COALESCE(c.numeric_scale, 0) || ')'
      ELSE UPPER(c.data_type)
    END ||
    CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE
      WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default
      ELSE ''
    END,
    ',' || E'\n  '
    ORDER BY c.ordinal_position
  ) || E'\n);' || E'\n'
FROM information_schema.columns c
WHERE c.table_schema = 'public'
GROUP BY c.table_name
ORDER BY c.table_name;

-- CZĘŚĆ 2: PRIMARY KEYS
SELECT E'\n-- PRIMARY KEYS\n' || string_agg(
  'ALTER TABLE ' || tc.table_name ||
  ' ADD CONSTRAINT ' || tc.constraint_name ||
  ' PRIMARY KEY (' || string_agg(kcu.column_name, ', ') || ');',
  E'\n'
)
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name;

-- CZĘŚĆ 3: FOREIGN KEYS
SELECT E'\n-- FOREIGN KEYS\n' || string_agg(
  'ALTER TABLE ' || tc.table_name ||
  ' ADD CONSTRAINT ' || tc.constraint_name ||
  ' FOREIGN KEY (' || kcu.column_name || ')' ||
  ' REFERENCES ' || ccu.table_name || ' (' || ccu.column_name || ')' ||
  CASE
    WHEN rc.delete_rule = 'CASCADE' THEN ' ON DELETE CASCADE'
    WHEN rc.delete_rule = 'SET NULL' THEN ' ON DELETE SET NULL'
    ELSE ''
  END || ';',
  E'\n'
)
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';

-- CZĘŚĆ 4: INDEXES
SELECT E'\n-- INDEXES\n' || string_agg(
  'CREATE INDEX IF NOT EXISTS ' || indexname ||
  ' ON ' || tablename ||
  ' USING ' || COALESCE(indexdef::text, 'btree') || ';',
  E'\n'
)
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey';

-- CZĘŚĆ 5: RLS POLICIES
SELECT E'\n-- ROW LEVEL SECURITY POLICIES\n' || string_agg(
  'ALTER TABLE ' || tablename || ' ENABLE ROW LEVEL SECURITY;' || E'\n' ||
  'CREATE POLICY ' || policyname ||
  ' ON ' || tablename ||
  ' FOR ' || cmd ||
  CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END ||
  CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END ||
  ';',
  E'\n'
)
FROM pg_policies
WHERE schemaname = 'public';
