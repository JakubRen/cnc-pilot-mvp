#!/usr/bin/env node

/**
 * Seed Test Database with Sample Data
 * Creates test orders for E2E tests
 */

const { createClient } = require('@supabase/supabase-js')

const TEST_URL = 'https://vvetjctdjswgwebhgbpd.supabase.co'
const TEST_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2ZXRqY3RkanN3Z3dlYmhnYnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDk1MTIsImV4cCI6MjA4MjUyNTUxMn0.HAmoQihJBrH_sDFsLF_Brzuv5L6YoiHBTJHgdOodfZM'

const supabase = createClient(TEST_URL, TEST_ANON_KEY)

async function seedTestData() {
  console.log('\n🌱 Seeding TEST database with test data...\n')

  // Login
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@cnc-pilot.pl',
    password: 'test123456'
  })

  if (authError) {
    console.error('❌ Auth error:', authError.message)
    return
  }

  console.log('✅ Logged in as:', authData.user.email)

  // Get user profile
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, company_id')
    .eq('auth_id', authData.user.id)
    .single()

  if (userError || !user) {
    console.error('❌ User not found:', userError?.message)
    return
  }

  console.log('👤 User ID:', user.id, 'Company ID:', user.company_id, '\n')

  // Create test orders
  const testOrders = [
    {
      order_number: 'ORD-TEST-001',
      customer_name: 'Test Customer Alpha',
      part_name: 'Flansza Testowa Ø100',
      material: 'Stal nierdzewna',
      quantity: 50,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'in_progress',
      company_id: user.company_id,
      created_by: user.id
    },
    {
      order_number: 'ORD-TEST-002',
      customer_name: 'Test Customer Beta',
      part_name: 'Kołnierz Testowy Ø200',
      material: 'Aluminium 6061',
      quantity: 100,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      company_id: user.company_id,
      created_by: user.id
    },
    {
      order_number: 'ORD-TEST-003',
      customer_name: 'Test Customer Gamma',
      part_name: 'Tuleja Testowa',
      material: 'Brąz CuSn12',
      quantity: 25,
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      company_id: user.company_id,
      created_by: user.id
    }
  ]

  const { data: insertedOrders, error: orderError } = await supabase
    .from('orders')
    .insert(testOrders)
    .select()

  if (orderError) {
    console.error('❌ Error inserting orders:', orderError.message)
  } else {
    console.log(`✅ Created ${insertedOrders.length} test orders:\n`)
    insertedOrders.forEach((order, i) => {
      console.log(`  ${i+1}. ${order.order_number} - ${order.customer_name} - ${order.part_name}`)
    })
  }

  console.log('\n✅ Seed complete!')
  console.log('\nYou can now run E2E tests:')
  console.log('  npm run test:e2e\n')
}

seedTestData().catch(err => {
  console.error('❌ Error seeding database:', err.message)
  process.exit(1)
})
