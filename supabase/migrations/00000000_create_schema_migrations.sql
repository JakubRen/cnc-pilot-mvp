-- Migration Tracking System
-- This table tracks which migrations have been applied
-- Run this FIRST before any other migrations

-- Create schema_migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id serial PRIMARY KEY,
  migration_name text NOT NULL UNIQUE,
  applied_at timestamptz DEFAULT now(),
  checksum text,
  execution_time_ms integer,
  success boolean DEFAULT true,
  error_message text
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_name
  ON schema_migrations(migration_name);

-- Insert this migration itself
INSERT INTO schema_migrations (migration_name, success)
VALUES ('00000000_create_schema_migrations.sql', true)
ON CONFLICT (migration_name) DO NOTHING;

-- Verification
SELECT
  migration_name,
  applied_at,
  success
FROM schema_migrations
ORDER BY applied_at DESC
LIMIT 5;
