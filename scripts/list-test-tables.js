#!/usr/bin/env node

/**
 * List all tables in test database using SQL query
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const { createClient } = require('@supabase/supabase-js')

const TEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const TEST_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!TEST_URL || !TEST_ANON_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(TEST_URL, TEST_ANON_KEY, {
  db: { schema: 'public' }
})

async function listTables() {
  console.log('\n📋 Listing all tables in TEST database...\n')

  // Try to use SQL query via RPC or direct query
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `
  })

  if (error) {
    console.log('⚠️  RPC method not available, trying alternative...\n')

    // Alternative: just try to query known tables
    const knownTables = [
      'companies', 'users', 'orders', 'inventory', 'time_logs',
      'production_plans', 'operations', 'customers', 'quotes',
      'company_email_domains', 'blocked_email_domains', 'tags', 'files'
    ]

    console.log('Testing known tables:\n')

    for (const table of knownTables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (tableError) {
        if (tableError.message.includes('does not exist')) {
          console.log(`  ❌ ${table} - does not exist`)
        } else {
          console.log(`  ⚠️  ${table} - exists but error: ${tableError.message}`)
        }
      } else {
        console.log(`  ✅ ${table} - exists`)
      }
    }
  } else {
    console.log('Tables found:')
    data.forEach(row => console.log(`  ✅ ${row.table_name}`))
  }

  console.log('\n')
}

listTables().catch(err => {
  console.error('❌ Error:', err.message)
})
