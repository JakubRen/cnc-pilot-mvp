# DAY 7 ACTION PLAN: Inventory Module (Magazyn + Śledzenie Partii)

**Data:** 2025-11-11
**Czas:** 8 godzin
**Cel:** Zbudować kompletny moduł magazynowy z CRUD operations, low stock alerts i foundation dla traceability

---

## 🎯 DLACZEGO MAGAZYN? (Business Case z PERSONA.md)

### Problem #3 Magdy: "Brak kontroli nad stanami magazynowymi"
> "Magazyn będzie musiał ręcznie wprowadzać zużycie materiału na dany detal."

**Skutki tego problemu:**
- Kosztowne przestoje produkcyjne (gdy nagle brakuje materiału)
- Każda godzina przestoju maszyny CNC = ~150 PLN straty
- Brak wiedzy "co jest w magazynie" bez fizycznej inwentaryzacji
- Chaos i frustracja na hali produkcyjnej

### Problem #5 Magdy: "Presja audytów i wymóg śledzenia partii (traceability)"
> "Audytorzy np. przy inwenturach rocznych często proszą wyrywkowo o pokazanie w systemie lub wersji papierowej odpowiednich dokumentów źródłowych... Jeśli to się rozjedzie, trzeba się będzie tłumaczyć."

**Ryzyko biznesowe:**
- Utrata kluczowego kontraktu OEM z powodu braku traceability
- Chaos podczas audytów (szukanie w segregatorach)
- Brak profesjonalnego image

### Z OFERTY.md: "Magazyn i Śledzenie Partii Gotowe na Audyt"
**Korzyść biznesowa:**
- Zabezpieczenie kluczowych kontraktów
- Eliminacja przestojów
- Budowa wizerunku niezawodnego, profesjonalnego partnera

**Dla kogo kluczowe:**
Firmy współpracujące lub aspirujące do współpracy z wymagającymi klientami z branży OEM, Automotive, Medycznej

---

## 📋 SCOPE DAY 7

### Co zbudujemy DZISIAJ:
✅ Inventory table (Supabase schema)
✅ Inventory CRUD operations (Create, Read, Update, Delete)
✅ Inventory list page z tabelą
✅ Add/Edit inventory forms
✅ Low stock indicators (visual badges)
✅ Batch tracking foundation (batch_number field)
✅ Deploy to production

### Co ODŁOŻYMY na Day 8+:
⏳ Automatyczne odejmowanie materiału po zleceniu
⏳ Historia ruchów magazynowych (logs)
⏳ QR codes dla partii
⏳ Zaawansowane raporty magazynowe
⏳ Integracja z orders (material dropdown)

**Filozofia:** Working MVP first, advanced features later!

---

## ⏰ GODZINOWY HARMONOGRAM

### 🔧 HOUR 1-2: DATABASE SCHEMA + BASIC SETUP

