#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const TEST_URL = 'https://vvetjctdjswgwebhgbpd.supabase.co'
const TEST_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2ZXRqY3RkanN3Z3dlYmhnYnBkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0OTUxMiwiZXhwIjoyMDgyNTI1NTEyfQ.SmfGbnveE_xTTxTaLRSNSHOk0deIY0GCnN-K-__zk1Q'

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
