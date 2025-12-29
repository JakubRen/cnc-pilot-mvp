-- =========================================
-- WYCIĄGNIJ WSZYSTKIE TRIGGERY
-- =========================================
-- Uruchom to w PROD SQL Editor
-- Skopiuj OUTPUT i zapisz do TEST_SCHEMA_TRIGGERS.sql
-- =========================================

SELECT
  'CREATE TRIGGER ' || quote_ident(trigger_name) ||
  E'\n  ' || CASE WHEN action_timing = 'BEFORE' THEN 'BEFORE' ELSE 'AFTER' END ||
  ' ' || string_agg(event_manipulation, ' OR ' ORDER BY event_manipulation) ||
  E'\n  ON ' || event_object_schema || '.' || event_object_table ||
  E'\n  FOR EACH ' || CASE WHEN action_orientation = 'ROW' THEN 'ROW' ELSE 'STATEMENT' END ||
  E'\n  EXECUTE FUNCTION ' || action_statement || ';' as trigger_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name NOT LIKE 'pg_%'
GROUP BY trigger_name, action_timing, event_object_schema, event_object_table, action_orientation, action_statement
ORDER BY event_object_table, trigger_name;
