require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
})

async function runMigration() {
  console.log('🔧 Running FIX_TEST_OPERATIONS migration...')

  // Read SQL file
  const sqlPath = path.join(__dirname, '..', 'migrations', 'FIX_TEST_OPERATIONS.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  // Split by semicolons to execute one statement at a time
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`📝 Found ${statements.length} SQL statements to execute`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]

    // Skip comments and empty statements
    if (statement.startsWith('--') || statement.length < 5) {
      continue
    }

    console.log(`\n[${i + 1}/${statements.length}] Executing statement...`)
    console.log(statement.substring(0, 80) + '...')

    try {
      const { data, error } = await supabase.rpc('exec_sql', { query: statement })

      if (error) {
        // Try direct query if RPC doesn't work
        const { error: directError } = await supabase.from('_').select('*').limit(0).then(() => {
          // Supabase client doesn't support raw SQL directly
          // We need to use a workaround
          throw new Error('Cannot execute raw SQL via Supabase client')
        })

        console.error(`❌ Error:`, error.message)
        errorCount++
      } else {
        console.log(`✅ Success`)
        successCount++
      }
    } catch (err) {
      console.error(`❌ Error:`, err.message)
      errorCount++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${errorCount}`)

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!')
  } else {
    console.log('\n⚠️  Migration completed with errors. Please run SQL manually in Supabase SQL Editor.')
    console.log(`\n📋 SQL to run:\n${sqlPath}`)
  }
}

runMigration().catch(console.error)
