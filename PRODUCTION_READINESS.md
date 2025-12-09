# 🚀 PRODUCTION READINESS CHECKLIST

**Last Updated:** 2025-12-09
**Version:** 1.0.0
**Status:** Ready for Production ✅

---

## 📋 TABLE OF CONTENTS

1. [Environment Setup](#environment-setup)
2. [Security Checklist](#security-checklist)
3. [Performance Optimization](#performance-optimization)
4. [SEO & Meta Tags](#seo--meta-tags)
5. [Analytics & Monitoring](#analytics--monitoring)
6. [Error Tracking](#error-tracking)
7. [Database Configuration](#database-configuration)
8. [Build & Deployment](#build--deployment)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Rollback Plan](#rollback-plan)

---

## 1. ENVIRONMENT SETUP

###  Environment Variables

Create `.env.production`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Next.js
NEXT_PUBLIC_SITE_URL=https://cnc-pilot.com
NEXTAUTH_URL=https://cnc-pilot.com
NEXTAUTH_SECRET=your-secret-key-min-32-chars

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
SENTRY_DSN=https://xxx@sentry.io/xxx

# Email (Optional)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

### ✅ Checklist:
- [ ] All environment variables are set in Vercel
- [ ] No sensitive keys in `.env.local` are committed to git
- [ ] `.env.example` is updated with all required variables
- [ ] NEXTAUTH_SECRET is cryptographically secure (32+ chars)
- [ ] NEXT_PUBLIC_SITE_URL points to production domain

---

## 2. SECURITY CHECKLIST

### 🔒 Row Level Security (RLS)

**CRITICAL: Verify RLS is enabled on ALL tables**

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Should return rowsecurity = true for all tables
```

### ✅ Security Checklist:
- [ ] **RLS enabled** on all public tables
- [ ] **Policies tested** for: authenticated users, anonymous users, role-based access
- [ ] **SQL Injection** - All queries use parameterized statements
- [ ] **XSS Prevention** - All user input is sanitized
- [ ] **CSRF Protection** - Enabled (NextAuth handles this)
- [ ] **HTTPS Only** - Vercel enforces this by default
- [ ] **Content Security Policy** - Configured in `next.config.js`
- [ ] **Rate Limiting** - Implemented on critical endpoints
- [ ] **API Keys** - Stored in env variables, never in code
- [ ] **Password Requirements** - Min 8 chars, enforced in validation
- [ ] **Session Management** - Secure cookies (httpOnly, secure, sameSite)

### Content Security Policy

Add to `next.config.js`:

```js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
```

---

## 3. PERFORMANCE OPTIMIZATION

### ✅ Performance Checklist:
- [ ] **Lighthouse Score** - Overall 90+
  - [ ] Performance: 90+
  - [ ] Accessibility: 95+
  - [ ] Best Practices: 95+
  - [ ] SEO: 95+
- [ ] **Core Web Vitals**
  - [ ] LCP (Largest Contentful Paint) < 2.5s
  - [ ] FID (First Input Delay) < 100ms
  - [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] **Bundle Size** - Initial load < 200KB
- [ ] **Image Optimization** - All images use Next.js Image component
- [ ] **Code Splitting** - Heavy components are lazy-loaded
- [ ] **Fonts** - Using next/font for optimal loading
- [ ] **Caching** - Proper cache headers on static assets
- [ ] **Compression** - Gzip/Brotli enabled (Vercel default)
- [ ] **Service Worker** - PWA service worker registered
- [ ] **Virtual Lists** - Used for lists > 100 items

### Build Analysis

Run bundle analyzer:

```bash
npm run build
npm run analyze
```

Check for:
- Large dependencies (> 50KB)
- Duplicate packages
- Tree-shaking opportunities

---

## 4. SEO & META TAGS

### ✅ SEO Checklist:
- [ ] **robots.txt** - Created and accessible at `/robots.txt`
- [ ] **sitemap.xml** - Generated and submitted to Google Search Console
- [ ] **Meta Tags** - Title, description, OG tags on all pages
- [ ] **Favicon** - Multiple sizes (16x16, 32x32, 180x180, 192x192, 512x512)
- [ ] **Structured Data** - JSON-LD for organization/product
- [ ] **Canonical URLs** - Set on all pages
- [ ] **Alt Text** - All images have descriptive alt text
- [ ] **Semantic HTML** - Proper h1-h6, article, section tags
- [ ] **Mobile-Friendly** - Tested on multiple devices
- [ ] **Page Speed** - Optimized for fast loading

### robots.txt

```
# public/robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: https://cnc-pilot.com/sitemap.xml
```

### sitemap.xml

```xml
<!-- public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://cnc-pilot.com</loc>
    <lastmod>2025-12-09</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://cnc-pilot.com/dashboard</loc>
    <lastmod>2025-12-09</lastmod>
    <priority>0.8</priority>
  </url>
  <!-- Add more URLs -->
</urlset>
```

### Meta Tags Template

```tsx
// app/layout.tsx
export const metadata = {
  metadataBase: new URL('https://cnc-pilot.com'),
  title: {
    default: 'CNC-Pilot | Zarządzanie Produkcją CNC',
    template: '%s | CNC-Pilot'
  },
  description: 'System zarządzania produkcją CNC - zamówienia, maszyny, kalkulacja kosztów',
  keywords: ['CNC', 'zarządzanie produkcją', 'obróbka CNC', 'kalkulacja kosztów'],
  authors: [{ name: 'Your Company' }],
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    url: 'https://cnc-pilot.com',
    siteName: 'CNC-Pilot',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CNC-Pilot'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CNC-Pilot',
    description: 'System zarządzania produkcją CNC',
    images: ['/og-image.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}
```

---

## 5. ANALYTICS & MONITORING

### Google Analytics 4

Add to `app/layout.tsx`:

```tsx
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### UptimeRobot Monitoring

- [ ] **Uptime Monitor** configured (5-minute intervals)
- [ ] **Status Page** public at status.cnc-pilot.com
- [ ] **Alerts** sent to email/Slack on downtime

### ✅ Monitoring Checklist:
- [ ] Google Analytics installed
- [ ] Search Console verified
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Performance monitoring (Vercel Analytics)
- [ ] Error tracking (Sentry - see below)

---

## 6. ERROR TRACKING

### Sentry Setup

```bash
npm install @sentry/nextjs
```

Initialize Sentry:

```bash
npx @sentry/wizard@latest -i nextjs
```

This creates:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

### ✅ Error Tracking Checklist:
- [ ] Sentry installed and configured
- [ ] Source maps uploaded to Sentry
- [ ] Error boundaries catch and report errors
- [ ] 404/500 errors are tracked
- [ ] Performance monitoring enabled
- [ ] Alerts configured for critical errors

---

## 7. DATABASE CONFIGURATION

### ✅ Database Checklist:
- [ ] **Backups** - Automated daily backups enabled in Supabase
- [ ] **Indexes** - Created on frequently queried columns
- [ ] **RLS Policies** - All tested and verified
- [ ] **Connection Pooling** - Enabled (Supabase default)
- [ ] **Query Performance** - Slow queries identified and optimized
- [ ] **Data Migration** - Production data migrated from staging
- [ ] **Seed Data** - Initial data populated

### Database Indexes

```sql
-- Add indexes for performance
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_deadline ON orders(deadline);
CREATE INDEX idx_machines_status ON machines(status);
CREATE INDEX idx_activity_log_resource ON activity_log(resource_type, resource_id);
```

### Database Health Check

```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for missing indexes
SELECT
  schemaname,
  tablename,
  attname,
  null_frac,
  avg_width,
  n_distinct
FROM pg_stats
WHERE schemaname = 'public'
  AND null_frac < 0.5
  AND n_distinct > 100
ORDER BY null_frac;
```

---

## 8. BUILD & DEPLOYMENT

### Vercel Deployment

#### ✅ Pre-Deployment Checklist:
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Environment variables set in Vercel dashboard
- [ ] Custom domain configured and SSL active
- [ ] Edge functions tested (if used)

### Build Commands

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit"
  }
}
```

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["fra1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

### GitHub Actions CI/CD (Optional)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run E2E tests
        run: npx playwright test

      - name: Build
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 9. POST-DEPLOYMENT VERIFICATION

### ✅ Smoke Tests (After Deployment):

**Homepage:**
- [ ] Site loads (https://cnc-pilot.com)
- [ ] No console errors
- [ ] HTTPS active (green padlock)
- [ ] Service Worker registered

**Authentication:**
- [ ] Login works
- [ ] Logout works
- [ ] Protected routes redirect to login

**Core Features:**
- [ ] Dashboard loads with data
- [ ] Can create new order
- [ ] Can edit existing order
- [ ] Can delete order
- [ ] Search works (Ctrl+K)
- [ ] Dark mode toggle works

**Performance:**
- [ ] Lighthouse score 90+ (run on production URL)
- [ ] Images load correctly
- [ ] No broken links (404s)

**Monitoring:**
- [ ] Analytics tracking (check Google Analytics Real-Time)
- [ ] Errors are logged to Sentry
- [ ] Uptime monitor shows "up"

### Manual Testing Checklist

Run through these flows:

1. **User Registration & Login**
   - [ ] Register new account
   - [ ] Login with credentials
   - [ ] Forgot password flow
   - [ ] Logout

2. **Order Management**
   - [ ] Create order
   - [ ] Edit order
   - [ ] Delete order
   - [ ] Search for order
   - [ ] Export orders to CSV

3. **Machine Management**
   - [ ] View machines list
   - [ ] Update machine status
   - [ ] Machine utilization stats

4. **Mobile Responsiveness**
   - [ ] Test on iPhone (Safari)
   - [ ] Test on Android (Chrome)
   - [ ] Navigation menu works
   - [ ] Forms are usable

5. **PWA**
   - [ ] Can install app on mobile
   - [ ] Works offline (basic pages)
   - [ ] Push notifications (if enabled)

---

## 10. ROLLBACK PLAN

### In case of critical issues:

#### Option 1: Rollback in Vercel Dashboard
1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "…" → Promote to Production

#### Option 2: Revert via Git
```bash
git revert HEAD
git push origin main
```
Vercel auto-deploys from main.

#### Option 3: Disable Problematic Feature
```bash
# Add feature flag in .env
NEXT_PUBLIC_FEATURE_X_ENABLED=false
```
Redeploy.

### Emergency Contacts
- **Vercel Support:** support@vercel.com
- **Supabase Support:** support@supabase.io
- **Team Lead:** [Your contact]

---

## 🎯 FINAL PRODUCTION CHECKLIST

**Before going live, verify ALL of the following:**

### Environment
- [ ] Production environment variables set
- [ ] No `.env.local` secrets in git
- [ ] HTTPS enforced
- [ ] Custom domain configured

### Security
- [ ] RLS enabled on all tables
- [ ] Security headers configured
- [ ] No hardcoded secrets in code
- [ ] API rate limiting enabled

### Performance
- [ ] Lighthouse score 90+
- [ ] Core Web Vitals pass
- [ ] Images optimized
- [ ] Bundle size < 200KB

### Monitoring
- [ ] Analytics tracking
- [ ] Error monitoring (Sentry)
- [ ] Uptime monitoring
- [ ] Alerts configured

### Testing
- [ ] 243 unit tests pass
- [ ] E2E tests pass
- [ ] Manual smoke tests done
- [ ] Mobile tested

### Database
- [ ] Backups enabled
- [ ] Indexes created
- [ ] Production data migrated
- [ ] RLS policies verified

### SEO
- [ ] Meta tags on all pages
- [ ] robots.txt configured
- [ ] sitemap.xml submitted
- [ ] Google Search Console verified

### Documentation
- [ ] README.md updated
- [ ] FEATURES_COMPLETE.md up to date
- [ ] API documentation complete
- [ ] Deployment guide written

---

## ✅ PRODUCTION READY!

If all checkboxes above are ✅, you're ready to deploy!

```bash
vercel --prod
```

**Post-deployment:**
1. Monitor Sentry for errors
2. Watch analytics for traffic
3. Check UptimeRobot status
4. Celebrate! 🎉

---

**Questions?** Check:
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
