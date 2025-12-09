# 🏗️ CNC-PILOT MVP - SYSTEM ARCHITECTURE

**Last Updated:** 2025-12-09
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Schema](#database-schema)
7. [Authentication Flow](#authentication-flow)
8. [Data Flow](#data-flow)
9. [Performance Optimizations](#performance-optimizations)
10. [Security Architecture](#security-architecture)
11. [Deployment Architecture](#deployment-architecture)

---

## 🎯 Overview

CNC-Pilot MVP is a production management system for CNC workshops built with modern web technologies.

### Key Objectives
- ⚡ **Performance** - Sub-2s page loads, 60 FPS interactions
- 🔒 **Security** - Row-level security, HTTPS, secure sessions
- 📱 **Responsive** - Mobile-first, PWA-ready
- 🧪 **Testable** - 80%+ test coverage
- 🚀 **Scalable** - Handle 10,000+ orders without degradation

---

## 🛠️ Tech Stack

### Frontend
```
├── Next.js 16 (App Router)
├── React 19
├── TypeScript 5.7
├── Tailwind CSS 4
├── shadcn/ui (Components)
├── Radix UI (Primitives)
├── Lucide Icons
└── Framer Motion (Animations)
```

### Backend & Database
```
├── Supabase
│   ├── PostgreSQL 15
│   ├── Row Level Security (RLS)
│   ├── Realtime subscriptions
│   └── Storage (Images, PDFs)
├── Next.js API Routes
└── Server Actions
```

### Testing
```
├── Vitest (Unit Tests)
├── Testing Library
├── Playwright (E2E Tests)
└── MSW (API Mocking)
```

### DevOps
```
├── Vercel (Hosting)
├── GitHub Actions (CI/CD)
├── Sentry (Error Tracking)
├── Google Analytics (Analytics)
└── UptimeRobot (Monitoring)
```

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Next.js Application (Vercel)              │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │   Pages    │  │ Components │  │   Hooks    │     │  │
│  │  │ (App Dir)  │  │  (shadcn)  │  │  (Custom)  │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │   State    │  │   Router   │  │   Cache    │     │  │
│  │  │  (React)   │  │ (Next.js)  │  │ (Browser)  │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Supabase)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Auth Layer                          │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │  Session   │  │    JWT     │  │    RLS     │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Data Layer                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │ PostgreSQL │  │  Storage   │  │  Realtime  │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Frontend Architecture

### App Router Structure

```
app/
├── (auth)/              # Auth group
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── (dashboard)/         # Dashboard group (requires auth)
│   ├── dashboard/
│   │   └── page.tsx
│   ├── orders/
│   │   ├── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── edit/
│   │           └── page.tsx
│   ├── machines/
│   │   └── page.tsx
│   ├── customers/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
├── api/                 # API routes
│   ├── orders/
│   │   └── route.ts
│   └── webhooks/
│       └── route.ts
├── demo/                # Feature showcase
│   └── page.tsx
├── layout.tsx           # Root layout
├── page.tsx             # Homepage
└── error.tsx            # Global error boundary
```

### Component Architecture

```
components/
├── ui/                  # Reusable UI components (shadcn)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── skeleton.tsx
│   └── toast.tsx
├── layout/              # Layout components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── Footer.tsx
│   └── Breadcrumbs.tsx
├── dashboard/           # Dashboard-specific
│   ├── RevenueChart.tsx
│   ├── StatsCard.tsx
│   └── RecentOrders.tsx
├── orders/              # Order-specific
│   ├── OrderCard.tsx
│   ├── OrderForm.tsx
│   ├── OrderList.tsx
│   └── OrderFilters.tsx
├── search/              # Search components
│   └── GlobalSearch.tsx
└── providers/           # Context providers
    ├── ThemeProvider.tsx
    ├── AuthProvider.tsx
    └── SupabaseProvider.tsx
```

### State Management Strategy

**Local State (useState):**
- Component UI state
- Form inputs
- Toggle states

**Server State (Supabase + React Query):**
- Database data (orders, machines, etc.)
- Automatic cache management
- Realtime subscriptions

**Global State (Context):**
- Authentication state
- Theme (dark/light mode)
- User preferences

**Example: Order Data Flow**

```tsx
// 1. Fetch with Supabase client
const { data: orders } = await supabase
  .from('orders')
  .select('*')

// 2. Store in component state
const [orders, setOrders] = useState(data)

// 3. Pass to child components
<OrderList orders={orders} />

// 4. Optimistic update
const handleDelete = (id) => {
  // Update UI immediately
  setOrders(orders.filter(o => o.id !== id))

  // Then update database
  supabase.from('orders').delete().eq('id', id)
}
```

---

## 🗄️ Backend Architecture

### Supabase Structure

```
Supabase Project
├── Auth
│   ├── Users table (managed by Supabase)
│   ├── Sessions
│   └── JWT tokens
├── Database
│   ├── public schema
│   │   ├── orders
│   │   ├── machines
│   │   ├── customers
│   │   ├── users
│   │   └── activity_log
│   └── RLS Policies (per table)
├── Storage
│   ├── orders/ (PDF attachments)
│   ├── machines/ (machine images)
│   └── avatars/ (user avatars)
└── Realtime
    └── Subscriptions on tables
```

### API Routes (Next.js)

```typescript
// app/api/orders/route.ts
export async function GET(request: Request) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*')

  return Response.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('orders')
    .insert(body)

  return Response.json(data)
}
```

### Server Actions

```typescript
// app/actions/orders.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function createOrder(formData: FormData) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_number: formData.get('order_number'),
      customer_name: formData.get('customer_name'),
    })

  if (error) throw error
  return data
}
```

---

## 📊 Database Schema

### Core Tables

#### `users`
```sql
CREATE TABLE users (
  auth_id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user',
  company_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `orders`
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  status TEXT DEFAULT 'pending',
  material_cost DECIMAL(10,2),
  labor_cost DECIMAL(10,2),
  overhead_cost DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `machines`
```sql
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT,
  status TEXT DEFAULT 'available',
  hourly_rate DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `activity_log`
```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type TEXT NOT NULL, -- 'order', 'machine', etc.
  resource_id UUID NOT NULL,
  user_id UUID REFERENCES users(auth_id),
  action TEXT NOT NULL,
  details TEXT,
  type TEXT, -- 'create', 'update', 'delete', 'comment'
  created_at TIMESTAMP DEFAULT NOW()
);
```

### RLS Policies

```sql
-- Example: Users can only see their own company's orders
CREATE POLICY "Users can view own company orders"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_id = auth.uid()
    AND users.company_id = orders.company_id
  )
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
```

### Indexes for Performance

```sql
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_deadline ON orders(deadline);
CREATE INDEX idx_activity_log_resource ON activity_log(resource_type, resource_id);
```

---

## 🔐 Authentication Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. Login (email + password)
       ▼
┌─────────────────┐
│  Supabase Auth  │
└──────┬──────────┘
       │
       │ 2. Validate credentials
       │ 3. Generate JWT
       │
       ▼
┌─────────────┐
│   Session   │ ◄─── Stored in Cookie (httpOnly, secure)
└──────┬──────┘
       │
       │ 4. Return user + session
       ▼
┌─────────────┐
│  Next.js    │
│  Middleware │ ◄─── Validates JWT on each request
└──────┬──────┘
       │
       │ 5. If valid → Allow access
       │    If invalid → Redirect to login
       ▼
┌─────────────┐
│  Protected  │
│    Page     │
└─────────────┘
```

### Session Management

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Redirect to login if not authenticated
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}
```

---

## 🔄 Data Flow

### Creating an Order (Example)

```
┌─────────────┐
│ 1. User     │
│    fills    │
│    form     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ 2. Client-side  │
│    Validation   │ ◄─── Zod schema
└──────┬──────────┘
       │
       │ If valid ▼
┌─────────────────┐
│ 3. Optimistic   │
│    Update UI    │ ◄─── Order appears immediately
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ 4. Server       │
│    Action       │ ◄─── createOrder()
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ 5. Database     │
│    Insert       │ ◄─── Supabase INSERT
└──────┬──────────┘
       │
       │ If success ▼
┌─────────────────┐
│ 6. Toast        │
│    Success      │
└──────┬──────────┘
       │
       │ If error ▼
┌─────────────────┐
│ 7. Rollback UI  │
│    Show error   │
└─────────────────┘
```

### Real-time Updates

```typescript
// Subscribe to order changes
useEffect(() => {
  const channel = supabase
    .channel('orders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setOrders([...orders, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          setOrders(orders.map(o =>
            o.id === payload.new.id ? payload.new : o
          ))
        } else if (payload.eventType === 'DELETE') {
          setOrders(orders.filter(o => o.id !== payload.old.id))
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [orders])
```

---

## ⚡ Performance Optimizations

### 1. Code Splitting

```tsx
// Lazy load heavy components
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false,
})
```

### 2. Virtual Scrolling

```tsx
// Only render visible items
<VirtualList
  items={orders}
  itemHeight={80}
  containerHeight={600}
  renderItem={(order) => <OrderCard order={order} />}
/>
```

### 3. Memoization

```tsx
// Prevent unnecessary re-renders
const MemoizedOrderCard = React.memo(OrderCard)

// Cache expensive calculations
const sortedOrders = useMemo(() =>
  orders.sort((a, b) => a.deadline.localeCompare(b.deadline)),
  [orders]
)
```

### 4. Image Optimization

```tsx
import Image from 'next/image'

<Image
  src="/product.jpg"
  width={500}
  height={300}
  alt="Product"
  loading="lazy"
  placeholder="blur"
/>
```

### 5. Caching Strategy

```
Static Assets (images, fonts, CSS):
  → Cache-Control: public, max-age=31536000, immutable

API Responses (data):
  → Cache-Control: private, max-age=60, stale-while-revalidate=30

HTML Pages:
  → Cache-Control: public, max-age=0, must-revalidate
```

---

## 🔒 Security Architecture

### Defense in Depth

```
┌──────────────────────────────────────────────┐
│          1. Network Security                  │
│  ├─ HTTPS only (TLS 1.3)                     │
│  ├─ Security headers (CSP, HSTS)             │
│  └─ DDoS protection (Vercel)                 │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│       2. Application Security                 │
│  ├─ Input validation (Zod)                   │
│  ├─ XSS prevention (React escaping)          │
│  ├─ CSRF protection (NextAuth)               │
│  └─ Rate limiting                             │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│         3. Authentication                     │
│  ├─ JWT tokens (short-lived)                 │
│  ├─ Secure cookies (httpOnly, sameSite)      │
│  ├─ Password hashing (bcrypt)                │
│  └─ Session management                        │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│          4. Database Security                 │
│  ├─ Row Level Security (RLS)                 │
│  ├─ Parameterized queries                    │
│  ├─ Least privilege principle                │
│  └─ Encrypted at rest                         │
└──────────────────────────────────────────────┘
```

---

## 🚀 Deployment Architecture

### Vercel Edge Network

```
┌──────────────────────────────────────────────────────────┐
│                    Global CDN (Vercel)                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │  US East   │  │   Europe   │  │  Asia      │         │
│  │  (Edge)    │  │  (Edge)    │  │  (Edge)    │         │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘         │
│         │                │                │               │
│         └────────────────┼────────────────┘               │
│                          │                                │
└──────────────────────────┼────────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │   Serverless Functions   │
            │   (Next.js API Routes)   │
            └──────────────┬───────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │   Supabase (Database)    │
            │   (AWS / Postgres)       │
            └──────────────────────────┘
```

### CI/CD Pipeline

```
┌──────────────────────────────────────────────────┐
│  1. Developer pushes to GitHub                    │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  2. GitHub Actions triggers                       │
│     ├─ Run linters (ESLint, Prettier)            │
│     ├─ Run type check (TypeScript)               │
│     ├─ Run unit tests (Vitest)                   │
│     └─ Run E2E tests (Playwright)                │
└──────────────┬───────────────────────────────────┘
               │
               │ If tests pass ▼
┌──────────────────────────────────────────────────┐
│  3. Vercel builds app                             │
│     ├─ npm run build                              │
│     ├─ Static optimization                        │
│     └─ Generate production bundle                 │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  4. Deploy to Vercel Edge                         │
│     ├─ Deploy to preview (PR)                     │
│     └─ Deploy to production (main branch)         │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  5. Post-deployment checks                        │
│     ├─ Health check (GET /)                       │
│     ├─ Lighthouse CI                              │
│     └─ Send notification to Slack                 │
└──────────────────────────────────────────────────┘
```

---

## 📈 Monitoring & Observability

### Metrics to Track

```
Performance:
  ├─ Page Load Time (LCP)
  ├─ First Input Delay (FID)
  ├─ Cumulative Layout Shift (CLS)
  └─ Time to Interactive (TTI)

Availability:
  ├─ Uptime (99.9% SLA)
  ├─ Response Time (< 200ms avg)
  └─ Error Rate (< 1%)

Business:
  ├─ Daily Active Users
  ├─ Orders Created
  ├─ Revenue Tracked
  └─ User Retention
```

### Error Monitoring (Sentry)

```typescript
// Automatic error capture
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of requests
  environment: process.env.NODE_ENV,
})

// Manual error tracking
try {
  await createOrder(data)
} catch (error) {
  Sentry.captureException(error, {
    tags: { operation: 'create_order' },
    extra: { orderData: data },
  })
  throw error
}
```

---

## 🔮 Future Architecture Considerations

### Potential Improvements

1. **Redis Caching Layer** - Cache frequently accessed data
2. **Message Queue** - For async operations (email, reports)
3. **Microservices** - Separate order service, machine service
4. **GraphQL** - Replace REST APIs for more flexible queries
5. **WebSocket** - Replace polling with true real-time
6. **Elasticsearch** - For advanced search capabilities

---

## 📚 Additional Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)

---

**Questions about architecture?** Open a discussion on GitHub!
