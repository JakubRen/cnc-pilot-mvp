#!/usr/bin/env node
/**
 * Migration Helper Script
 *
 * Simplified workflow for database migrations without Supabase CLI
 *
 * Usage:
 *   node scripts/migration-helper.js new <name>       # Create new migration
 *   node scripts/migration-helper.js show <name>      # Show migration content
 *   node scripts/migration-helper.js list             # List all migrations
 *   node scripts/migration-helper.js latest           # Show latest migration
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function ensureMigrationsDir() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }
}

function formatDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function getMigrationFiles() {
  ensureMigrationsDir();
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

function findMigration(name) {
  const migrations = getMigrationFiles();
  return migrations.find(m => m.includes(name));
}

function createMigration(name) {
  ensureMigrationsDir();

  // Sanitize name
  const sanitized = name.toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const timestamp = formatDate();
  const filename = `${timestamp}_${sanitized}.sql`;
  const filepath = path.join(MIGRATIONS_DIR, filename);

  // Template content
  const template = `-- Migration: ${sanitized}
-- Created: ${new Date().toISOString()}
-- Description: [Add description here]

-- Your SQL here
BEGIN;

-- Example: Create table
-- CREATE TABLE example (
--   id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
--   company_id uuid NOT NULL REFERENCES companies(id),
--   created_at timestamptz DEFAULT now()
-- );

-- Enable RLS
-- ALTER TABLE example ENABLE ROW LEVEL SECURITY;

-- RLS Policy
-- CREATE POLICY "Users can view own company data"
--   ON example FOR SELECT
--   USING (company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid()));

COMMIT;

-- Auto-track this migration
INSERT INTO schema_migrations (migration_name, success)
VALUES ('${filename}', true)
ON CONFLICT (migration_name) DO NOTHING;

-- Verify
-- SELECT * FROM example LIMIT 1;
`;

  fs.writeFileSync(filepath, template);

  log('\n✅ Migration created!', 'green');
  log(`\n📁 File: ${filename}`, 'cyan');
  log(`📍 Path: ${filepath}`, 'gray');
  log('\n📝 Next steps:', 'yellow');
  log('1. Edit the file and add your SQL', 'white');
  log('2. Run: npm run migration:show ' + sanitized, 'white');
  log('3. Copy SQL to Supabase SQL Editor', 'white');
  log('4. Test on TEST database first!', 'white');
  log('5. Then apply to PROD database', 'white');
  log('6. Commit to git\n', 'white');
}

function showMigration(name) {
  const migration = findMigration(name);

  if (!migration) {
    log(`\n❌ Migration not found: ${name}`, 'red');
    log('\nAvailable migrations:', 'yellow');
    listMigrations();
    return;
  }

  const filepath = path.join(MIGRATIONS_DIR, migration);
  const content = fs.readFileSync(filepath, 'utf8');

  log('\n' + '='.repeat(80), 'cyan');
  log(`📄 Migration: ${migration}`, 'green');
  log('='.repeat(80), 'cyan');
  log('\n' + content, 'white');
  log('\n' + '='.repeat(80), 'cyan');
  log('\n📋 Copy the SQL above to Supabase SQL Editor:', 'yellow');
  log('TEST: https://supabase.com/dashboard/project/vvetjctdjswgwebhgbpd/sql/new', 'blue');
  log('PROD: https://supabase.com/dashboard/project/jjepqbrjktfsdbbprnea/sql/new', 'blue');
  log('\n⚠️  Remember: TEST first, then PROD!\n', 'yellow');
}

function listMigrations() {
  const migrations = getMigrationFiles();

  if (migrations.length === 0) {
    log('\n⚠️  No migrations found', 'yellow');
    log('Create one with: npm run migration:new <name>\n', 'cyan');
    return;
  }

  log('\n📁 Migrations (' + migrations.length + '):', 'cyan');
  log('─'.repeat(80), 'gray');

  migrations.forEach((migration, index) => {
    const num = String(index + 1).padStart(2, ' ');
    log(`${num}. ${migration}`, 'white');
  });

  log('─'.repeat(80), 'gray');
  log('\n💡 View migration: npm run migration:show <name>', 'yellow');
  log('💡 Create new: npm run migration:new <name>\n', 'yellow');
}

function showLatest() {
  const migrations = getMigrationFiles();

  if (migrations.length === 0) {
    log('\n⚠️  No migrations found\n', 'yellow');
    return;
  }

  const latest = migrations[migrations.length - 1];
  showMigration(latest);
}

function showHelp() {
  log('\n🗄️  Migration Helper\n', 'cyan');
  log('Usage:', 'yellow');
  log('  npm run migration:new <name>       Create new migration', 'white');
  log('  npm run migration:show <name>      Show migration content', 'white');
  log('  npm run migration:list             List all migrations', 'white');
  log('  npm run migration:latest           Show latest migration', 'white');
  log('\nExamples:', 'yellow');
  log('  npm run migration:new add_customers_table', 'gray');
  log('  npm run migration:show customers', 'gray');
  log('  npm run migration:list', 'gray');
  log('  npm run migration:latest\n', 'gray');
}

// Main
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const name = args[1];

  switch (command) {
    case 'new':
    case 'create':
      if (!name) {
        log('\n❌ Migration name required', 'red');
        log('Usage: npm run migration:new <name>\n', 'yellow');
        process.exit(1);
      }
      createMigration(name);
      break;

    case 'show':
    case 'view':
    case 'cat':
      if (!name) {
        log('\n❌ Migration name required', 'red');
        log('Usage: npm run migration:show <name>\n', 'yellow');
        process.exit(1);
      }
      showMigration(name);
      break;

    case 'list':
    case 'ls':
      listMigrations();
      break;

    case 'latest':
    case 'last':
      showLatest();
      break;

    case 'help':
    case '--help':
    case '-h':
    default:
      showHelp();
      break;
  }
}

main();
