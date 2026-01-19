-- =====================================================
-- FIX: Add missing FK constraint quotes.created_by -> users.id
-- =====================================================
-- Problem: Supabase PostgREST can't find relationship for JOIN
-- Error: "Could not find a relationship between 'quotes' and 'users'"
-- =====================================================

-- Step 1: Check if constraint already exists, drop if malformed
DO $$
BEGIN
  -- Drop existing constraint if it exists (may be unnamed/malformed)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'quotes'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%created_by%'
  ) THEN
    EXECUTE 'ALTER TABLE quotes DROP CONSTRAINT ' || (
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'quotes'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%created_by%'
      LIMIT 1
    );
  END IF;
END $$;

-- Step 2: Add FK constraint with explicit name (PostgREST requires named constraints)
ALTER TABLE quotes
ADD CONSTRAINT quotes_created_by_fkey
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Step 3: Also add customer_id FK if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'customer_id'
  ) THEN
    -- Check if FK already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'quotes'
      AND constraint_name = 'quotes_customer_id_fkey'
    ) THEN
      ALTER TABLE quotes
      ADD CONSTRAINT quotes_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'quotes'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Expected output should include:
-- quotes_created_by_fkey | quotes | created_by | users | id
