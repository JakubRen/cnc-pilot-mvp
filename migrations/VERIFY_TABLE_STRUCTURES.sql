-- ============================================
-- TABLE STRUCTURE VERIFICATION
-- Run this FIRST in Supabase to see actual column names
-- ============================================

-- This query will show ALL columns for tables used in security fix
-- Copy the output and use it to fix the migration

-- ============================================
-- TABLE 1: users
-- ============================================
SELECT
  'users' AS table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- TABLE 2: audit_logs
-- ============================================
SELECT
  'audit_logs' AS table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- ============================================
-- TABLE 3: external_operations
-- ============================================
SELECT
  'external_operations' AS table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'external_operations'
ORDER BY ordinal_position;

-- ============================================
-- TABLE 4: orders
-- ============================================
SELECT
  'orders' AS table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- ============================================
-- TABLE 5: machines
-- ============================================
SELECT
  'machines' AS table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'machines'
ORDER BY ordinal_position;

-- ============================================
-- TABLE 6: email_notifications
-- ============================================
SELECT
  'email_notifications' AS table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'email_notifications'
ORDER BY ordinal_position;

-- ============================================
-- TABLE 7: cooperants (if exists)
-- ============================================
SELECT
  'cooperants' AS table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cooperants'
ORDER BY ordinal_position;

-- ============================================
-- SUMMARY: Show which tables exist
-- ============================================
SELECT
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'users',
    'audit_logs',
    'external_operations',
    'orders',
    'machines',
    'email_notifications',
    'cooperants'
  )
GROUP BY table_name
ORDER BY table_name;

-- ============================================
-- INSTRUCTIONS:
-- ============================================
-- 1. Run this query in Supabase SQL Editor
-- 2. Copy ALL output
-- 3. Paste results here (as comment or separate file)
-- 4. I will use this to create CORRECT migration
-- ============================================
