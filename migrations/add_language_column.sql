-- Migration: Add language column to users table
-- Date: 2025-11-25
-- Description: Stores user's preferred language (pl/en)

-- Add language column with default 'pl'
ALTER TABLE users
ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'pl' NOT NULL;

-- Add check constraint for valid languages
ALTER TABLE users
ADD CONSTRAINT check_language
CHECK (language IN ('pl', 'en'));

-- Comment
COMMENT ON COLUMN users.language IS 'User preferred language: pl (Polish) or en (English)';
