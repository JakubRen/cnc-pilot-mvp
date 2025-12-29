-- ============================================================================
-- TEST DATABASE SETUP FOR E2E TESTS
-- Run this in Supabase SQL Editor for cnc-pilot-test project
-- ============================================================================

-- ============================================================================
-- 1. CREATE CORE TABLES
-- ============================================================================

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  employees_count TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  auth_id UUID UNIQUE NOT NULL,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'operator' CHECK (role IN ('owner', 'admin', 'manager', 'operator', 'viewer', 'pending')),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  hourly_rate NUMERIC DEFAULT 50.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  part_name TEXT,
  material TEXT,
  deadline DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed', 'cancelled')),
  notes TEXT,
  total_cost NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, order_number)
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'raw_material' CHECK (category IN ('raw_material', 'finished_good', 'semi_finished', 'tool', 'consumable')),
  quantity NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'szt' CHECK (unit IN ('kg', 'm', 'szt', 'l')),
  low_stock_threshold NUMERIC DEFAULT 10,
  location TEXT,
  batch_number TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, sku)
);

-- Time logs table
CREATE TABLE IF NOT EXISTS time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed')),
  hourly_rate NUMERIC DEFAULT 50.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production plans table
CREATE TABLE IF NOT EXISTS production_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  plan_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, plan_number)
);

-- Operations table
CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  production_plan_id UUID REFERENCES production_plans(id) ON DELETE CASCADE,
  operation_number INTEGER NOT NULL,
  operation_name TEXT NOT NULL,
  machine TEXT,
  setup_time_minutes NUMERIC DEFAULT 0,
  run_time_minutes NUMERIC DEFAULT 0,
  cost_per_hour NUMERIC DEFAULT 100.00,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table (new architecture)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'raw_material',
  specifications JSONB,
  default_unit_cost NUMERIC DEFAULT 0,
  manufacturer TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, sku)
);

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. CREATE RLS POLICIES (permissive for test environment)
-- ============================================================================

-- Companies policies
DROP POLICY IF EXISTS "Users can view their company" ON companies;
CREATE POLICY "Users can view their company"
  ON companies FOR SELECT
  USING (id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Users policies
DROP POLICY IF EXISTS "Users can view company users" ON users;
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth_id = auth.uid());

-- Orders policies
DROP POLICY IF EXISTS "Users can view company orders" ON orders;
CREATE POLICY "Users can view company orders"
  ON orders FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update orders" ON orders;
CREATE POLICY "Users can update orders"
  ON orders FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete orders" ON orders;
CREATE POLICY "Users can delete orders"
  ON orders FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Inventory policies
DROP POLICY IF EXISTS "Users can view company inventory" ON inventory;
CREATE POLICY "Users can view company inventory"
  ON inventory FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create inventory" ON inventory;
CREATE POLICY "Users can create inventory"
  ON inventory FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update inventory" ON inventory;
CREATE POLICY "Users can update inventory"
  ON inventory FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Time logs policies
DROP POLICY IF EXISTS "Users can view company time logs" ON time_logs;
CREATE POLICY "Users can view company time logs"
  ON time_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create time logs" ON time_logs;
CREATE POLICY "Users can create time logs"
  ON time_logs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update time logs" ON time_logs;
CREATE POLICY "Users can update time logs"
  ON time_logs FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Production plans policies
DROP POLICY IF EXISTS "Users can view company production plans" ON production_plans;
CREATE POLICY "Users can view company production plans"
  ON production_plans FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create production plans" ON production_plans;
CREATE POLICY "Users can create production plans"
  ON production_plans FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Operations policies
DROP POLICY IF EXISTS "Users can view company operations" ON operations;
CREATE POLICY "Users can view company operations"
  ON operations FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create operations" ON operations;
CREATE POLICY "Users can create operations"
  ON operations FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update operations" ON operations;
CREATE POLICY "Users can update operations"
  ON operations FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Products policies
DROP POLICY IF EXISTS "Users can view company products" ON products;
CREATE POLICY "Users can view company products"
  ON products FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- ============================================================================
-- 4. INSERT TEST DATA
-- ============================================================================

-- Insert test company
INSERT INTO companies (id, name, industry, employees_count)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Test Company - CNC Pilot',
  'manufacturing',
  '10-50'
)
ON CONFLICT (id) DO NOTHING;

-- WAIT! Don't insert user here - we already created it via Supabase Auth UI
-- We just need to update the users table with company_id

-- Link the auth user to company (use the UID you saved from Krok 2.3)
-- ⚠️ YOU MUST RUN THIS SEPARATELY after getting the UID:
-- UPDATE users SET company_id = 'a0000000-0000-0000-0000-000000000001', role = 'owner' WHERE email = 'test@cnc_pilot.pl';

-- Insert sample orders
INSERT INTO orders (
  id,
  company_id,
  order_number,
  customer_name,
  quantity,
  part_name,
  material,
  deadline,
  status,
  created_by
) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'ORD-2025-0001',
  'Test Customer A',
  10,
  'Flansza Testowa Ø100',
  'Stal nierdzewna 304',
  CURRENT_DATE + INTERVAL '30 days',
  'pending',
  (SELECT id FROM users WHERE email = 'test@cnc_pilot.pl')
),
(
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'ORD-2025-0002',
  'Test Customer B',
  25,
  'Wał testowy Ø50',
  'Stal C45',
  CURRENT_DATE + INTERVAL '14 days',
  'in_progress',
  (SELECT id FROM users WHERE email = 'test@cnc_pilot.pl')
),
(
  'b0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'ORD-2025-0003',
  'Test Customer C',
  5,
  'Tuleja testowa Ø80',
  'Aluminium 7075',
  CURRENT_DATE + INTERVAL '7 days',
  'completed',
  (SELECT id FROM users WHERE email = 'test@cnc_pilot.pl')
)
ON CONFLICT (company_id, order_number) DO NOTHING;

-- Insert sample inventory
INSERT INTO inventory (
  id,
  company_id,
  sku,
  name,
  category,
  quantity,
  unit,
  low_stock_threshold,
  location,
  created_by
) VALUES
(
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'STEEL-304',
  'Stal nierdzewna 304 - blacha 5mm',
  'raw_material',
  150.50,
  'kg',
  50.00,
  'Magazyn A - Regał 1',
  (SELECT id FROM users WHERE email = 'test@cnc_pilot.pl')
),
(
  'c0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'STEEL-C45',
  'Stal konstrukcyjna C45 - pręt Ø50',
  'raw_material',
  25.00,
  'szt',
  10.00,
  'Magazyn A - Regał 2',
  (SELECT id FROM users WHERE email = 'test@cnc_pilot.pl')
)
ON CONFLICT (company_id, sku) DO NOTHING;

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================

-- Check company
SELECT 'Company created:' as status, * FROM companies WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- Check user
SELECT 'User created:' as status, id, email, full_name, role, company_id FROM users WHERE email = 'test@cnc_pilot.pl';

-- Check orders
SELECT 'Orders created:' as status, COUNT(*) as count FROM orders WHERE company_id = 'a0000000-0000-0000-0000-000000000001';

-- Check inventory
SELECT 'Inventory created:' as status, COUNT(*) as count FROM inventory WHERE company_id = 'a0000000-0000-0000-0000-000000000001';

-- ============================================================================
-- ✅ SETUP COMPLETE!
-- ============================================================================
-- Expected results:
-- - 1 company (Test Company)
-- - 1 user (test@cnc_pilot.pl)
-- - 3 orders
-- - 2 inventory items
-- ============================================================================
