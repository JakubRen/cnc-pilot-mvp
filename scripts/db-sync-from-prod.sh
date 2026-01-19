#!/bin/bash
# =====================================================
# Sync TEST Database from PROD
# =====================================================
# This script dumps the PROD database schema and data,
# then restores it to the TEST database.
#
# Usage:
#   ./scripts/db-sync-from-prod.sh
#
# Requirements:
#   - pg_dump and psql installed
#   - Environment variables set:
#     - PROD_SUPABASE_DB_PASSWORD
#     - TEST_SUPABASE_DB_PASSWORD
#
# =====================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 CNC-Pilot Database Sync Tool${NC}"
echo -e "${BLUE}=================================${NC}\n"

# Configuration
PROD_HOST="aws-0-eu-central-1.pooler.supabase.com"
PROD_PORT="6543"
PROD_USER="postgres.jjepqbrjktfsdbbprnea"
PROD_DB="postgres"

TEST_HOST="aws-0-eu-central-1.pooler.supabase.com"
TEST_PORT="6543"
TEST_USER="postgres.vvetjctdjswgwebhgbpd"
TEST_DB="postgres"

DUMP_FILE="prod_dump_$(date +%Y%m%d_%H%M%S).sql"

# Check for passwords
if [ -z "$PROD_SUPABASE_DB_PASSWORD" ]; then
    echo -e "${RED}❌ PROD_SUPABASE_DB_PASSWORD not set${NC}"
    echo "Please set it: export PROD_SUPABASE_DB_PASSWORD='your-password'"
    exit 1
fi

if [ -z "$TEST_SUPABASE_DB_PASSWORD" ]; then
    echo -e "${RED}❌ TEST_SUPABASE_DB_PASSWORD not set${NC}"
    echo "Please set it: export TEST_SUPABASE_DB_PASSWORD='your-password'"
    exit 1
fi

# Confirm action
echo -e "${YELLOW}⚠️  WARNING: This will OVERWRITE the TEST database!${NC}"
echo -e "PROD → TEST sync will:"
echo "  1. Dump PROD schema and RLS policies"
echo "  2. Drop all tables in TEST (except system tables)"
echo "  3. Restore PROD schema to TEST"
echo ""
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
fi

# Step 1: Dump PROD
echo -e "\n${BLUE}📦 Step 1: Dumping PROD database...${NC}"
export PGPASSWORD="$PROD_SUPABASE_DB_PASSWORD"

pg_dump \
    -h "$PROD_HOST" \
    -p "$PROD_PORT" \
    -U "$PROD_USER" \
    -d "$PROD_DB" \
    --schema=public \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    -f "$DUMP_FILE"

echo -e "${GREEN}✅ PROD dumped to: $DUMP_FILE${NC}"
echo "   Size: $(du -h "$DUMP_FILE" | cut -f1)"

# Step 2: Restore to TEST
echo -e "\n${BLUE}📥 Step 2: Restoring to TEST database...${NC}"
export PGPASSWORD="$TEST_SUPABASE_DB_PASSWORD"

psql \
    -h "$TEST_HOST" \
    -p "$TEST_PORT" \
    -U "$TEST_USER" \
    -d "$TEST_DB" \
    -f "$DUMP_FILE"

echo -e "${GREEN}✅ TEST database restored from PROD!${NC}"

# Step 3: Cleanup
echo -e "\n${BLUE}🧹 Step 3: Cleanup...${NC}"
rm -f "$DUMP_FILE"
echo -e "${GREEN}✅ Temporary dump file removed${NC}"

# Step 4: Verify
echo -e "\n${BLUE}🔍 Step 4: Verifying TEST database...${NC}"
export PGPASSWORD="$TEST_SUPABASE_DB_PASSWORD"

TABLE_COUNT=$(psql -h "$TEST_HOST" -p "$TEST_PORT" -U "$TEST_USER" -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")

echo -e "${GREEN}✅ TEST database has $TABLE_COUNT tables${NC}"

# Summary
echo -e "\n${GREEN}=================================${NC}"
echo -e "${GREEN}✨ Sync complete!${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo "TEST database is now a copy of PROD."
echo "Remember to clear browser cache when testing locally."
echo ""
