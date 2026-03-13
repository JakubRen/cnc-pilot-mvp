/**
 * Fix missing RPC function in TEST database
 * Run: node scripts/fix-test-rpc.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const SQL = `
-- Drop if exists (safe re-run)
DROP FUNCTION IF EXISTS generate_production_plan_number(UUID);

-- Create the function
CREATE OR REPLACE FUNCTION generate_production_plan_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
  v_plan_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) INTO v_count
  FROM production_plans
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  v_number := LPAD((v_count + 1)::TEXT, 4, '0');
  v_plan_number := 'PP-' || v_year || '-' || v_number;

  RETURN v_plan_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_production_plan_number(UUID) TO authenticated;
`;

async function main() {
  console.log('🔧 Fixing TEST database: Adding missing RPC function...\n');

  try {
    // Try to execute raw SQL using rpc
    const { data, error } = await supabase.rpc('exec_sql', { sql: SQL });

    if (error) {
      // If exec_sql doesn't exist, try a different approach
      console.log('⚠️  exec_sql RPC not available, trying alternative...');

      // Test if function exists by calling it
      const testResult = await supabase.rpc('generate_production_plan_number', {
        p_company_id: '00000000-0000-0000-0000-000000000000'
      });

      if (testResult.error) {
        console.log('❌ Function does not exist:', testResult.error.message);
        console.log('\n📋 MANUAL STEPS REQUIRED:');
        console.log('1. Go to Supabase Studio: https://supabase.com/dashboard/project/vvetjctdjswgwebhgbpd');
        console.log('2. Open SQL Editor');
        console.log('3. Paste the SQL from: migrations/FIX_TEST_MISSING_RPC.sql');
        console.log('4. Click RUN');
        console.log('5. Re-run: npx playwright test');
      } else {
        console.log('✅ Function already exists! Result:', testResult.data);
      }
      return;
    }

    console.log('✅ Function created successfully!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📋 MANUAL STEPS REQUIRED:');
    console.log('1. Go to Supabase Studio: https://supabase.com/dashboard/project/vvetjctdjswgwebhgbpd');
    console.log('2. Open SQL Editor');
    console.log('3. Paste the SQL from: migrations/FIX_TEST_MISSING_RPC.sql');
    console.log('4. Click RUN');
    console.log('5. Re-run: npx playwright test');
  }

  // Verify by testing the function
  console.log('\n📊 Testing function...');
  const { data: testData, error: testError } = await supabase.rpc('generate_production_plan_number', {
    p_company_id: '00000000-0000-0000-0000-000000000000'
  });

  if (testError) {
    console.log('⚠️  Function test failed:', testError.message);
  } else {
    console.log('✅ Function works! Generated:', testData);
  }
}

main().catch(console.error);
