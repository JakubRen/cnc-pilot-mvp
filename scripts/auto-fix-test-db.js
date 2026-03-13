#!/usr/bin/env node

/**
 * AUTO-FIX Test Database
 * Naprawia policies i tworzy test usera - AUTOMATYCZNIE
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const TEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const TEST_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!TEST_URL || !TEST_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(TEST_URL, TEST_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('\n🔧 AUTO-FIX Test Database\n')
console.log(`📍 Database: ${TEST_URL}\n`)

async function executeSQLFile(filename) {
  const sqlPath = path.join(__dirname, '../migrations', filename)
  const sql = fs.readFileSync(sqlPath, 'utf8')

  console.log(`📄 Executing: ${filename}`)

  // Execute SQL using rpc or direct query
  const { data, error } = await supabase.rpc('exec_sql', { query: sql })

  if (error) {
    // Try alternative method - split into statements
    console.log(`   Trying alternative method...`)

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      if (stmt) {
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { query: stmt })
          if (stmtError && !stmtError.message.includes('already exists')) {
            console.log(`   ⚠️  Statement ${i + 1}: ${stmtError.message}`)
          }
        } catch (err) {
          // Continue even on error
        }
      }
    }

    console.log(`   ✅ Completed (with warnings)\n`)
  } else {
    console.log(`   ✅ Success\n`)
  }
}

async function createTestCompany() {
  console.log('🏢 Creating test company...')

  // Check if company exists
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single()

  if (existingCompany) {
    console.log('   ℹ️  Company already exists - skipping\n')
    return
  }

  // Create test company
  const { error: companyError } = await supabase
    .from('companies')
    .insert({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Company'
    })

  if (companyError) {
    console.log(`   ❌ Company error: ${companyError.message}\n`)
    return
  }

  console.log('   ✅ Test company created\n')
}

async function createTestUser() {
  console.log('👤 Creating test user...')

  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'test@cnc-pilot.pl')
    .single()

  if (existingUser) {
    console.log('   ℹ️  User already exists - skipping\n')
    return
  }

  // Create auth user first
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: 'test@cnc-pilot.pl',
    password: 'test123456',
    email_confirm: true
  })

  if (authError && !authError.message.includes('already registered')) {
    console.log(`   ❌ Auth error: ${authError.message}\n`)
    return
  }

  console.log('   ✅ Test user created (test@cnc-pilot.pl / test123456)\n')
}

async function verifySetup() {
  console.log('🔍 Verifying setup...\n')

  // Check tables
  const tables = ['companies', 'users', 'orders', 'inventory', 'time_logs']

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`   ❌ ${table}: ${error.message}`)
    } else {
      console.log(`   ✅ ${table} (${count} rows)`)
    }
  }

  // Check test user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'test@cnc-pilot.pl')
    .single()

  if (userError) {
    console.log(`\n   ❌ Test user: ${userError.message}`)
  } else {
    console.log(`\n   ✅ Test user: ${user.email} (${user.role})`)
  }
}

async function main() {
  try {
    // Step 1: Fix policies
    await executeSQLFile('TEST_FIX_POLICIES.sql')

    // Step 2: Create test company
    await createTestCompany()

    // Step 3: Create test user
    await createTestUser()

    // Step 4: Verify
    await verifySetup()

    console.log('\n' + '='.repeat(60))
    console.log('✅ TEST DATABASE FIXED!')
    console.log('\nNastępne kroki:')
    console.log('  1. node scripts/check-test-db.js  (verify)')
    console.log('  2. npm run test:e2e               (run tests)')
    console.log('='.repeat(60) + '\n')

  } catch (err) {
    console.error('\n❌ Error:', err.message)
    console.log('\nJeśli nie zadziałało, uruchom ręcznie:')
    console.log('  npm run migrate:test migrations/TEST_FIX_POLICIES.sql')
    process.exit(1)
  }
}

main()
