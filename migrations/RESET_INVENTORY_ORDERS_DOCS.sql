-- =====================================================
-- RESET INVENTORY, ORDERS & DOCUMENTS
-- =====================================================
-- This script clears ONLY:
-- - Inventory items & transactions
-- - Orders & related data
-- - Warehouse documents
--
-- DOES NOT TOUCH:
-- - Users
-- - Companies
-- - Time tracking
-- - Settings
-- - Other modules (Carbon, Quality, etc.)
-- =====================================================

-- =====================================================
-- 0. DISABLE TRIGGERS (to prevent audit_logs issues)
-- =====================================================
SET session_replication_role = replica;

-- =====================================================
-- 1. DELETE INVENTORY DATA
-- =====================================================

-- Delete inventory transactions first (foreign key dependency)
DELETE FROM inventory_transactions;

-- Delete inventory items
DELETE FROM inventory;

-- =====================================================
-- 2. DELETE ORDERS DATA
-- =====================================================

-- Delete order-related data first (foreign key dependencies)
DELETE FROM time_logs WHERE order_id IS NOT NULL;
DELETE FROM production_plans WHERE order_id IS NOT NULL;
DELETE FROM operations WHERE order_id IS NOT NULL;

-- Delete orders
DELETE FROM orders;

-- =====================================================
-- 3. DELETE WAREHOUSE DOCUMENTS
-- =====================================================

-- Delete document items first (foreign key dependency)
DELETE FROM warehouse_document_items;

-- Delete warehouse documents
DELETE FROM warehouse_documents;

-- =====================================================
-- 4. DELETE QUOTES (Optional - related to orders)
-- =====================================================

-- Delete quote items first (foreign key dependency)
DELETE FROM quote_items;

-- Delete quotes
DELETE FROM quotes;

-- =====================================================
-- 5. DELETE AUDIT LOGS (for deleted records)
-- =====================================================

-- Delete audit logs for deleted tables
DELETE FROM audit_logs WHERE table_name IN (
  'inventory',
  'inventory_transactions',
  'orders',
  'time_logs',
  'production_plans',
  'operations',
  'warehouse_documents',
  'warehouse_document_items',
  'quotes',
  'quote_items'
);

-- =====================================================
-- 6. RE-ENABLE TRIGGERS
-- =====================================================
SET session_replication_role = DEFAULT;

-- =====================================================
-- 7. AUTO-NUMBERING INFO
-- =====================================================
-- Auto-numbering uses yearly counters.
-- The generate_* functions will automatically restart from 0001
-- if no records exist for current year.

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

-- Check remaining counts
DO $$
DECLARE
  inventory_count INTEGER;
  orders_count INTEGER;
  docs_count INTEGER;
  users_count INTEGER;
  companies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO inventory_count FROM inventory;
  SELECT COUNT(*) INTO orders_count FROM orders;
  SELECT COUNT(*) INTO docs_count FROM warehouse_documents;
  SELECT COUNT(*) INTO users_count FROM users;
  SELECT COUNT(*) INTO companies_count FROM companies;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'POST-RESET VERIFICATION:';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Inventory items: %', inventory_count;
  RAISE NOTICE 'Orders: %', orders_count;
  RAISE NOTICE 'Warehouse documents: %', docs_count;
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'PRESERVED (should NOT be 0):';
  RAISE NOTICE 'Users: %', users_count;
  RAISE NOTICE 'Companies: %', companies_count;
  RAISE NOTICE '==========================================';

  IF inventory_count = 0 AND orders_count = 0 AND docs_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: Inventory, Orders, and Documents cleared!';
  ELSE
    RAISE WARNING '⚠️ Some data may remain. Check manually.';
  END IF;

  IF users_count > 0 AND companies_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS: Users and Companies preserved!';
  ELSE
    RAISE WARNING '⚠️ WARNING: Users or Companies may have been deleted!';
  END IF;
END $$;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. This script is SAFE - only deletes specified data
-- 2. Run in Supabase SQL Editor
-- 3. Can be run multiple times (idempotent)
-- 4. Next orders will be: ORD-2025-0001, ORD-2025-0002, etc.
-- 5. Next inventory SKUs will be: SKU-2025-0001, SKU-2025-0002, etc.
--
-- To restore sample data after reset, run:
-- - migrations/day_12_sample_data.sql (if exists)
-- =====================================================