#### Zadania:
1. **Inventory Table Schema (Supabase SQL)**
   ```sql
   CREATE TABLE inventory (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     material_name TEXT NOT NULL,
     material_type TEXT NOT NULL, -- 'stal' | 'aluminium' | 'mosiądz' | 'inne'
     quantity DECIMAL(10,2) NOT NULL CHECK (quantity >= 0),
     unit TEXT NOT NULL, -- 'kg' | 'szt' | 'm' | 'l'
     min_threshold DECIMAL(10,2), -- alert threshold
     supplier TEXT,
     batch_number TEXT, -- for traceability (foundation)
     location TEXT, -- 'Magazyn A' | 'Hala 1' | etc
     notes TEXT,
     company_id UUID REFERENCES companies(id) NOT NULL,
     created_by BIGINT REFERENCES users(id) NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **RLS Policies (Row Level Security)**
   ```sql
   -- SELECT: Users can view their company's inventory
   CREATE POLICY "Users can view company inventory" ON inventory
   FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

   -- INSERT: Authenticated users can add inventory to their company
   CREATE POLICY "Users can add company inventory" ON inventory
   FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

   -- UPDATE: Users can update their company's inventory
   CREATE POLICY "Users can update company inventory" ON inventory
   FOR UPDATE USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

   -- DELETE: Only owners can delete inventory
   CREATE POLICY "Owners can delete company inventory" ON inventory
   FOR DELETE USING (
     company_id = (SELECT company_id FROM users WHERE id = auth.uid()) AND
     EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
   );
   ```

3. **Test data (insert sample inventory)**
   ```sql
   INSERT INTO inventory (material_name, material_type, quantity, unit, min_threshold, supplier, location, company_id, created_by)
   VALUES
   ('Stal S355', 'stal', 150, 'kg', 50, 'Stalprodukt', 'Magazyn A', '<company_id>', <user_id>),
   ('Aluminium 6082', 'aluminium', 80, 'kg', 30, 'Alupol', 'Magazyn A', '<company_id>', <user_id>),
   ('Śruby M8x30', 'inne', 500, 'szt', 100, 'Wurth', 'Magazyn B', '<company_id>', <user_id>);
   ```

**Deliverable Hour 1-2:**
- ✅ Inventory table w Supabase
- ✅ RLS policies aktywne
- ✅ Test data dodane

---

### 🎨 HOUR 3-4: INVENTORY LIST PAGE + CRUD FOUNDATION

#### Zadania:

1. **Create: app/inventory/page.tsx (Server Component)**
   - Fetch all inventory items (Supabase query)
   - Display in table with Navbar
   - Add "Add New Item" button
   - Link to home page

2. **Create: app/inventory/InventoryList.tsx (Client Component)**
   - Table z kolumnami:
     - Material Name
     - Type (badge color-coded)
     - Quantity + Unit
     - Location
     - Low Stock indicator (if quantity < min_threshold)
     - Actions (View, Edit, Delete)
   - Delete functionality (only for owners)
   - Low stock visual badge (red/yellow)
   - Hover effects, responsive design

**Kod wzorcowy z Day 3-6:**
- Copy pattern z app/orders/OrderList.tsx
- Copy pattern z app/users/UserList.tsx (delete with role check)
- Use same styling (slate-800, hover states, etc.)

**Deliverable Hour 3-4:**
- ✅ Inventory list page działa (http://localhost:3000/inventory)
- ✅ Table wyświetla dane z Supabase
- ✅ Low stock indicators visible
- ✅ Delete button (only for owners)

---

### 📝 HOUR 5-6: ADD + EDIT FORMS

#### Zadania:

1. **Create: app/inventory/add/page.tsx (Add Inventory Form)**
   - React Hook Form + Zod validation
   - 2-column layout (jak w Orders)
   - Fields:
     - Material Name* (text)
     - Material Type* (select: stal, aluminium, mosiądz, inne)
     - Quantity* (number, min: 0)
     - Unit* (select: kg, szt, m, l)
     - Min Threshold (number, optional)
     - Supplier (text, optional)
     - Batch Number (text, optional) - foundation for traceability
     - Location (text, optional)
     - Notes (textarea, optional)
   - Toast notifications (success/error)
   - Redirect to /inventory after success

2. **Create: app/inventory/[id]/edit/page.tsx + EditInventoryForm.tsx**
   - Pre-filled form (useEffect + setValue pattern z Day 3)
   - Same validation as add form
   - Update Supabase
   - Toast notifications
   - Redirect after success

**Zod Schema Example:**
```typescript
const inventorySchema = z.object({
  material_name: z.string().min(2, 'Material name must be at least 2 characters'),
  material_type: z.enum(['stal', 'aluminium', 'mosiądz', 'inne']),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  unit: z.enum(['kg', 'szt', 'm', 'l']),
  min_threshold: z.number().min(0).optional(),
  supplier: z.string().optional(),
  batch_number: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
})
```

**Deliverable Hour 5-6:**
- ✅ Add inventory form działa
- ✅ Edit inventory form działa (pre-fill working)
- ✅ Validation working (Zod)
- ✅ Toast notifications
- ✅ Full CRUD complete

---

### 🚀 HOUR 7-8: TESTING + POLISH + DEPLOY

#### Zadania:

1. **Testing Checklist:**
   ```
   ✅ Add inventory item (wszystkie fields)
   ✅ Edit inventory item (pre-fill works)
   ✅ Delete inventory item (only owner)
   ✅ Low stock indicator shows (quantity < min_threshold)
   ✅ Table sorting (by material_name)
   ✅ Mobile responsive
   ✅ Toast notifications work
   ✅ Navigation works (home ↔ inventory)
   ✅ RLS policies work (multi-tenant isolation)
   ```

2. **UI Polish:**
   - Check consistent styling with Orders/Users
   - Low stock badge color (red if < 20% threshold, yellow if < 50%)
   - Material type badges (color-coded: steel = blue, aluminum = green, etc.)
   - Hover states
   - Loading skeletons (optional, if time)

3. **Update Navbar:**
   - Add "Inventory" link to Navbar component
   - Add to middleware.ts protected routes

4. **Update home page:**
   - Add link to /inventory
   - Update version to "Day 7"

5. **Git Commit + Deploy:**
   ```bash
   git add .
   git status
   git diff --cached --stat
   git commit -m "Day 7: Complete Inventory Module with CRUD and low stock alerts

   Built comprehensive inventory management module with full CRUD operations,
   low stock indicators, and foundation for batch traceability.

   New Features:
   - Inventory CRUD: Add, view, edit, delete inventory items
   - Low stock indicators: Visual badges when quantity < threshold
   - Batch tracking foundation: batch_number field for traceability
   - Material types: Steel, aluminum, brass, other (color-coded)
   - Multi-unit support: kg, pcs, m, l
   - Role-based delete: Only owners can remove inventory
   - Supplier tracking: Track material suppliers
   - Location management: Track where materials are stored

   Components Created:
   - app/inventory/page.tsx: Main inventory page (server component)
   - app/inventory/InventoryList.tsx: Table with delete functionality
   - app/inventory/add/page.tsx: Add inventory form with validation
   - app/inventory/[id]/edit/page.tsx: Edit inventory page
   - app/inventory/[id]/edit/EditInventoryForm.tsx: Pre-filled edit form

   Database Schema:
   - inventory table with 14 fields
   - 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)
   - Multi-tenant isolation via company_id
   - Quantity validation (must be >= 0)

   Technical Improvements:
   - Zod validation for all forms
   - React Hook Form for efficient form management
   - Low stock calculation logic
   - Material type color coding
   - Consistent styling with Orders/Users modules

   Updated:
   - components/layout/Navbar.tsx: Added Inventory link
   - middleware.ts: Added /inventory route protection
   - app/page.tsx: Added inventory link, version "Day 7"

   Business Value:
   - Solves PERSONA Problem #3: Brak kontroli nad magazynem
   - Foundation for Problem #5: Śledzenie partii (batch tracking)
   - Eliminates costly production downtime due to material shortage
   - Professional image for OEM client audits
   - Part of OPTIMAL tier (697 PLN/month) feature set

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"

   git push
   ```

6. **Production Verification:**
   ```bash
   curl https://cnc-pilot-mvp-cpzd.vercel.app/api/health
   ```
   - Should show: `"version":"Day 7"`

**Deliverable Hour 7-8:**
- ✅ All tests passing
- ✅ UI polished
- ✅ Git committed
- ✅ Deployed to production
- ✅ Health check confirms Day 7

---

## 📊 SUCCESS METRICS

### Co osiągniemy po Day 7:
```
✅ Inventory table (14 fields)
✅ 4 RLS policies
✅ Inventory list page
✅ Add inventory form
✅ Edit inventory form (pre-fill)
✅ Delete functionality (owner-only)
✅ Low stock indicators
✅ Batch tracking foundation
✅ Multi-unit support (kg, szt, m, l)
✅ Material type categorization
✅ Deployed to production
```

### Business Value Created:
```
✅ Eliminuje Problem #3 z PERSONA.md (brak kontroli nad magazynem)
✅ Foundation dla Problem #5 (traceability dla audytów OEM)
✅ Zapobiega kosztownym przestojom (150 PLN/h maszyny)
✅ Profesjonalny image dla klientów OEM
✅ Part of OPTIMAL tier feature set (697 PLN/month)
```

### Progress Toward MVP:
```
Before Day 7: 2/5 core modules (Users, Orders)
After Day 7:  3/5 core modules (Users, Orders, Inventory)

