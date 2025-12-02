-- migrations/safe_add_optimization_day_1_columns.sql

-- 1. Safely add columns to ORDERS table
DO $$
BEGIN
    -- Add linked_inventory_item_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'linked_inventory_item_id') THEN
        ALTER TABLE orders ADD COLUMN linked_inventory_item_id UUID REFERENCES inventory(id);
    END IF;

    -- Add material_quantity_needed if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'material_quantity_needed') THEN
        ALTER TABLE orders ADD COLUMN material_quantity_needed NUMERIC(10,2) DEFAULT 0.00 CHECK (material_quantity_needed >= 0);
    END IF;
END $$;

-- 2. Safely add columns to TIME_LOGS table
DO $$
BEGIN
    -- Add duration_seconds if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_logs' AND column_name = 'duration_seconds') THEN
        ALTER TABLE time_logs ADD COLUMN duration_seconds INTEGER DEFAULT 0;
    END IF;

    -- Add total_cost if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_logs' AND column_name = 'total_cost') THEN
        ALTER TABLE time_logs ADD COLUMN total_cost NUMERIC(10,2) DEFAULT 0.00;
    END IF;
END $$;

-- 3. Add indexes (IF NOT EXISTS is standard SQL for indexes)
CREATE INDEX IF NOT EXISTS idx_orders_linked_inventory_item_id ON orders(linked_inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_order ON time_logs(user_id, order_id);
