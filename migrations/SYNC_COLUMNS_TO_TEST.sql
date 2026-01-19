-- =====================================================
-- SYNC_COLUMNS_TO_TEST.sql
-- Dodanie brakujących kolumn do bazy TEST
-- =====================================================
-- Data: 2026-01-19
-- Cel: Wyrównanie schematów TEST i PROD dla CNC-Pilot
-- =====================================================

-- =====================================================
-- 1. TABELA: companies (7 kolumn do dodania)
-- =====================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_type TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_operators INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Warsaw';

-- Opcjonalnie: FK dla owner_id do users (jeśli users.id jest UUID)
-- ALTER TABLE companies ADD CONSTRAINT companies_owner_id_fkey
--   FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- =====================================================
-- 2. TABELA: users (4 kolumny do dodania)
-- =====================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pl';

-- =====================================================
-- 3. TABELA: inventory (5 kolumn do dodania)
-- =====================================================

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10,2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- 4. TABELA: time_logs (4 kolumny do dodania)
-- =====================================================

ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2);
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- =====================================================
-- 5. TABELA: production_plans (1 kolumna do dodania)
-- =====================================================

ALTER TABLE production_plans ADD COLUMN IF NOT EXISTS order_item_id UUID;

-- Opcjonalnie: FK do order_items (jeśli tabela istnieje)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'production_plans_order_item_id_fkey'
      AND table_name = 'production_plans'
    ) THEN
      ALTER TABLE production_plans
        ADD CONSTRAINT production_plans_order_item_id_fkey
        FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- =====================================================
-- 6. TABELA: operations (1 kolumna do dodania)
-- =====================================================
-- TEST ma tylko production_plan_id, PROD ma tez order_item_id

ALTER TABLE operations ADD COLUMN IF NOT EXISTS order_item_id UUID;

-- FK do order_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'operations_order_item_id_fkey'
      AND table_name = 'operations'
    ) THEN
      ALTER TABLE operations
        ADD CONSTRAINT operations_order_item_id_fkey
        FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_operations_order_item ON operations(order_item_id);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Sprawdź kolumny w companies
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'companies'
  AND column_name IN ('owner_id', 'plan_type', 'max_operators', 'logo_url', 'address', 'phone', 'timezone')
ORDER BY column_name;

-- Sprawdź kolumny w users
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('password_hash', 'dashboard_preferences', 'notification_preferences', 'language')
ORDER BY column_name;

-- Sprawdź kolumny w inventory
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'inventory'
  AND column_name IN ('description', 'supplier', 'unit_cost', 'expiry_date', 'notes')
ORDER BY column_name;

-- Sprawdź kolumny w time_logs
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'time_logs'
  AND column_name IN ('duration_seconds', 'total_cost', 'notes', 'updated_at')
ORDER BY column_name;

-- Sprawdź kolumnę w production_plans
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'production_plans' AND column_name = 'order_item_id';

-- Sprawdź kolumnę w operations
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'operations' AND column_name = 'order_item_id';

-- Oczekiwany wynik:
-- companies: 7 nowych kolumn
-- users: 4 nowe kolumny
-- inventory: 5 nowych kolumn
-- time_logs: 4 nowe kolumny
-- production_plans: 1 nowa kolumna (order_item_id)
-- operations: 1 nowa kolumna (order_item_id)
-- RAZEM: 22 nowe kolumny
