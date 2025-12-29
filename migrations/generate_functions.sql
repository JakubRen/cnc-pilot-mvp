-- =========================================
-- WYCIĄGNIJ WSZYSTKIE FUNKCJE Z PROD
-- =========================================
-- Uruchom to w PROD SQL Editor
-- Skopiuj OUTPUT i zapisz do TEST_SCHEMA_FUNCTIONS.sql
-- Potem uruchom ten plik w TEST
-- =========================================

SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prokind = 'f'
  AND proname NOT LIKE 'gtrgm%'
  AND proname NOT LIKE 'gin_%'
  AND proname NOT LIKE 'similarity%'
  AND proname NOT LIKE 'show_trgm%'
  AND proname NOT LIKE 'set_limit%'
  AND proname NOT LIKE 'show_limit%'
ORDER BY proname;
