-- =========================================
-- WYCIĄGNIJ DROP STATEMENTS DLA POLICIES
-- =========================================
-- Uruchom to w PROD SQL Editor
-- Skopiuj OUTPUT i zapisz do TEST_DROP_POLICIES.sql
-- =========================================

SELECT
  'DROP POLICY IF EXISTS ' || quote_ident(policyname) ||
  ' ON ' || quote_ident(schemaname) || '.' || quote_ident(tablename) || ';' as drop_statement
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
