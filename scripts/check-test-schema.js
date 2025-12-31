#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const TEST_URL = 'https://vvetjctdjswgwebhgbpd.supabase.co'
const TEST_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2ZXRqY3RkanN3Z3dlYmhnYnBkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0OTUxMiwiZXhwIjoyMDgyNTI1NTEyfQ.SmfGbnveE_xTTxTaLRSNSHOk0deIY0GCnN-K-__zk1Q'

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
