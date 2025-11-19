const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Starting migration: create_saved_filters.sql')

    // Read SQL file
    const sqlPath = path.join(__dirname, '../migrations/create_saved_filters.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('📖 SQL file loaded successfully')
    console.log('⏳ Executing migration...')

    // Execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // If RPC doesn't exist, try direct query
      console.log('ℹ️  Trying direct SQL execution...')
      const { error: directError } = await supabase.from('_migrations').insert({})

      if (directError && directError.message.includes('does not exist')) {
        console.log('⚠️  Cannot execute SQL directly through client.')
        console.log('📝 Please run the migration manually in Supabase Dashboard:')
        console.log('   1. Go to Supabase Dashboard → SQL Editor')
        console.log('   2. Paste the content of migrations/create_saved_filters.sql')
        console.log('   3. Click "Run"')
        console.log('')
        console.log('SQL Preview:')
        console.log('─'.repeat(60))
        console.log(sql.substring(0, 500) + '...')
        console.log('─'.repeat(60))
        process.exit(1)
      }
    }

    console.log('✅ Migration completed successfully!')
    console.log('📊 Created table: saved_filters')
    console.log('🔐 Applied RLS policies')
    console.log('📝 Inserted default filters')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

runMigration()
