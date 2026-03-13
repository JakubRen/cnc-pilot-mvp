#!/usr/bin/env node

/**
 * Check Test Database Setup
 * Verifies if migrations have been applied to test database
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const { createClient } = require('@supabase/supabase-js')

const TEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const TEST_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!TEST_URL || !TEST_ANON_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(TEST_URL, TEST_ANON_KEY)

async function checkDatabase() {
  console.log('\n🔍 Checking TEST Database Setup...\n')
  console.log(`📍 Database: ${TEST_URL}\n`)

  const results = {
    tables: [],
    testUser: null,
    errors: []
  }

  // Check critical tables
  const tablesToCheck = [
    'companies',
    'users',
    'orders',
    'inventory',
    'time_logs',
    'production_plans',
    'operations'
  ]

  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        results.tables.push({ table, status: '❌', error: error.message })
        results.errors.push(`Table ${table}: ${error.message}`)
      } else {
        results.tables.push({ table, status: '✅', count })
      }
    } catch (err) {
      results.tables.push({ table, status: '❌', error: err.message })
      results.errors.push(`Table ${table}: ${err.message}`)
    }
  }

  // Check test user
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test@cnc-pilot.pl')
      .single()

    if (error) {
      results.testUser = { status: '❌', error: error.message }
    } else if (data) {
      results.testUser = {
        status: '✅',
        user: {
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          company_id: data.company_id
        }
      }
    }
  } catch (err) {
    results.testUser = { status: '❌', error: err.message }
  }

  // Print results
  console.log('📊 Tables Status:\n')
  results.tables.forEach(({ table, status, count, error }) => {
    const countStr = count !== undefined ? ` (${count} rows)` : ''
    const errorStr = error ? ` - ${error}` : ''
    console.log(`  ${status} ${table}${countStr}${errorStr}`)
  })

  console.log('\n👤 Test User (test@cnc-pilot.pl):\n')
  if (results.testUser.status === '✅') {
    console.log(`  ✅ User exists`)
    console.log(`     Email: ${results.testUser.user.email}`)
    console.log(`     Name: ${results.testUser.user.full_name}`)
    console.log(`     Role: ${results.testUser.user.role}`)
    console.log(`     Company ID: ${results.testUser.user.company_id}`)
  } else {
    console.log(`  ❌ User not found`)
    if (results.testUser.error) {
      console.log(`     Error: ${results.testUser.error}`)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  const tablesOk = results.tables.filter(t => t.status === '✅').length
  const tablesTotal = results.tables.length
  const userOk = results.testUser?.status === '✅'

  if (tablesOk === tablesTotal && userOk) {
    console.log('✅ TEST DATABASE READY - All migrations applied!')
    console.log('\nYou can run E2E tests:')
    console.log('  npm run test:e2e')
  } else if (tablesOk === 0) {
    console.log('❌ TEST DATABASE EMPTY - No migrations applied yet')
    console.log('\nRun migrations in this order:')
    console.log('  1. npm run migrate:test migrations/TEST_DATABASE_SETUP.sql')
    console.log('  2. npm run migrate:test migrations/TEST_FINAL_SETUP.sql')
    console.log('  3. npm run migrate:test migrations/TEST_CREATE_USER.sql')
  } else {
    console.log('⚠️  TEST DATABASE INCOMPLETE - Some migrations missing')
    console.log(`\nTables: ${tablesOk}/${tablesTotal} ✅`)
    console.log(`Test User: ${userOk ? '✅' : '❌'}`)
    console.log('\nMissing:')
    results.tables.filter(t => t.status === '❌').forEach(({ table, error }) => {
      console.log(`  - ${table}: ${error}`)
    })
    if (!userOk) {
      console.log(`  - test@cnc-pilot.pl user: ${results.testUser?.error || 'not found'}`)
    }
  }
  console.log('='.repeat(60) + '\n')
}

checkDatabase().catch(err => {
  console.error('❌ Error checking database:', err.message)
  process.exit(1)
})
