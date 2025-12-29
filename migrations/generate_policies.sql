-- =========================================
-- WYCIĄGNIJ WSZYSTKIE RLS POLICIES
-- =========================================
-- Uruchom to w PROD SQL Editor
-- Skopiuj OUTPUT i zapisz do TEST_SCHEMA_POLICIES.sql
-- =========================================

SELECT
  'CREATE POLICY ' || quote_ident(policyname) ||
  ' ON ' || quote_ident(schemaname) || '.' || quote_ident(tablename) ||
  ' AS PERMISSIVE' ||
  ' FOR ' || cmd ||
  CASE WHEN roles IS NOT NULL THEN ' TO ' || array_to_string(roles, ', ') ELSE '' END ||
  CASE WHEN qual IS NOT NULL THEN E'\n  USING (' || qual || ')' ELSE '' END ||
  CASE WHEN with_check IS NOT NULL THEN E'\n  WITH CHECK (' || with_check || ')' ELSE '' END ||
  ';' as policy_statement
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
