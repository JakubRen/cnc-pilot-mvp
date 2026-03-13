#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const { createClient } = require('@supabase/supabase-js')

const TEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const TEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!TEST_URL || !TEST_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(TEST_URL, TEST_KEY)

async function checkColumns() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'orders'
      ORDER BY ordinal_position;
    `
  })

  if (error) {
    console.log('Trying alternative method...')
    // Query one row to see columns
    const { data: sample } = await supabase.from('orders').select('*').limit(1).single()
    if (sample) {
      console.log('Orders columns in TEST:')
      console.log(Object.keys(sample).join(', '))
    }
  } else {
    console.log('Orders columns in TEST:')
    data.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`))
  }
}

checkColumns()
