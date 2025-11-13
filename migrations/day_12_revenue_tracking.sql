-- DAY 12: Revenue Tracking Migration
-- Adds cost tracking columns to orders table

-- Add total_cost column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2) DEFAULT 0;

-- Add cost breakdown columns (optional but useful for detailed analysis)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS material_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS overhead_cost DECIMAL(10,2) DEFAULT 0;

-- Update existing orders to have 0 cost (ensure no NULL values)
UPDATE orders
SET total_cost = 0
WHERE total_cost IS NULL;

UPDATE orders
SET material_cost = 0
WHERE material_cost IS NULL;

UPDATE orders
SET labor_cost = 0
WHERE labor_cost IS NULL;

UPDATE orders
SET overhead_cost = 0
WHERE overhead_cost IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN orders.total_cost IS 'Total revenue/cost for this order (suma: material + labor + overhead)';
COMMENT ON COLUMN orders.material_cost IS 'Cost of materials (materiały)';
COMMENT ON COLUMN orders.labor_cost IS 'Cost of labor/work (praca)';
COMMENT ON COLUMN orders.overhead_cost IS 'Overhead/general costs (koszty ogólne)';

-- Create index on total_cost for faster revenue queries
CREATE INDEX IF NOT EXISTS idx_orders_total_cost ON orders(total_cost);
CREATE INDEX IF NOT EXISTS idx_orders_status_cost ON orders(status, total_cost);
