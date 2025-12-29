-- =========================================
-- DUMP SCHEMA FROM PROD TO TEST
-- =========================================
-- Run this query on PROD database
-- Copy the output and run it on TEST database
-- =========================================

-- Get all table definitions
SELECT
  'CREATE TABLE IF NOT EXISTS ' ||
  schemaname || '.' || tablename || E' (\n  ' ||
  string_agg(
    column_name || ' ' ||
    CASE
      WHEN data_type = 'USER-DEFINED' THEN udt_name
      WHEN character_maximum_length IS NOT NULL THEN data_type || '(' || character_maximum_length || ')'
      WHEN numeric_precision IS NOT NULL THEN data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
      ELSE data_type
    END ||
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
    E',\n  '
  ) || E'\n);'
FROM information_schema.columns c
WHERE table_schema = 'public'
  AND table_name IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;
