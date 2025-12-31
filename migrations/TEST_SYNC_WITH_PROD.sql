-- ============================================================================
-- TEST DATABASE - SYNC WITH PROD SCHEMA
-- Adds ALL missing tables and columns to match PROD database
-- Run ONCE in Supabase SQL Editor: https://app.supabase.com/project/vvetjctdjswgwebhgbpd/sql/new
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add interface_mode to users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'interface_mode') THEN
        ALTER TABLE users ADD COLUMN interface_mode TEXT DEFAULT 'full_access'
            CHECK (interface_mode IN ('kiosk_only', 'full_access', 'both'));
    END IF;
END $$;

-- Set default based on role
UPDATE users SET interface_mode = 'both' WHERE role = 'operator' AND interface_mode IS NULL;
UPDATE users SET interface_mode = 'full_access' WHERE interface_mode IS NULL;

COMMENT ON COLUMN users.interface_mode IS 'Controls UI mode: kiosk_only (only /kiosk), full_access (full app), both (with toggle)';

-- ============================================================================
-- 2. CREATE PERMISSION SYSTEM TABLES
-- ============================================================================

-- permission_definitions (słownik uprawnień)
CREATE TABLE IF NOT EXISTS permission_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  name_pl TEXT NOT NULL,
  description_pl TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_definitions_module ON permission_definitions(module);
CREATE INDEX IF NOT EXISTS idx_permission_definitions_code ON permission_definitions(code);

