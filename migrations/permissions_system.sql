-- ============================================
-- SYSTEM GRANULARNYCH UPRAWNIEŃ - CNC-Pilot
-- ============================================
-- Data utworzenia: 2025-12-01
-- Opis: Tabele i dane dla systemu permissions
-- ============================================

-- 1. TABELA: permission_definitions (słownik uprawnień)
-- ============================================
CREATE TABLE IF NOT EXISTS permission_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,           -- np. 'dashboard:access', 'orders:prices'
  module TEXT NOT NULL,                 -- dashboard, orders, inventory, etc.
  action TEXT NOT NULL,                 -- access, prices, edit, delete, create
  name_pl TEXT NOT NULL,                -- Nazwa po polsku
  description_pl TEXT,                  -- Opis po polsku
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_definitions_module ON permission_definitions(module);
CREATE INDEX IF NOT EXISTS idx_permission_definitions_code ON permission_definitions(code);

-- 2. TABELA: role_permissions (domyślne uprawnienia dla ról)
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,                   -- owner, admin, manager, operator, viewer
  permission_code TEXT NOT NULL REFERENCES permission_definitions(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

-- 3. TABELA: user_permissions (nadpisania uprawnień per user)
-- ============================================
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES permission_definitions(code) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,  -- true = przyznane, false = odebrane
  granted_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

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

-- ============================================
-- 5. DEFINICJE UPRAWNIEŃ (SŁOWNIK)
-- ============================================
INSERT INTO permission_definitions (code, module, action, name_pl, description_pl) VALUES
-- Dashboard
('dashboard:access', 'dashboard', 'access', 'Dostęp do Dashboard', 'Możliwość wejścia na stronę główną'),
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

-- ============================================
-- 6. DOMYŚLNE UPRAWNIENIA DLA RÓL
-- ============================================

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
-- Dashboard (bez finansów)
('operator', 'dashboard:access'),
-- Orders (bez cen)
('operator', 'orders:access'),
('operator', 'orders:create'),
('operator', 'orders:edit'),
-- Time-tracking (bez stawek/kosztów)
('operator', 'time-tracking:access'),
('operator', 'time-tracking:create'),
('operator', 'time-tracking:edit'),
-- Tags (tylko odczyt)
('operator', 'tags:access'),
-- Files (upload)
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

-- ============================================
-- 7. FUNKCJA POMOCNICZA: Sprawdzanie uprawnienia
-- ============================================
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

-- ============================================
-- 8. WERYFIKACJA
-- ============================================
-- Sprawdź liczbę uprawnień
-- SELECT module, COUNT(*) as count FROM permission_definitions GROUP BY module ORDER BY module;

-- Sprawdź uprawnienia per rola
-- SELECT role, COUNT(*) as permissions_count FROM role_permissions GROUP BY role ORDER BY role;
