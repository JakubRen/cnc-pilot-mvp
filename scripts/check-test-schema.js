#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const { createClient } = require('@supabase/supabase-js')

const TEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const TEST_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!TEST_URL || !TEST_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(TEST_URL, TEST_SERVICE_KEY)

async function checkSchema() {
  console.log('🔍 Checking orders table schema...\n')

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*, creator:users!created_by(full_name)')
    .limit(1)

  if (ordersError) {
    console.log('❌ Error joining orders → users:', ordersError.message)
    console.log('   Code:', ordersError.code)
    console.log('   Details:', ordersError.details)
  } else {
    console.log('✅ Orders → Users relationship works!')
    console.log('   Data:', orders)
  }
}

checkSchema()
