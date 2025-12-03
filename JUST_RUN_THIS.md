# JUST RUN THIS - V3.1

## File:
```
migrations/SECURITY_FIX_V3.1_ABSOLUTE_MINIMUM.sql
```

## Instructions:
1. Open Supabase SQL Editor
2. Copy entire file
3. Click RUN
4. Done

## What it does:
- Enables RLS on 2 tables
- Creates 2 policies
- Nothing fancy, just works

## Verify:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('company_email_domains', 'blocked_email_domains');
```

Both should show `rowsecurity = t`

---

**This version has:**
- No DO blocks
- No RAISE NOTICE
- No IF EXISTS
- Just plain SQL

**It will work.** 🤞
