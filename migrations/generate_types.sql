-- =========================================
-- WYCIĄGNIJ WSZYSTKIE CUSTOM TYPES (ENUMs)
-- =========================================
-- Uruchom to w PROD SQL Editor
-- Skopiuj OUTPUT i zapisz do TEST_SCHEMA_TYPES.sql
-- =========================================

SELECT
  'CREATE TYPE ' || n.nspname || '.' || t.typname || ' AS ENUM (' ||
  string_agg('''' || e.enumlabel || '''', ', ' ORDER BY e.enumsortorder) ||
  ');' as create_statement
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY n.nspname, t.typname
ORDER BY t.typname;
