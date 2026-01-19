# Database Synchronization Guide

## Overview

CNC-Pilot uses two separate Supabase databases:
- **TEST** (`vvetjctdjswgwebhgbpd`) - For local development and E2E tests
- **PROD** (`jjepqbrjktfsdbbprnea`) - For production (Vercel deployment)

This guide explains how to keep them synchronized.

---

## Quick Commands

```bash
# Run migrations on TEST database
npm run migrate:test

# Run migrations on PROD database
npm run migrate:prod

# Run migrations on BOTH databases
npm run migrate:both

# Sync TEST from PROD (full schema copy)
npm run db:sync
```

---

## Automatic Migration (GitHub Actions)

Migrations run automatically when:
1. You push changes to `migrations/*.sql` files on `main` branch
2. You manually trigger the workflow

### Setup GitHub Secrets

Add these secrets to your repository (`Settings → Secrets and variables → Actions`):

| Secret | Value |
|--------|-------|
| `TEST_SUPABASE_DB_PASSWORD` | Password for TEST database |
| `PROD_SUPABASE_DB_PASSWORD` | Password for PROD database |

### Manual Trigger

1. Go to `Actions → Database Migrations`
2. Click `Run workflow`
3. Select environment: `test`, `prod`, or `both`
4. Optionally specify a migration file

---

## Migration Workflow

### Creating a New Migration

1. Create a new file in `migrations/` folder:
   ```
   migrations/YYYYMMDD_description.sql
   ```

2. Write idempotent SQL (safe to run multiple times):
   ```sql
   -- Use IF NOT EXISTS for new objects
   ALTER TABLE users ADD COLUMN IF NOT EXISTS new_column TEXT;

   -- Use DROP IF EXISTS before CREATE for policies
   DROP POLICY IF EXISTS "policy_name" ON table_name;
   CREATE POLICY "policy_name" ON table_name ...;
   ```

3. Commit and push:
   ```bash
   git add migrations/
   git commit -m "db: add new_column to users table"
   git push
   ```

4. GitHub Actions will automatically apply to both databases.

### Manual Migration

If you need to run migrations manually:

```bash
# Set password (get from Supabase dashboard)
export SUPABASE_DB_PASSWORD="your-password"

# Run specific migration
node scripts/db-migrate.js test SYNC_QUOTES_SCHEMA.sql

# Or open Supabase SQL Editor directly:
# TEST: https://supabase.com/dashboard/project/vvetjctdjswgwebhgbpd/sql/new
# PROD: https://supabase.com/dashboard/project/jjepqbrjktfsdbbprnea/sql/new
```

---

## Syncing TEST from PROD

When TEST database gets out of sync with PROD (missing tables, columns, or RLS policies):

### Option 1: Full Schema Sync (Recommended)

```bash
# Set both passwords
export PROD_SUPABASE_DB_PASSWORD="prod-password"
export TEST_SUPABASE_DB_PASSWORD="test-password"

# Run sync script
npm run db:sync
```

This will:
1. Dump PROD schema (tables, indexes, RLS policies)
2. Drop existing TEST schema
3. Restore PROD schema to TEST

### Option 2: Manual Sync via Supabase Studio

1. **Export from PROD:**
   - Go to PROD project → SQL Editor
   - Run: `pg_dump` or use Supabase Backup feature

2. **Import to TEST:**
   - Go to TEST project → SQL Editor
   - Paste and run the SQL

---

## Database Connection Details

### TEST Database
```
Host: aws-0-eu-central-1.pooler.supabase.com
Port: 6543
Database: postgres
User: postgres.vvetjctdjswgwebhgbpd
```

### PROD Database
```
Host: aws-0-eu-central-1.pooler.supabase.com
Port: 6543
Database: postgres
User: postgres.jjepqbrjktfsdbbprnea
```

---

## Troubleshooting

### "Column does not exist" error
The migration hasn't been applied. Run:
```bash
npm run migrate:test
```

### "RLS policy violation" error
Missing RLS policies. Check the migration includes all 4 policies:
- SELECT
- INSERT
- UPDATE
- DELETE

### "Foreign key constraint" error
Tables are being created in wrong order. Ensure migrations:
1. Create parent tables first
2. Add FK constraints with `IF NOT EXISTS`

### GitHub Actions failing
Check that secrets are set correctly:
- `TEST_SUPABASE_DB_PASSWORD`
- `PROD_SUPABASE_DB_PASSWORD`

---

## Best Practices

1. **Always test migrations locally first**
   ```bash
   npm run migrate:test
   # Test the app
   npm run migrate:prod
   ```

2. **Use idempotent SQL**
   - `IF NOT EXISTS` for columns/tables
   - `DROP IF EXISTS` before `CREATE` for policies
   - `ON CONFLICT DO NOTHING` for inserts

3. **Keep migrations small and focused**
   - One migration = one logical change
   - Easier to debug if something fails

4. **Name migrations descriptively**
   ```
   20260119_add_quotes_customer_id.sql
   20260119_fix_rls_quote_items.sql
   ```

5. **Never edit applied migrations**
   - Create a new migration instead
   - Old migrations are historical record

---

## File Structure

```
cnc-pilot-mvp/
├── migrations/
│   ├── quotes_system.sql           # Main quotes schema
│   ├── SYNC_QUOTES_SCHEMA.sql      # Sync fix for quotes
│   ├── ABC_PRICING_SCHEMA.sql      # ABC pricing tables
│   └── ...
├── scripts/
│   ├── db-migrate.js               # Migration runner
│   └── db-sync-from-prod.sh        # Full sync script
└── .github/workflows/
    └── db-migrate.yml              # Auto-migration workflow
```
