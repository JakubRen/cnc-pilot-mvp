-- ============================================================================
-- DROP ALL TABLES - TEST DATABASE RESET
-- Run this in Supabase SQL Editor to start fresh
-- ============================================================================

-- Drop tables in correct order (reverse of creation - respect foreign keys)

DROP TABLE IF EXISTS operations CASCADE;
DROP TABLE IF EXISTS production_plans CASCADE;
DROP TABLE IF EXISTS time_logs CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS company_email_domains CASCADE;
DROP TABLE IF EXISTS blocked_email_domains CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Drop any remaining functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS calculate_time_log_cost() CASCADE;
DROP FUNCTION IF EXISTS check_single_active_timer() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS extract_domain_from_email(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_domain_blocked(TEXT) CASCADE;

-- Verify - should return empty
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- Success message
SELECT 'TEST DATABASE CLEANED - Ready for fresh migrations' AS status;
