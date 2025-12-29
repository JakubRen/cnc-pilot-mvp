#!/usr/bin/env node

/**
 * Database Migration Helper Script
 *
 * Helps you apply SQL migrations to Supabase database.
 * Shows instructions and SQL content for easy copy-paste to SQL Editor.
 *
 * Usage:
 *   npm run migrate:test migrations/my_migration.sql
 *   npm run migrate:prod migrations/my_migration.sql
 */

const fs = require('fs')
const path = require('path')
const clipboardy = require('clipboardy')

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`
}

// Get arguments
const args = process.argv.slice(2)
const environment = args[0] // 'test' or 'prod'
const migrationFile = args[1]

// Validate arguments
if (!environment || !['test', 'prod'].includes(environment)) {
  console.error(colorize('red', '❌ Error: First argument must be "test" or "prod"'))
  console.error('Usage: node scripts/migrate.js <test|prod> <migration-file>')
  process.exit(1)
}

if (!migrationFile) {
  console.error(colorize('red', '❌ Error: Migration file path required'))
  console.error('Usage: node scripts/migrate.js <test|prod> <migration-file>')
  console.error('Example: node scripts/migrate.js test migrations/add_priority.sql')
  process.exit(1)
}

// Get Supabase URL based on environment
let SUPABASE_URL, DATABASE_NAME

if (environment === 'test') {
  SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'https://vvetjctdjswgwebhgbpd.supabase.co'
  DATABASE_NAME = 'TEST (cnc-pilot-test)'
  console.log(colorize('cyan', '\n🧪 TEST DATABASE MIGRATION\n'))
} else {
  SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  DATABASE_NAME = 'PRODUCTION (cnc-pilot-mvp)'
  console.log(colorize('yellow', '\n⚠️  PRODUCTION DATABASE MIGRATION\n'))
}

// Check if migration file exists
const migrationPath = path.resolve(process.cwd(), migrationFile)
if (!fs.existsSync(migrationPath)) {
  console.error(colorize('red', `❌ Error: Migration file not found: ${migrationPath}`))
  process.exit(1)
}

// Read migration SQL
const sql = fs.readFileSync(migrationPath, 'utf8')
const fileName = path.basename(migrationFile)
const fileSize = (sql.length / 1024).toFixed(2)
const lineCount = sql.split('\n').length

console.log(colorize('blue', '📄 Migration File:'))
console.log(`   Name: ${fileName}`)
console.log(`   Size: ${fileSize} KB`)
console.log(`   Lines: ${lineCount}`)
console.log(`   Path: ${migrationPath}`)

console.log(colorize('blue', '\n🎯 Target Database:'))
console.log(`   Environment: ${environment.toUpperCase()}`)
console.log(`   Database: ${DATABASE_NAME}`)
console.log(`   URL: ${SUPABASE_URL}`)

// Copy SQL to clipboard (optional - may not work on Windows)
let clipboardSuccess = false
try {
  clipboardy.writeSync(sql)
  clipboardSuccess = true
  console.log(colorize('green', '\n✅ SQL copied to clipboard!'))
} catch (error) {
  console.log(colorize('yellow', '\n⚠️  Clipboard not available (Windows limitation)'))
  console.log(colorize('yellow', '   → You can manually copy from the SQL preview below'))
}

// Show instructions
console.log(colorize('blue', '\n📝 Next Steps:\n'))
console.log('1. Open Supabase Dashboard:')
console.log(colorize('cyan', `   ${SUPABASE_URL.replace('//', '//app.')}/project/_/sql/new`))
if (clipboardSuccess) {
  console.log('\n2. Paste the SQL (already in your clipboard!)')
} else {
  console.log('\n2. Copy the SQL from the preview below')
  console.log('   (Select all text between the ─── lines)')
}
console.log('\n3. Click "RUN" or press Ctrl+Enter')
console.log('\n4. Verify the migration completed successfully')

if (environment === 'prod') {
  console.log(colorize('yellow', '\n⚠️  IMPORTANT: This is PRODUCTION database!'))
  console.log(colorize('yellow', '   - Make sure you tested this migration on TEST first'))
  console.log(colorize('yellow', '   - Double-check the SQL before running'))
  console.log(colorize('yellow', '   - Have a backup/rollback plan ready'))
}

// Show SQL content
if (clipboardSuccess) {
  // If clipboard worked, show preview only
  console.log(colorize('blue', '\n📋 SQL Preview (first 20 lines):\n'))
  console.log(colorize('cyan', '─'.repeat(80)))
  const preview = sql.split('\n').slice(0, 20).join('\n')
  console.log(preview)
  if (lineCount > 20) {
    console.log(colorize('cyan', `\n... (${lineCount - 20} more lines)\n`))
  }
  console.log(colorize('cyan', '─'.repeat(80)))
} else {
  // If clipboard failed, show full SQL for manual copy
  console.log(colorize('blue', '\n📋 FULL SQL (copy this):\n'))
  console.log(colorize('cyan', '─'.repeat(80)))
  console.log(sql)
  console.log(colorize('cyan', '─'.repeat(80)))
}

console.log(colorize('green', '\n✨ Ready to migrate!\n'))
