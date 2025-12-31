-- ============================================================================
-- TEST DATABASE - IMPORT FROM PROD SCHEMA
-- Takes only MISSING tables from PROD export (leaves existing data intact)
-- ============================================================================

-- Add interface_mode to users (already exists in TEST)
ALTER TABLE users ADD COLUMN IF NOT EXISTS interface_mode text DEFAULT 'full_access'::text
  CHECK (interface_mode = ANY (ARRAY['kiosk_only'::text, 'full_access'::text, 'both'::text]));

-- ============================================================================
-- PERMISSION SYSTEM TABLES (MISSING IN TEST)
-- ============================================================================

CREATE TABLE IF NOT EXISTS permission_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  module text NOT NULL,
  action text NOT NULL,
  name_pl text NOT NULL,
  description_pl text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT permission_definitions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission_code text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT role_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT role_permissions_permission_code_fkey FOREIGN KEY (permission_code) REFERENCES permission_definitions(code)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  permission_code text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  granted_by bigint,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT user_permissions_permission_code_fkey FOREIGN KEY (permission_code) REFERENCES permission_definitions(code),
  CONSTRAINT user_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE permission_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view permission definitions" ON permission_definitions;
CREATE POLICY "Anyone can view permission definitions" ON permission_definitions FOR SELECT USING (true);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view role permissions" ON role_permissions;
CREATE POLICY "Anyone can view role permissions" ON role_permissions FOR SELECT USING (true);

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view permissions in their company" ON user_permissions;
CREATE POLICY "Users can view permissions in their company" ON user_permissions FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid())));

DROP POLICY IF EXISTS "Admins can manage user permissions" ON user_permissions;
CREATE POLICY "Admins can manage user permissions" ON user_permissions FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('owner', 'admin')));

-- ============================================================================
-- INSERT PERMISSION DATA
-- ============================================================================

-- Clear old data if re-running
DELETE FROM role_permissions;
DELETE FROM permission_definitions;

-- Insert permissions
INSERT INTO permission_definitions (code, module, action, name_pl, description_pl) VALUES
('dashboard:access', 'dashboard', 'access', 'Dostęp do Dashboard', 'Możliwość wejścia na stronę główną'),
('dashboard:edit', 'dashboard', 'edit', 'Edycja Dashboard', 'Możliwość edycji ustawień dashboard'),
('orders:access', 'orders', 'access', 'Dostęp do Zamówień', 'Możliwość przeglądania zamówień'),
('orders:create', 'orders', 'create', 'Tworzenie Zamówień', 'Możliwość dodawania nowych zamówień'),
('orders:edit', 'orders', 'edit', 'Edycja Zamówień', 'Możliwość edytowania zamówień'),
('orders:delete', 'orders', 'delete', 'Usuwanie Zamówień', 'Możliwość usuwania zamówień'),
('inventory:access', 'inventory', 'access', 'Dostęp do Magazynu', 'Możliwość przeglądania stanów magazynowych'),
('inventory:create', 'inventory', 'create', 'Dodawanie do Magazynu', 'Możliwość dodawania nowych pozycji'),
('inventory:edit', 'inventory', 'edit', 'Edycja Magazynu', 'Możliwość edytowania pozycji'),
('inventory:delete', 'inventory', 'delete', 'Usuwanie z Magazynu', 'Możliwość usuwania pozycji'),
('documents:access', 'documents', 'access', 'Dostęp do Dokumentów', 'Przeglądanie dokumentów'),
('files:access', 'files', 'access', 'Dostęp do Plików', 'Przeglądanie plików'),
('time-tracking:access', 'time-tracking', 'access', 'Dostęp do Czasu Pracy', 'Przeglądanie wpisów czasu'),
('time-tracking:create', 'time-tracking', 'create', 'Dodawanie Czasu Pracy', 'Dodawanie wpisów czasu'),
('time-tracking:edit', 'time-tracking', 'edit', 'Edycja Czasu Pracy', 'Edycja wpisów czasu'),
('reports:access', 'reports', 'access', 'Dostęp do Raportów', 'Przeglądanie raportów'),
('tags:access', 'tags', 'access', 'Dostęp do Tagów', 'Przeglądanie tagów'),
('users:access', 'users', 'access', 'Dostęp do Użytkowników', 'Lista użytkowników'),
('users:edit', 'users', 'edit', 'Edycja Użytkowników', 'Edycja danych użytkowników');

-- OWNER - full access
INSERT INTO role_permissions (role, permission_code)
SELECT 'owner', code FROM permission_definitions;

-- MANAGER
INSERT INTO role_permissions (role, permission_code) VALUES
('manager', 'dashboard:access'),
('manager', 'orders:access'), ('manager', 'orders:create'), ('manager', 'orders:edit'),
('manager', 'inventory:access'), ('manager', 'inventory:create'), ('manager', 'inventory:edit'),
('manager', 'time-tracking:access'),
('manager', 'reports:access'),
('manager', 'users:access');

-- OPERATOR
INSERT INTO role_permissions (role, permission_code) VALUES
('operator', 'dashboard:access'),
('operator', 'orders:access'),
('operator', 'time-tracking:access'), ('operator', 'time-tracking:create'), ('operator', 'time-tracking:edit');

-- VIEWER
INSERT INTO role_permissions (role, permission_code) VALUES
('viewer', 'dashboard:access'),
('viewer', 'orders:access'),
('viewer', 'inventory:access');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ TEST DATABASE SYNCED FROM PROD SCHEMA!' AS status;
SELECT COUNT(*) AS permission_count FROM permission_definitions;
SELECT role, COUNT(*) AS perms FROM role_permissions GROUP BY role ORDER BY role;
