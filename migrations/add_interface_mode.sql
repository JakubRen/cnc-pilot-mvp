-- migrations/add_interface_mode.sql
-- Adds interface_mode column to users table
-- Controls what view an employee sees: kiosk_only, full_access, or both

-- 1. Add interface_mode column to users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'interface_mode') THEN
        ALTER TABLE users ADD COLUMN interface_mode TEXT DEFAULT 'full_access'
            CHECK (interface_mode IN ('kiosk_only', 'full_access', 'both'));
    END IF;
END $$;

-- 2. Set default based on role (operators default to 'both', others to 'full_access')
UPDATE users SET interface_mode = 'both' WHERE role = 'operator' AND interface_mode IS NULL;
UPDATE users SET interface_mode = 'full_access' WHERE interface_mode IS NULL;

-- 3. Add comment for documentation
COMMENT ON COLUMN users.interface_mode IS 'Controls UI mode: kiosk_only (only /kiosk), full_access (full app), both (with toggle)';
