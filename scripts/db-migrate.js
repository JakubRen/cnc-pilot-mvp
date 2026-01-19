#!/usr/bin/env node
/**
 * Database Migration Script
 *
 * Usage:
 *   node scripts/db-migrate.js [environment] [migration-file]
 *
 * Examples:
 *   node scripts/db-migrate.js test                    # Run all pending migrations on TEST
 *   node scripts/db-migrate.js prod                    # Run all pending migrations on PROD
 *   node scripts/db-migrate.js test SYNC_QUOTES_SCHEMA.sql  # Run specific migration
 *   node scripts/db-migrate.js both                    # Run on both TEST and PROD
 *
 * Environment variables required:
 *   TEST_DATABASE_URL - Connection string for TEST database
 *   PROD_DATABASE_URL - Connection string for PROD database
 *
 * Or use Supabase project references:
 *   TEST_SUPABASE_PROJECT_REF - e.g., vvetjctdjswgwebhgbpd
 *   PROD_SUPABASE_PROJECT_REF - e.g., jjepqbrjktfsdbbprnea
 *   SUPABASE_DB_PASSWORD - Database password
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  test: {
    name: 'TEST',
    projectRef: process.env.TEST_SUPABASE_PROJECT_REF || 'vvetjctdjswgwebhgbpd',
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.vvetjctdjswgwebhgbpd',
  },
  prod: {
    name: 'PROD',
    projectRef: process.env.PROD_SUPABASE_PROJECT_REF || 'jjepqbrjktfsdbbprnea',
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.jjepqbrjktfsdbbprnea',
  }
};

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const APPLIED_MIGRATIONS_FILE = path.join(__dirname, '..', '.applied-migrations.json');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getAppliedMigrations() {
  try {
    if (fs.existsSync(APPLIED_MIGRATIONS_FILE)) {
      return JSON.parse(fs.readFileSync(APPLIED_MIGRATIONS_FILE, 'utf8'));
    }
  } catch (e) {
    // Ignore
  }
  return { test: [], prod: [] };
}

function saveAppliedMigrations(applied) {
  fs.writeFileSync(APPLIED_MIGRATIONS_FILE, JSON.stringify(applied, null, 2));
}

function getMigrationFiles(specificFile = null) {
  if (specificFile) {
    const fullPath = path.join(MIGRATIONS_DIR, specificFile);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Migration file not found: ${specificFile}`);
    }
    return [specificFile];
  }

  // Get all .sql files, sorted by name
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

function buildConnectionString(env, password) {
  const config = CONFIG[env];
  return `postgresql://${config.user}:${password}@${config.host}:${config.port}/${config.database}`;
}

async function runMigration(env, migrationFile, password) {
  const config = CONFIG[env];
  const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  log(`\n📄 Running: ${migrationFile} on ${config.name}`, 'cyan');

  // Use Supabase CLI if available, otherwise use psql
  try {
    // Try using supabase db execute (requires linking)
    const connectionString = buildConnectionString(env, password);

    // Write SQL to temp file for psql
    const tempFile = path.join(__dirname, `temp_migration_${Date.now()}.sql`);
    fs.writeFileSync(tempFile, sql);

    try {
      // Use psql if available
      execSync(`psql "${connectionString}" -f "${tempFile}"`, {
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: password }
      });
      log(`✅ Migration applied successfully!`, 'green');
      return true;
    } catch (psqlError) {
      // If psql not available, show manual instructions
      log(`\n⚠️  psql not found. Run manually in Supabase SQL Editor:`, 'yellow');
      log(`\nProject: ${config.name} (${config.projectRef})`, 'blue');
      log(`URL: https://supabase.com/dashboard/project/${config.projectRef}/sql/new`, 'blue');
      log(`\n--- SQL Content ---`, 'cyan');
      console.log(sql.substring(0, 500) + (sql.length > 500 ? '\n...(truncated)' : ''));
      log(`--- End SQL ---\n`, 'cyan');

      // Copy to clipboard if possible
      try {
        if (process.platform === 'win32') {
          execSync(`echo ${sql.replace(/"/g, '\\"')} | clip`, { stdio: 'pipe' });
          log(`📋 SQL copied to clipboard!`, 'green');
        }
      } catch (e) {
        // Clipboard copy failed, ignore
      }

      return false;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  } catch (error) {
    log(`❌ Migration failed: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const env = args[0] || 'test';
  const specificFile = args[1];

  log('\n🔄 CNC-Pilot Database Migration Tool', 'blue');
  log('=====================================\n', 'blue');

  // Validate environment
  if (!['test', 'prod', 'both'].includes(env)) {
    log(`❌ Invalid environment: ${env}`, 'red');
    log(`   Valid options: test, prod, both`, 'yellow');
    process.exit(1);
  }

  // Check for password
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    log(`⚠️  SUPABASE_DB_PASSWORD not set.`, 'yellow');
    log(`\nTo run migrations automatically, set the environment variable:`, 'cyan');
    log(`  export SUPABASE_DB_PASSWORD="your-database-password"`, 'cyan');
    log(`\nOr run migrations manually via Supabase SQL Editor.`, 'cyan');
  }

  // Get migrations to run
  const migrations = getMigrationFiles(specificFile);
  log(`📁 Found ${migrations.length} migration(s) to process`, 'cyan');

  const environments = env === 'both' ? ['test', 'prod'] : [env];
  const applied = getAppliedMigrations();

  for (const targetEnv of environments) {
    log(`\n🎯 Target: ${CONFIG[targetEnv].name}`, 'blue');
    log(`   Project: ${CONFIG[targetEnv].projectRef}`, 'blue');

    for (const migration of migrations) {
      // Check if already applied (unless specific file requested)
      if (!specificFile && applied[targetEnv]?.includes(migration)) {
        log(`⏭️  Skipping (already applied): ${migration}`, 'yellow');
        continue;
      }

      if (password) {
        const success = await runMigration(targetEnv, migration, password);
        if (success) {
          // Track applied migration
          if (!applied[targetEnv]) applied[targetEnv] = [];
          if (!applied[targetEnv].includes(migration)) {
            applied[targetEnv].push(migration);
          }
          saveAppliedMigrations(applied);
        }
      } else {
        // Show manual instructions
        log(`\n📋 Manual migration required: ${migration}`, 'yellow');
        log(`   Open: https://supabase.com/dashboard/project/${CONFIG[targetEnv].projectRef}/sql/new`, 'cyan');
      }
    }
  }

  log('\n✨ Migration process complete!\n', 'green');
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
