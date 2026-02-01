-- Fix: Ensure order_items RLS policies exist
-- Run this in Supabase SQL Editor if order_items inserts fail with RLS error

-- Enable RLS (idempotent)
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Users can view order items from their company" ON order_items;
DROP POLICY IF EXISTS "Users can insert order items for their company orders" ON order_items;
DROP POLICY IF EXISTS "Users can update order items from their company" ON order_items;
DROP POLICY IF EXISTS "Users can delete order items from their company" ON order_items;

-- Recreate policies
CREATE POLICY "Users can view order items from their company"
ON order_items FOR SELECT TO authenticated
USING (
  order_id IN (
    SELECT id FROM orders WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert order items for their company orders"
ON order_items FOR INSERT TO authenticated
WITH CHECK (
  order_id IN (
    SELECT id FROM orders WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update order items from their company"
ON order_items FOR UPDATE TO authenticated
USING (
  order_id IN (
    SELECT id FROM orders WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete order items from their company"
ON order_items FOR DELETE TO authenticated
USING (
  order_id IN (
    SELECT id FROM orders WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  )
);
