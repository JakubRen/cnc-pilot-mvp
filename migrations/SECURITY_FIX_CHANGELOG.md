# Security Fix Changelog

## Version 1.2 - 2025-12-03 14:30

### 🐛 Bug Fix: Column Name in View

**Problem:** Migration failed with error:
```
ERROR: 42703: column u.name does not exist
LINE 80: u.name AS user_name
```

**Root Cause:**
- View `audit_logs_with_users` used `u.name`
- But table `users` has `u.full_name` instead

**Table Structure:**
```sql
users (
  id BIGINT,
  auth_id UUID,
  email TEXT,
  full_name TEXT,  ← NOT "name"!
  role TEXT,
  company_id UUID
)
```

### 📝 Changes Made:

**File 1: `SECURITY_AUDIT_FIX_MASTER.sql`**
```diff
- u.name AS user_name
+ u.full_name AS user_name
```

**File 2: `SECURITY_FIX_DEFINER_VIEWS.sql`**
```diff
- u.name AS user_name
+ u.full_name AS user_name
```

### ✅ Status: READY TO USE

All column name issues resolved. Migration should now work correctly.

---

## Version 1.1 - 2025-12-03 14:00

### 🐛 Bug Fix: Column Name Correction

**Problem:** Migration failed with error:
```
ERROR: 42703: column "user_id" does not exist
```

**Root Cause:**
- Migration used `user_id` but table `users` actually has `auth_id`
- Incorrect query: `SELECT user_id FROM users WHERE role = 'admin'`
- Correct query: `SELECT auth_id FROM users WHERE role = 'admin'`

**Table Structure Clarification:**
```sql
-- users table has TWO IDs:
users.id       -- BIGINT (internal primary key)
users.auth_id  -- UUID (links to auth.users.id from Supabase Auth)

-- When checking current user in RLS policies, use:
auth.uid() = users.auth_id  ✅ CORRECT
auth.uid() = users.user_id  ❌ WRONG (column doesn't exist)
```

### 📝 Changes Made:

**File 1: `SECURITY_AUDIT_FIX_MASTER.sql`**
```diff
- auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin')
+ EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
```

**File 2: `SECURITY_FIX_RLS_ENABLE.sql`**
```diff
- auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin')
+ EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
```

**File 3: `SECURITY_FIX_DEFINER_VIEWS.sql`**
```diff
- -- WHERE company_id = (SELECT company_id FROM users WHERE user_id = auth.uid())
+ -- WHERE company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid())
```

### ⚡ Performance Improvement:

Changed from:
```sql
auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin')
```

To:
```sql
EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
```

**Benefits:**
- ✅ Fixes the column name error
- ✅ More efficient (EXISTS stops at first match)
- ✅ Better practice for RLS policies

### ✅ Testing:

After fix, run:
```sql
-- Test 1: Check policy exists
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'blocked_email_domains'
  AND policyname = 'Only admins can manage blocked domains';

-- Test 2: Test as non-admin (should fail)
-- Login as regular user, try:
INSERT INTO blocked_email_domains (domain) VALUES ('test.com');
-- Expected: permission denied

-- Test 3: Test as admin (should work)
-- Login as admin user, try:
INSERT INTO blocked_email_domains (domain) VALUES ('test.com');
-- Expected: success
```

### 🔍 Lessons Learned:

1. **Always verify column names** before writing RLS policies
2. **Check existing migrations** for patterns (all other policies use `auth_id`)
3. **Use EXISTS over IN** for better performance in RLS policies
4. **Test migrations on staging** before applying to production

---

## Version 1.0 - 2025-12-03 12:00

### Initial Release

- Enable RLS on `company_email_domains`
- Enable RLS on `blocked_email_domains`
- Fix 5 SECURITY DEFINER views
- Add verification queries

---

*For full details, see: SECURITY_AUDIT_REPORT_2025-12-03.md*
