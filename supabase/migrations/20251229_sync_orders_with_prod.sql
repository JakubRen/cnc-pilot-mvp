-- Sync orders table with PROD schema
-- Adds all missing columns from PROD export

ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_hours numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS material_cost numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS labor_cost numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS overhead_cost numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS linked_inventory_item_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS material_quantity_needed numeric DEFAULT 0.00 CHECK (material_quantity_needed >= 0::numeric);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_operator_id bigint;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_material_cost numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_labor_cost numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_overhead_cost numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_total_cost numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_labor_cost numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_labor_hours numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS selling_price numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS margin_percent numeric DEFAULT 20;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS margin_amount numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cost_per_unit numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_per_unit numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS drawing_file_id uuid;

-- Add foreign key constraints (only essential ones - files/customers tables may not exist in TEST)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_assigned_operator_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_assigned_operator_id_fkey
  FOREIGN KEY (assigned_operator_id) REFERENCES users(id);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_linked_inventory_item_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_linked_inventory_item_id_fkey
  FOREIGN KEY (linked_inventory_item_id) REFERENCES inventory(id);

-- Skipping FK to files and customers tables (may not exist in TEST)

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
