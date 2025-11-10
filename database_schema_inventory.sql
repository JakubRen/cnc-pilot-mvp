-- ============================================
-- CNC-PILOT MVP - INVENTORY MODULE SCHEMA
-- Day 7: Magazyn + Śledzenie Partii
-- ============================================

-- STEP 1: Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('raw_material', 'part', 'tool', 'consumable', 'finished_good')) DEFAULT 'raw_material',
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  low_stock_threshold DECIMAL(10,2) DEFAULT 10,
  location TEXT,
  supplier TEXT,
  unit_cost DECIMAL(10,2),
  batch_number TEXT,
  expiry_date DATE,
  notes TEXT,
  company_id UUID REFERENCES companies(id) NOT NULL,
  created_by BIGINT REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_sku_per_company UNIQUE(sku, company_id)
);

-- STEP 2: Create inventory_transactions table (audit trail)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('in', 'out', 'adjustment', 'initial')) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  quantity_after DECIMAL(10,2) NOT NULL,
  batch_number TEXT,
  reason TEXT,
  reference_order_id UUID REFERENCES orders(id),
  notes TEXT,
  company_id UUID REFERENCES companies(id) NOT NULL,
  created_by BIGINT REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- STEP 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_company ON inventory_items(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_batch ON inventory_items(batch_number);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_company ON inventory_transactions(company_id);

-- STEP 4: Enable Row Level Security
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create RLS Policies for inventory_items

-- Policy: Users can view their company's inventory
DROP POLICY IF EXISTS "Users can view their company's inventory" ON inventory_items;
CREATE POLICY "Users can view their company's inventory"
  ON inventory_items FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()::bigint
    )
  );

-- Policy: Users can create inventory items for their company
DROP POLICY IF EXISTS "Users can create inventory items" ON inventory_items;
CREATE POLICY "Users can create inventory items"
  ON inventory_items FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()::bigint
    )
  );

-- Policy: Users can update their company's inventory
DROP POLICY IF EXISTS "Users can update their company's inventory" ON inventory_items;
CREATE POLICY "Users can update their company's inventory"
  ON inventory_items FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()::bigint
    )
  );

-- Policy: Only owners can delete inventory items
DROP POLICY IF EXISTS "Only owners can delete inventory items" ON inventory_items;
CREATE POLICY "Only owners can delete inventory items"
  ON inventory_items FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()::bigint
    )
    AND
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::bigint AND role = 'owner'
    )
  );

-- STEP 6: Create RLS Policies for inventory_transactions

-- Policy: Users can view their company's transactions
DROP POLICY IF EXISTS "Users can view their company's transactions" ON inventory_transactions;
CREATE POLICY "Users can view their company's transactions"
  ON inventory_transactions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()::bigint
    )
  );

-- Policy: Users can create transactions for their company
DROP POLICY IF EXISTS "Users can create transactions" ON inventory_transactions;
CREATE POLICY "Users can create transactions"
  ON inventory_transactions FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()::bigint
    )
  );

-- STEP 7: Insert sample data (OPTIONAL - for testing)

-- Get first user's company_id and user id for sample data
DO $$
DECLARE
  sample_company_id UUID;
  sample_user_id BIGINT;
BEGIN
  -- Get first user
  SELECT company_id, id INTO sample_company_id, sample_user_id
  FROM users
  LIMIT 1;

  -- Only insert if we found a user
  IF sample_company_id IS NOT NULL THEN
    -- Insert sample inventory items
    INSERT INTO inventory_items (sku, name, description, category, quantity, unit, low_stock_threshold, location, supplier, unit_cost, batch_number, company_id, created_by)
    VALUES
      ('ALU-6061-100', 'Aluminum 6061 Bar 100mm', 'High-quality aluminum bar for CNC machining', 'raw_material', 45.5, 'kg', 20, 'A1', 'Metal Supply Co', 25.50, 'BATCH-ALU-2024-001', sample_company_id, sample_user_id),
      ('STEEL-S235-50', 'Steel S235 Plate 50mm', 'Structural steel plate', 'raw_material', 120.0, 'kg', 50, 'A2', 'Steel Warehouse', 15.00, 'BATCH-STL-2024-002', sample_company_id, sample_user_id),
      ('DRILL-8MM', 'HSS Drill Bit 8mm', 'High-speed steel drill bit', 'tool', 12, 'pcs', 5, 'Tool-Rack-1', 'Tool Distributors', 8.50, NULL, sample_company_id, sample_user_id),
      ('OIL-CUTTING-5L', 'Cutting Oil 5L', 'Industrial cutting fluid', 'consumable', 3, 'L', 10, 'B3', 'Lubricants Inc', 45.00, 'BATCH-OIL-2024-003', sample_company_id, sample_user_id),
      ('BRASS-C36000-25', 'Brass C36000 Rod 25mm', 'Free-cutting brass rod', 'raw_material', 8.5, 'kg', 15, 'A1', 'Metal Supply Co', 35.00, 'BATCH-BRA-2024-004', sample_company_id, sample_user_id),
      ('ENDMILL-10MM', 'Carbide End Mill 10mm', '4-flute carbide end mill', 'tool', 6, 'pcs', 3, 'Tool-Rack-1', 'Tool Distributors', 65.00, NULL, sample_company_id, sample_user_id),
      ('COOLANT-20L', 'Water-Based Coolant 20L', 'Soluble coolant concentrate', 'consumable', 2, 'L', 5, 'B3', 'Lubricants Inc', 120.00, 'BATCH-COL-2024-005', sample_company_id, sample_user_id);

    -- Insert initial transaction for each item
    INSERT INTO inventory_transactions (item_id, transaction_type, quantity, quantity_after, reason, company_id, created_by)
    SELECT
      id,
      'initial',
      quantity,
      quantity,
      'Initial stock',
      company_id,
      created_by
    FROM inventory_items
    WHERE company_id = sample_company_id;

    RAISE NOTICE 'Sample inventory data inserted successfully for company_id: %', sample_company_id;
  ELSE
    RAISE NOTICE 'No users found. Skipping sample data insertion.';
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if tables were created
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('inventory_items', 'inventory_transactions')
ORDER BY tablename;

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('inventory_items', 'inventory_transactions')
ORDER BY tablename, policyname;

-- Count inventory items
SELECT
  COUNT(*) as total_items,
  category,
  SUM(quantity) as total_quantity
FROM inventory_items
GROUP BY category
ORDER BY category;

-- ============================================
-- DONE!
-- ============================================
-- Tables created: inventory_items, inventory_transactions
-- RLS Policies: 6 policies total (4 for items, 2 for transactions)
-- Sample data: 7 inventory items with initial transactions
-- Ready for Day 7 development!
-- ============================================
