-- migrations/add_inventory_link_to_orders.sql
-- This migration adds columns to the 'orders' table to link to inventory items
-- and specifies the quantity of material needed per order unit.
-- It also adds 'duration_seconds' to 'time_logs' table.

-- Add linked_inventory_item_id to orders table
ALTER TABLE orders
ADD COLUMN linked_inventory_item_id UUID REFERENCES inventory(id);

-- Add material_quantity_needed to orders table
ALTER TABLE orders
ADD COLUMN material_quantity_needed NUMERIC(10,2) DEFAULT 0.00 CHECK (material_quantity_needed >= 0);

-- Add duration_seconds to time_logs table (from previous TODO)
ALTER TABLE time_logs
ADD COLUMN duration_seconds INTEGER DEFAULT 0;

-- Optional: Add total_cost to time_logs table (derived from duration_seconds * hourly_rate)
-- This could also be a view or calculated on the fly, but storing it pre-calculated
-- can be useful for performance and historical accuracy if hourly rates change.
ALTER TABLE time_logs
ADD COLUMN total_cost NUMERIC(10,2) DEFAULT 0.00;

-- Optional: Add an index on linked_inventory_item_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_linked_inventory_item_id
ON orders(linked_inventory_item_id);

-- Optional: Add an index on time_logs(user_id, order_id) if frequently queried together
CREATE INDEX IF NOT EXISTS idx_time_logs_user_order
ON time_logs(user_id, order_id);
