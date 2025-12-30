-- Add production module tables to TEST database
-- Based on PROD schema export

-- order_items (required for production_plans)
CREATE TABLE IF NOT EXISTS order_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  part_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  drawing_file_id uuid,
  length numeric,
  width numeric,
  height numeric,
  material text,
  complexity text CHECK (complexity = ANY (ARRAY['simple'::text, 'medium'::text, 'complex'::text])),
  notes text,
  total_setup_time_minutes integer DEFAULT 0,
  total_run_time_minutes numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- production_plans
CREATE TABLE IF NOT EXISTS production_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL,
  plan_number text NOT NULL UNIQUE,
  order_id uuid,
  order_item_id uuid,
  part_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  material text,
  length numeric,
  width numeric,
  height numeric,
  drawing_file_id uuid,
  technical_notes text,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  is_active boolean DEFAULT true,
  total_setup_time_minutes integer DEFAULT 0,
  total_run_time_minutes numeric DEFAULT 0,
  estimated_cost numeric DEFAULT 0,
  actual_cost numeric,
  approved_by bigint,
  approved_at timestamp without time zone,
  created_by bigint,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT production_plans_pkey PRIMARY KEY (id),
  CONSTRAINT production_plans_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT production_plans_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT production_plans_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id),
  CONSTRAINT production_plans_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id),
  CONSTRAINT production_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id)
);

-- operations
CREATE TABLE IF NOT EXISTS operations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_item_id uuid NOT NULL,
  operation_number integer NOT NULL,
  operation_type text NOT NULL,
  operation_name text NOT NULL,
  description text,
  machine_id uuid,
  setup_time_minutes integer NOT NULL DEFAULT 0 CHECK (setup_time_minutes >= 0),
  run_time_per_unit_minutes numeric NOT NULL DEFAULT 0 CHECK (run_time_per_unit_minutes >= 0::numeric),
  hourly_rate numeric NOT NULL DEFAULT 0,
  total_setup_cost numeric DEFAULT (((setup_time_minutes)::numeric / 60.0) * hourly_rate),
  total_run_cost numeric,
  total_operation_cost numeric DEFAULT 0,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'quality_check'::text, 'failed'::text])),
  assigned_operator_id bigint,
  started_at timestamp without time zone,
  completed_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  production_plan_id uuid NOT NULL,
  CONSTRAINT operations_pkey PRIMARY KEY (id),
  CONSTRAINT operations_production_plan_id_fkey FOREIGN KEY (production_plan_id) REFERENCES production_plans(id),
  CONSTRAINT operations_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id),
  CONSTRAINT operations_assigned_operator_id_fkey FOREIGN KEY (assigned_operator_id) REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;

-- RLS policies (company-scoped)
DROP POLICY IF EXISTS "Users can view own company order_items" ON order_items;
CREATE POLICY "Users can view own company order_items"
  ON order_items FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid())));

DROP POLICY IF EXISTS "Users can view own company production_plans" ON production_plans;
CREATE POLICY "Users can view own company production_plans"
  ON production_plans FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own company production_plans" ON production_plans;
CREATE POLICY "Users can insert own company production_plans"
  ON production_plans FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own company production_plans" ON production_plans;
CREATE POLICY "Users can update own company production_plans"
  ON production_plans FOR UPDATE
  USING (company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own company operations" ON operations;
CREATE POLICY "Users can view own company operations"
  ON operations FOR SELECT
  USING (production_plan_id IN (SELECT id FROM production_plans WHERE company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid())));

DROP POLICY IF EXISTS "Users can insert own company operations" ON operations;
CREATE POLICY "Users can insert own company operations"
  ON operations FOR INSERT
  WITH CHECK (production_plan_id IN (SELECT id FROM production_plans WHERE company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid())));

DROP POLICY IF EXISTS "Users can update own company operations" ON operations;
CREATE POLICY "Users can update own company operations"
  ON operations FOR UPDATE
  USING (production_plan_id IN (SELECT id FROM production_plans WHERE company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid())));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_production_plans_company_id ON production_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_production_plans_order_id ON production_plans(order_id);
CREATE INDEX IF NOT EXISTS idx_operations_production_plan_id ON operations(production_plan_id);

-- Verify
SELECT 'Production tables added successfully!' AS status;
