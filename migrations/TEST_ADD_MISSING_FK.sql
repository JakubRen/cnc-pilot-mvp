-- Add missing foreign key constraint for assigned_operator_id
-- This allows Supabase to use named relationship: users!orders_assigned_operator_id_fkey

ALTER TABLE orders
  ADD CONSTRAINT orders_assigned_operator_id_fkey
  FOREIGN KEY (assigned_operator_id)
  REFERENCES users(id);

-- Verify
SELECT
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table
FROM pg_constraint
WHERE conname = 'orders_assigned_operator_id_fkey';