-- role_permissions (domyślne uprawnienia dla ról)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  permission_code TEXT NOT NULL REFERENCES permission_definitions(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

-- user_permissions (nadpisania uprawnień per user)
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES permission_definitions(code) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY FOR PERMISSION TABLES
-- ============================================================================

-- RLS dla permission_definitions (publiczny odczyt)
ALTER TABLE permission_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view permission definitions" ON permission_definitions;
CREATE POLICY "Anyone can view permission definitions"
  ON permission_definitions FOR SELECT USING (true);

-- RLS dla role_permissions (publiczny odczyt)
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view role permissions" ON role_permissions;
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions FOR SELECT USING (true);

-- RLS dla user_permissions (tylko w obrębie firmy)
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view permissions in their company" ON user_permissions;
CREATE POLICY "Users can view permissions in their company"
  ON user_permissions FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE company_id = (
        SELECT company_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admins can manage user permissions" ON user_permissions;
CREATE POLICY "Admins can manage user permissions"
  ON user_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 4. INSERT PERMISSION DEFINITIONS
-- ============================================================================

INSERT INTO permission_definitions (code, module, action, name_pl, description_pl) VALUES
-- Dashboard
('dashboard:access', 'dashboard', 'access', 'Dostęp do Dashboard', 'Możliwość wejścia na stronę główną'),
('dashboard:edit', 'dashboard', 'edit', 'Edycja Dashboard', 'Możliwość edycji ustawień dashboard'),
('dashboard:prices', 'dashboard', 'prices', 'Finanse na Dashboard', 'Widok przychodów i danych finansowych'),

-- Orders (Zamówienia)
('orders:access', 'orders', 'access', 'Dostęp do Zamówień', 'Możliwość przeglądania zamówień'),
('orders:prices', 'orders', 'prices', 'Ceny w Zamówieniach', 'Widok kosztów zamówień'),
('orders:create', 'orders', 'create', 'Tworzenie Zamówień', 'Możliwość dodawania nowych zamówień'),
('orders:edit', 'orders', 'edit', 'Edycja Zamówień', 'Możliwość edytowania zamówień'),
('orders:delete', 'orders', 'delete', 'Usuwanie Zamówień', 'Możliwość usuwania zamówień'),

-- Inventory (Magazyn)
('inventory:access', 'inventory', 'access', 'Dostęp do Magazynu', 'Możliwość przeglądania stanów magazynowych'),
('inventory:prices', 'inventory', 'prices', 'Ceny w Magazynie', 'Widok wartości magazynu i cen jednostkowych'),
('inventory:create', 'inventory', 'create', 'Dodawanie do Magazynu', 'Możliwość dodawania nowych pozycji'),
('inventory:edit', 'inventory', 'edit', 'Edycja Magazynu', 'Możliwość edytowania pozycji'),
('inventory:delete', 'inventory', 'delete', 'Usuwanie z Magazynu', 'Możliwość usuwania pozycji'),

-- Documents (Dokumenty)
('documents:access', 'documents', 'access', 'Dostęp do Dokumentów', 'Przeglądanie dokumentów'),
('documents:create', 'documents', 'create', 'Tworzenie Dokumentów', 'Dodawanie dokumentów'),
('documents:edit', 'documents', 'edit', 'Edycja Dokumentów', 'Edycja dokumentów'),
('documents:delete', 'documents', 'delete', 'Usuwanie Dokumentów', 'Usuwanie dokumentów'),

-- Files (Pliki)
('files:access', 'files', 'access', 'Dostęp do Plików', 'Przeglądanie plików'),
('files:upload', 'files', 'upload', 'Wysyłanie Plików', 'Możliwość przesyłania plików'),
('files:delete', 'files', 'delete', 'Usuwanie Plików', 'Usuwanie plików'),

-- Time-Tracking (Czas pracy)
('time-tracking:access', 'time-tracking', 'access', 'Dostęp do Czasu Pracy', 'Przeglądanie wpisów czasu'),
('time-tracking:prices', 'time-tracking', 'prices', 'Koszty w Czasie Pracy', 'Widok stawek godzinowych i kosztów'),
('time-tracking:create', 'time-tracking', 'create', 'Dodawanie Czasu Pracy', 'Dodawanie wpisów czasu'),
('time-tracking:edit', 'time-tracking', 'edit', 'Edycja Czasu Pracy', 'Edycja wpisów czasu'),
('time-tracking:delete', 'time-tracking', 'delete', 'Usuwanie Czasu Pracy', 'Usuwanie wpisów'),

-- Reports (Raporty)
('reports:access', 'reports', 'access', 'Dostęp do Raportów', 'Przeglądanie raportów'),
('reports:prices', 'reports', 'prices', 'Dane Finansowe w Raportach', 'Dostęp do raportów finansowych'),
('reports:export', 'reports', 'export', 'Eksport Raportów', 'Możliwość eksportowania raportów'),

-- Tags (Tagi)
('tags:access', 'tags', 'access', 'Dostęp do Tagów', 'Przeglądanie tagów'),
('tags:create', 'tags', 'create', 'Tworzenie Tagów', 'Dodawanie nowych tagów'),
('tags:edit', 'tags', 'edit', 'Edycja Tagów', 'Edycja i zarządzanie tagami'),
('tags:delete', 'tags', 'delete', 'Usuwanie Tagów', 'Usuwanie tagów'),

-- Users (Użytkownicy)
('users:access', 'users', 'access', 'Dostęp do Użytkowników', 'Lista użytkowników'),
('users:create', 'users', 'create', 'Dodawanie Użytkowników', 'Zapraszanie nowych użytkowników'),
('users:edit', 'users', 'edit', 'Edycja Użytkowników', 'Edycja danych użytkowników'),
('users:delete', 'users', 'delete', 'Usuwanie Użytkowników', 'Usuwanie użytkowników'),
('users:permissions', 'users', 'permissions', 'Zarządzanie Uprawnieniami', 'Konfiguracja uprawnień użytkowników')

ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 5. INSERT DEFAULT ROLE PERMISSIONS
-- ============================================================================

-- Wyczyść stare (jeśli re-run)
DELETE FROM role_permissions;

-- OWNER - pełny dostęp do wszystkiego
INSERT INTO role_permissions (role, permission_code)
SELECT 'owner', code FROM permission_definitions;

-- ADMIN - wszystko oprócz usuwania użytkowników
INSERT INTO role_permissions (role, permission_code)
SELECT 'admin', code FROM permission_definitions
WHERE code != 'users:delete';

-- MANAGER - zarządzanie operacjami, bez zarządzania użytkownikami (tylko podgląd)
INSERT INTO role_permissions (role, permission_code)
SELECT 'manager', code FROM permission_definitions
WHERE module NOT IN ('users')
   OR code = 'users:access';

-- OPERATOR - podstawowe operacje + czas pracy (BEZ CEN!)
INSERT INTO role_permissions (role, permission_code) VALUES
('operator', 'dashboard:access'),
('operator', 'orders:access'),
('operator', 'orders:create'),
('operator', 'orders:edit'),
('operator', 'time-tracking:access'),
('operator', 'time-tracking:create'),
('operator', 'time-tracking:edit'),
('operator', 'tags:access'),
('operator', 'files:access'),
('operator', 'files:upload');

-- VIEWER - tylko odczyt (bez cen, bez time-tracking)
INSERT INTO role_permissions (role, permission_code) VALUES
('viewer', 'dashboard:access'),
('viewer', 'orders:access'),
('viewer', 'inventory:access'),
('viewer', 'documents:access'),
('viewer', 'files:access'),
('viewer', 'tags:access');

-- ============================================================================
-- 6. CREATE HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION has_permission(
  p_user_id BIGINT,
  p_permission_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_override BOOLEAN;
  v_role_has BOOLEAN;
BEGIN
  -- Pobierz rolę użytkownika
  SELECT role INTO v_user_role FROM users WHERE id = p_user_id;

  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Sprawdź nadpisanie dla użytkownika
  SELECT granted INTO v_override
  FROM user_permissions
  WHERE user_id = p_user_id AND permission_code = p_permission_code;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  -- Sprawdź domyślne uprawnienie roli
  SELECT EXISTS(
    SELECT 1 FROM role_permissions
    WHERE role = v_user_role AND permission_code = p_permission_code
  ) INTO v_role_has;

  RETURN v_role_has;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. VERIFICATION
-- ============================================================================

SELECT '✅ TEST DATABASE SYNCED WITH PROD!' AS status;

-- Check tables exist
SELECT 'Permissions system tables:' AS info;
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('permission_definitions', 'role_permissions', 'user_permissions')
ORDER BY table_name;

-- Check interface_mode column
SELECT 'interface_mode column:' AS info;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'interface_mode';

-- Check permission counts
SELECT 'Permission definitions count:' AS info, COUNT(*) FROM permission_definitions;
SELECT 'Role permissions by role:' AS info;
SELECT role, COUNT(*) as permissions_count FROM role_permissions GROUP BY role ORDER BY role;

-- ============================================================================
-- DONE! Now test login and dashboard access
-- ============================================================================
