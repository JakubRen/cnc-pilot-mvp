#!/usr/bin/env node

/**
 * Auto-fix Test Database Policies
 * Fixes infinite recursion error by recreating policies
 */

const fs = require('fs')
const path = require('path')

// IMPORTANT: Tego nie możemy zrobić z anon key - potrzebujemy service role key
console.log('\n❌ Sorry - ten script wymaga SERVICE ROLE KEY dla test database\n')
console.log('📋 Najprostsze rozwiązanie - RĘCZNE WYKONANIE SQL:\n')
console.log('KROK 1: Otwórz Supabase SQL Editor:')
console.log('  https://app.supabase.com/project/vvetjctdjswgwebhgbpd/sql/new\n')

console.log('KROK 2: Skopiuj i wykonaj ten SQL:\n')
console.log('─'.repeat(80))

// Read the fix SQL
const sqlPath = path.join(__dirname, '../migrations/TEST_FIX_POLICIES.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')
console.log(sql)

console.log('─'.repeat(80))
console.log('\nKROK 3: Kliknij RUN (lub Ctrl+Enter)\n')
console.log('KROK 4: Zweryfikuj:')
console.log('  node scripts/check-test-db.js\n')
