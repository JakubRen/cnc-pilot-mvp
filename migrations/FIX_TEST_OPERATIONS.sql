-- =====================================================
-- FIX TEST OPERATIONS & PRODUCTION_PLANS TABLES
-- =====================================================
-- Date: 2025-12-31
-- Purpose: Fix operations and production_plans table structures in TEST database
--
-- Problems:
-- 1. operations table had old schema (machine TEXT, run_time_minutes, cost_per_hour)
-- 2. production_plans table missing 13 columns (part_name, quantity, etc.)
--
-- Solutions:
-- 1. Replace operations with new schema (machine_id UUID, run_time_per_unit_minutes, hourly_rate)
-- 2. Add missing columns to production_plans
-- =====================================================

-- Step 1: Drop and recreate production_plans with all required columns
DROP TABLE IF EXISTS operations CASCADE;
DROP TABLE IF EXISTS production_plans CASCADE;

CREATE TABLE production_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_number TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  material TEXT,
  length NUMERIC(10,2),
  width NUMERIC(10,2),
  height NUMERIC(10,2),
  drawing_file_id UUID, -- No FK constraint - files table may not exist in TEST DB
  technical_notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'in_progress', 'completed', 'cancelled')),
  is_active BOOLEAN DEFAULT true,
  total_setup_time_minutes INTEGER DEFAULT 0,
  total_run_time_minutes NUMERIC(10,2) DEFAULT 0,
  estimated_cost NUMERIC(10,2) DEFAULT 0,
  actual_cost NUMERIC(10,2),
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, plan_number)
);

-- Enable RLS for production_plans
ALTER TABLE production_plans ENABLE ROW LEVEL SECURITY;

-- Production plans RLS policies
DROP POLICY IF EXISTS "Users can view company production plans" ON production_plans;
CREATE POLICY "Users can view company production plans"
  ON production_plans FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create production plans" ON production_plans;
CREATE POLICY "Users can create production plans"
  ON production_plans FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update production plans" ON production_plans;
CREATE POLICY "Users can update production plans"
  ON production_plans FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Step 2: Drop and recreate machines table with proper PRIMARY KEY
DROP TABLE IF EXISTS machines CASCADE;

CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  location TEXT,
  purchase_date DATE,
  warranty_until DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_interval_days INTEGER DEFAULT 90,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'broken')),
  notes TEXT,
  specifications JSONB,
  hourly_rate NUMERIC(10,2) DEFAULT 180.00,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for machines
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

-- Machines RLS policies
DROP POLICY IF EXISTS "Users can view company machines" ON machines;
CREATE POLICY "Users can view company machines"
  ON machines FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create machines" ON machines;
CREATE POLICY "Users can create machines"
  ON machines FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update machines" ON machines;
CREATE POLICY "Users can update machines"
  ON machines FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Step 3: Create operations table with correct structure
CREATE TABLE operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_plan_id UUID NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  operation_number INTEGER NOT NULL,
  operation_type TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  description TEXT,
  machine_id UUID REFERENCES machines(id),
  setup_time_minutes INTEGER NOT NULL DEFAULT 0 CHECK (setup_time_minutes >= 0),
  run_time_per_unit_minutes NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (run_time_per_unit_minutes >= 0),
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_setup_cost NUMERIC(10,2) GENERATED ALWAYS AS ((setup_time_minutes / 60.0) * hourly_rate) STORED,
  total_run_cost NUMERIC(10,2),
  total_operation_cost NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'quality_check', 'failed')),
  assigned_operator_id BIGINT REFERENCES users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_operations_production_plan ON operations(production_plan_id);
CREATE INDEX idx_operations_machine ON operations(machine_id);
CREATE INDEX idx_operations_status ON operations(status);
CREATE INDEX idx_operations_operator ON operations(assigned_operator_id);

-- Unique constraint: operation_number must be unique within production_plan
CREATE UNIQUE INDEX idx_operations_plan_number ON operations(production_plan_id, operation_number);

-- Enable RLS
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view company operations" ON operations;
CREATE POLICY "Users can view company operations"
  ON operations FOR SELECT
  USING (production_plan_id IN (
    SELECT id FROM production_plans WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Users can create operations" ON operations;
CREATE POLICY "Users can create operations"
  ON operations FOR INSERT
  WITH CHECK (production_plan_id IN (
    SELECT id FROM production_plans WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Users can update operations" ON operations;
CREATE POLICY "Users can update operations"
  ON operations FOR UPDATE
  USING (production_plan_id IN (
    SELECT id FROM production_plans WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Users can delete operations" ON operations;
CREATE POLICY "Users can delete operations"
  ON operations FOR DELETE
  USING (production_plan_id IN (
    SELECT id FROM production_plans WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

-- Verification query
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'operations'
ORDER BY ordinal_position;
