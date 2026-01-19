-- =====================================================
-- SYNC_COLUMNS_TO_TEST.sql
-- Dodanie brakujących kolumn do bazy TEST
-- =====================================================
-- Data: 2026-01-19
-- Cel: Dodanie przydatnych kolumn do TEST (source of truth)
-- UWAGA: NIE zmieniamy architektury operations (TEST uzywa production_plan_id)
-- =====================================================

-- =====================================================
-- 1. TABELA: companies (7 kolumn)
-- =====================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_type TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_operators INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Warsaw';

-- =====================================================
-- 2. TABELA: users (4 kolumny)
-- =====================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pl';

-- =====================================================
-- 3. TABELA: inventory (5 kolumn)
-- =====================================================

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10,2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- 4. TABELA: time_logs (4 kolumny)
-- =====================================================

ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2);
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- =====================================================
-- 5. NAPRAWA: order_items - brakujacy PRIMARY KEY
-- =====================================================
-- Tabela order_items powinna miec PK na id (standardowa praktyka)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'order_items'
      AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE order_items ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added PRIMARY KEY to order_items.id';
  ELSE
    RAISE NOTICE 'PRIMARY KEY already exists on order_items';
  END IF;
END $$;

-- =====================================================
-- 6. TABELA: production_plans (1 kolumna)
-- =====================================================

ALTER TABLE production_plans ADD COLUMN IF NOT EXISTS order_item_id UUID;

-- FK do order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'production_plans_order_item_id_fkey'
      AND table_name = 'production_plans'
  ) THEN
    ALTER TABLE production_plans
      ADD CONSTRAINT production_plans_order_item_id_fkey
      FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- UWAGA: operations.order_item_id NIE DODAJEMY
-- =====================================================
-- TEST uzywa architektury: operations -> production_plans -> order
-- PROD uzywa: operations -> order_items (inna architektura)
-- Zachowujemy architekture TEST jako source of truth

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'companies' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'companies'
  AND column_name IN ('owner_id', 'plan_type', 'max_operators', 'logo_url', 'address', 'phone', 'timezone')
UNION ALL
SELECT 'users', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('password_hash', 'dashboard_preferences', 'notification_preferences', 'language')
UNION ALL
SELECT 'inventory', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inventory'
  AND column_name IN ('description', 'supplier', 'unit_cost', 'expiry_date', 'notes')
UNION ALL
SELECT 'time_logs', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'time_logs'
  AND column_name IN ('duration_seconds', 'total_cost', 'notes', 'updated_at')
UNION ALL
SELECT 'production_plans', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'production_plans' AND column_name = 'order_item_id'
ORDER BY table_name, column_name;

-- Oczekiwany wynik: 21 kolumn
-- companies: 7
-- users: 4
-- inventory: 5
-- time_logs: 4
-- production_plans: 1
