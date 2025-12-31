#!/usr/bin/env node

/**
 * List all tables in test database using SQL query
 */

const { createClient } = require('@supabase/supabase-js')

const TEST_URL = 'https://vvetjctdjswgwebhgbpd.supabase.co'
const TEST_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2ZXRqY3RkanN3Z3dlYmhnYnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDk1MTIsImV4cCI6MjA4MjUyNTUxMn0.HAmoQihJBrH_sDFsLF_Brzuv5L6YoiHBTJHgdOodfZM'

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