Remaining:
- Time Tracking (Day 8-9)
- Planning View (Day 10-11)
- Dashboard + Polish (Day 12-14)
```

---

## 🛠️ TROUBLESHOOTING

### Expected Issues & Solutions:

**Issue 1: RLS blocking insert**
```
Error: "new row violates row-level security policy"
Solution: Check company_id is set correctly, user is authenticated
```

**Issue 2: Decimal type in forms**
```
Error: Zod expecting number, getting string
Solution: Use z.coerce.number() or parseFloat() before submit
```

**Issue 3: Delete not working**
```
Error: RLS policy blocks delete
Solution: Check user role = 'owner', test with owner account
```

**Issue 4: Low stock not showing**
```
Problem: Badge not visible even when quantity < threshold
Solution: Check threshold is set (not null), check calculation logic
```

---

## 🎯 CO DALEJ? (Day 8 Preview)

### Day 8: Time Tracking (Rejestracja Czasu Pracy)
**Problem z PERSONA.md #7:** "Niska wydajność i ukryte przestoje"
**Problem #4:** "Brak wiedzy o rzeczywistych kosztach produkcji"

**Co zbudujemy Day 8:**
- Time logs table
- Start/Stop timer component
- Active timer indicator
- Time logs per order
- Cost calculation foundation

**Dlaczego to ważne:**
> "Gdybym miała natychmiast wiedzieć, ile faktycznie kosztuje mi wyprodukowanie tej śruby, byłabym w stanie negocjować z odwagą."

---

## 📝 NOTES

### Learning from Day 1-6:
- ✅ Copy successful patterns (Orders, Users)
- ✅ Use same styling for consistency
- ✅ Toast notifications for all actions
- ✅ Role-based access control
- ✅ RLS policies for security
- ✅ 2-column forms for better UX

### Key Patterns to Reuse:
1. **Server Component pattern** (page.tsx fetches data)
2. **Client Component pattern** (*List.tsx for interactivity)
3. **Form pattern** (React Hook Form + Zod)
4. **Edit pattern** (useEffect + setValue for pre-fill)
5. **Delete pattern** (role check + confirmation + toast)

### Time Management:
- Hour 1-2: Schema (może być szybciej jeśli smooth)
- Hour 3-4: List page (pattern copy z Orders)
- Hour 5-6: Forms (pattern copy z Day 3)
- Hour 7-8: Testing + Deploy (buffer dla bugów)

---

**READY? LET'S BUILD! 🚀**

Day 7 = Inventory Module = Problem #3 & #5 SOLVED!
