// Check production plan schema and data in TEST database
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://vvetjctdjswgwebhgbpd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2ZXRqY3Rkand3Z3dlYmhnYnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNjQxNjUsImV4cCI6MjA0OTk0MDE2NX0.HZb3pP3OExPikqIlUDQZdW3K8Qz4B5gyKf4JE-RJ_Ks'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('\n========================================')
  console.log('CHECKING PRODUCTION_PLANS SCHEMA')
  console.log('========================================\n')

  // Query a production plan to see what columns exist
  console.log('Querying a sample production plan to inspect schema...')
  const { data: samplePlan, error: sampleError } = await supabase
    .from('production_plans')
    .select('*')
    .limit(1)
    .single()

  if (sampleError) {
    console.error('❌ Error fetching sample plan:', sampleError.message)
  } else if (samplePlan) {
    const columns = Object.keys(samplePlan).sort()
    console.log('\n✅ Production_plans columns (' + columns.length + ' total):')
    console.log(columns.join(', '))

    console.log('\n✅ Has order_id column?', 'order_id' in samplePlan)
    console.log('✅ Has part_name column?', 'part_name' in samplePlan)
    console.log('✅ Has quantity column?', 'quantity' in samplePlan)
    console.log('✅ Has drawing_file_id column?', 'drawing_file_id' in samplePlan)
  } else {
    console.log('⚠️ No production plans found in database')
  }

  console.log('\n========================================')
  console.log('CHECKING SPECIFIC PRODUCTION PLAN')
  console.log('========================================\n')

  // Check the specific plan that test fails on
  const { data: plan, error: planError } = await supabase
    .from('production_plans')
    .select('*')
    .eq('id', 'cbf79d70-fd2f-4a16-9640-535653bc2660')
    .single()

  if (planError) {
    console.error('❌ Error fetching plan:', planError.message)
  } else if (!plan) {
    console.log('⚠️ Plan not found: cbf79d70-fd2f-4a16-9640-535653bc2660')
  } else {
    console.log('✅ Plan found:', plan.id)
    console.log('   Plan number:', plan.plan_number)
    console.log('   Part name:', plan.part_name || 'MISSING')
    console.log('   Order ID:', plan.order_id || 'NULL/MISSING')
    console.log('   Quantity:', plan.quantity || 'MISSING')
    console.log('   Created at:', plan.created_at)
    console.log('\n   Full data:')
    console.log(JSON.stringify(plan, null, 2))
  }

  console.log('\n========================================')
  console.log('CHECKING FILES TABLE')
  console.log('========================================\n')

  const { data: filesCheck, error: filesError } = await supabase
    .from('files')
    .select('id')
    .limit(1)

  if (filesError) {
    console.error('❌ Files table error:', filesError.message)
    console.log('   Files table may not exist or RLS is blocking')
  } else {
    console.log('✅ Files table exists and is accessible')
  }

  console.log('\n========================================')
}

checkSchema().then(() => {
  console.log('\n✅ Database check complete\n')
  process.exit(0)
}).catch(err => {
  console.error('\n❌ Fatal error:', err)
  process.exit(1)
})
