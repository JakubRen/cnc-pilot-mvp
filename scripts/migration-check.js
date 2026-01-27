#!/usr/bin/env node
/**
 * Smart Migration Check Script
 *
 * Checks database schema and compares with migration files
 * Shows what's already applied, what's missing, what might conflict
 *
 * Usage:
 *   node scripts/migration-check.js test        # Check TEST database
 *   node scripts/migration-check.js prod        # Check PROD database
 *   node scripts/migration-check.js diff        # Compare TEST vs PROD
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Database configs
const CONFIGS = {
  test: {
    name: 'TEST',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vvetjctdjswgwebhgbpd.supabase.co',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  prod: {
    name: 'PROD',
    url: 'https://jjepqbrjktfsdbbprnea.supabase.co',
    key: null, // Will need to be provided
  }
};

// Colors
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

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

async function checkDatabaseSchema(env) {
  const config = CONFIGS[env];

  if (!config.key) {
    log(`\n❌ Missing service role key for ${config.name}`, 'red');
    log('\nTo check PROD, add PROD_SUPABASE_SERVICE_ROLE_KEY to .env.local', 'yellow');
    return null;
  }

  const supabase = createClient(config.url, config.key);

  log(`\n🔍 Checking ${config.name} database...`, 'cyan');
  log(`📍 URL: ${config.url}`, 'gray');

  try {
    // Check if schema_migrations table exists
    const { data: migrationTable, error: tableError } = await supabase
      .from('schema_migrations')
      .select('migration_name, applied_at, success')
      .order('applied_at', { ascending: false })
      .limit(10);

    if (tableError && tableError.code === '42P01') {
      // Table doesn't exist
      log('\n⚠️  schema_migrations table NOT found', 'yellow');
      log('   Run this first: npm run migration:show 00000000_create_schema_migrations', 'yellow');
      log('   Then execute in SQL Editor\n', 'yellow');
      return { hasTrackingTable: false, appliedMigrations: [] };
    }

    if (tableError) {
      throw tableError;
    }

    log(`\n✅ Tracking table exists`, 'green');

    if (migrationTable && migrationTable.length > 0) {
      log(`\n📊 Applied migrations (${migrationTable.length} recent):`, 'cyan');
      migrationTable.forEach(m => {
        const status = m.success ? '✅' : '❌';
        const date = new Date(m.applied_at).toLocaleString();
        log(`   ${status} ${m.migration_name} (${date})`, 'white');
      });
    } else {
      log(`\n⚠️  No migrations recorded yet`, 'yellow');
    }

    // Get all tables
    const { data: tables, error: tablesError } = await supabase.rpc('get_all_tables');

    if (tablesError) {
      // Fallback: use information_schema
      const { data: tablesData } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      return {
        hasTrackingTable: true,
        appliedMigrations: migrationTable || [],
        tables: tablesData?.map(t => t.table_name) || [],
      };
    }

    return {
      hasTrackingTable: true,
      appliedMigrations: migrationTable || [],
      tables: tables || [],
    };

  } catch (error) {
    log(`\n❌ Error checking database: ${error.message}`, 'red');
    return null;
  }
}

async function compareWithMigrations(env) {
  const schema = await checkDatabaseSchema(env);

  if (!schema) {
    return;
  }

  const migrations = getMigrationFiles();

  log(`\n📁 Found ${migrations.length} migration files`, 'cyan');
  log('─'.repeat(80), 'gray');

  const appliedNames = new Set(schema.appliedMigrations.map(m => m.migration_name));

  let pending = 0;
  let applied = 0;
  let unknown = 0;

  migrations.forEach(migration => {
    if (appliedNames.has(migration)) {
      log(`✅ ${migration}`, 'green');
      applied++;
    } else if (migration === '00000000_create_schema_migrations.sql' && !schema.hasTrackingTable) {
      log(`⏳ ${migration} (NEEDS TO RUN FIRST!)`, 'yellow');
      pending++;
    } else {
      log(`⏳ ${migration} (pending)`, 'yellow');
      pending++;
    }
  });

  log('─'.repeat(80), 'gray');
  log(`\n📊 Summary for ${CONFIGS[env].name}:`, 'cyan');
  log(`   ✅ Applied: ${applied}`, 'green');
  log(`   ⏳ Pending: ${pending}`, 'yellow');

  if (pending > 0) {
    log(`\n💡 To apply pending migrations:`, 'cyan');
    log(`   1. Run: npm run migration:show <name>`, 'white');
    log(`   2. Copy SQL to Supabase SQL Editor`, 'white');
    log(`   3. Execute and verify`, 'white');
    log(`   4. Migration will be auto-tracked in schema_migrations table\n`, 'white');
  } else {
    log(`\n🎉 All migrations up to date!\n`, 'green');
  }
}

async function compareDatabases() {
  log('\n🔄 Comparing TEST vs PROD databases...', 'cyan');
  log('─'.repeat(80), 'gray');

  const testSchema = await checkDatabaseSchema('test');
  const prodSchema = await checkDatabaseSchema('prod');

  if (!testSchema || !prodSchema) {
    log('\n❌ Cannot compare - one or both databases not accessible', 'red');
    return;
  }

  const testApplied = new Set(testSchema.appliedMigrations.map(m => m.migration_name));
  const prodApplied = new Set(prodSchema.appliedMigrations.map(m => m.migration_name));

  const onlyInTest = [];
  const onlyInProd = [];
  const inBoth = [];

  testApplied.forEach(name => {
    if (prodApplied.has(name)) {
      inBoth.push(name);
    } else {
      onlyInTest.push(name);
    }
  });

  prodApplied.forEach(name => {
    if (!testApplied.has(name)) {
      onlyInProd.push(name);
    }
  });

  log(`\n📊 Comparison Results:`, 'cyan');
  log(`   ✅ In sync: ${inBoth.length} migrations`, 'green');

  if (onlyInTest.length > 0) {
    log(`   ⚠️  Only in TEST: ${onlyInTest.length}`, 'yellow');
    onlyInTest.forEach(name => {
      log(`      - ${name}`, 'yellow');
    });
  }

  if (onlyInProd.length > 0) {
    log(`   ⚠️  Only in PROD: ${onlyInProd.length}`, 'yellow');
    onlyInProd.forEach(name => {
      log(`      - ${name}`, 'yellow');
    });
  }

  if (onlyInTest.length === 0 && onlyInProd.length === 0) {
    log(`\n🎉 Databases are in sync!\n`, 'green');
  } else {
    log(`\n⚠️  Databases are OUT OF SYNC!`, 'yellow');
    log(`\nRecommendation:`, 'cyan');
    log(`   1. Review differences above`, 'white');
    log(`   2. Apply missing migrations to sync databases`, 'white');
    log(`   3. Use: npm run migration:show <name> to see SQL\n`, 'white');
  }
}

function showHelp() {
  log('\n🔍 Smart Migration Check\n', 'cyan');
  log('Usage:', 'yellow');
  log('  npm run migrate:check:test       Check TEST database', 'white');
  log('  npm run migrate:check:prod       Check PROD database', 'white');
  log('  npm run migrate:diff             Compare TEST vs PROD', 'white');
  log('\nWhat it does:', 'yellow');
  log('  - Shows which migrations are applied', 'white');
  log('  - Shows which migrations are pending', 'white');
  log('  - Compares TEST vs PROD status', 'white');
  log('  - READ-ONLY (safe to run anytime)\n', 'white');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'test':
      await compareWithMigrations('test');
      break;

    case 'prod':
      await compareWithMigrations('prod');
      break;

    case 'diff':
    case 'compare':
      await compareDatabases();
      break;

    case 'help':
    case '--help':
    case '-h':
    default:
      showHelp();
      if (!command) {
        log('💡 Try: npm run migrate:check:test\n', 'cyan');
      }
      break;
  }
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  if (error.stack) {
    log(error.stack, 'gray');
  }
  process.exit(1);
});
