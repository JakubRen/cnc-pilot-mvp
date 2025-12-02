-- migrations/add_assigned_operator.sql
-- Adds assigned_operator_id column to orders table for kiosk mode

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'orders' AND column_name = 'assigned_operator_id') THEN
        ALTER TABLE orders ADD COLUMN assigned_operator_id BIGINT REFERENCES users(id);
    END IF;
END $$;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_assigned_operator ON orders(assigned_operator_id);

COMMENT ON COLUMN orders.assigned_operator_id IS 'Operator assigned to work on this order (for kiosk mode)';
