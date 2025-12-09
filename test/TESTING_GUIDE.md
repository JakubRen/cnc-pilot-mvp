# 🧪 TESTING GUIDE - WSZYSTKIE 27 FEATURES

**Data utworzenia:** 2025-12-09
**Projekt:** CNC-Pilot MVP
**Cel:** Instrukcje testowania wszystkich zaimplementowanych features

---

## 📋 SPIS TREŚCI

### CZĘŚĆ 1: ORYGINALNE 12 FEATURES
1. Error Boundary
2. Button Loading States
3. Skeleton Loaders
4. Optimistic Updates
5. Keyboard Navigation
6. Toast Improvements
7. Form Validation
8. Micro-animations
9. Empty States
10. Dark Mode Transitions
11. Breadcrumbs
12. Global Search

### CZĘŚĆ 2: NOWE 15 FEATURES
13. Autosave Formularzy
14. Bulk Actions
15. Activity Log
16. Image Optimization
17. Virtual Lists
18. Infinite Scroll
19. Drag & Drop
20. Code Splitting
21. Memoization
22. Real-time Data
23. Export Excel/CSV/PDF
24. Comments System
25. PWA Enhancement
26. Multi-language (i18n)
27. Search Improvements

---

# CZĘŚĆ 1: ORYGINALNE 12 FEATURES

## 1. ✅ ERROR BOUNDARY

**Lokalizacja:** `components/ui/ErrorBoundary.tsx`

### Jak testować:

#### Test 1: Symuluj błąd w komponencie
```tsx
// W dowolnym komponencie (np. OrdersPage)
function OrdersPage() {
  const [shouldError, setShouldError] = useState(false)

  if (shouldError) {
    throw new Error('Test error!')
  }

  return (
    <div>
      <button onClick={() => setShouldError(true)}>
        Wywołaj błąd
      </button>
    </div>
  )
}
```

**Oczekiwany rezultat:**
- ✅ Aplikacja NIE crashuje
- ✅ Pokazuje się fallback UI z komunikatem błędu
- ✅ Przycisk "Spróbuj ponownie" odświeża komponent
- ✅ Przycisk "Wróć do strony głównej" przekierowuje do `/`

#### Test 2: Błąd podczas ładowania danych
```tsx
// Symuluj błąd API
const { data, error } = await supabase
  .from('invalid_table') // ❌ Nieistniejąca tabela
  .select('*')
```

**Oczekiwany rezultat:**
- ✅ ErrorBoundary łapie błąd
- ✅ Pokazuje przyjazny komunikat dla użytkownika

### Gdzie przetestować:
- Strony: `/orders`, `/machines`, `/dashboard`
- DevTools Console: sprawdź czy błąd jest logowany

---

## 2. ⏳ BUTTON LOADING STATES

**Lokalizacja:** `components/ui/Button.tsx`

### Jak testować:

#### Test 1: Button z loading state
```tsx
function TestButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsLoading(false)
  }

  return (
    <Button onClick={handleClick} loading={isLoading}>
      Zapisz zamówienie
    </Button>
  )
}
```

**Oczekiwany rezultat:**
- ✅ Podczas ładowania: spinner + tekst "Zapisywanie..."
- ✅ Button jest disabled podczas ładowania
- ✅ Nie można kliknąć drugi raz
- ✅ Po zakończeniu wraca do normalnego stanu

#### Test 2: Różne warianty
```tsx
<Button loading={true} variant="primary">Primary Loading</Button>
<Button loading={true} variant="secondary">Secondary Loading</Button>
<Button loading={true} variant="danger">Danger Loading</Button>
```

**Oczekiwany rezultat:**
- ✅ Wszystkie warianty pokazują spinner
- ✅ Kolory są odpowiednie dla wariantu

### Gdzie przetestować:
- Formularz tworzenia zamówienia: klik "Zapisz"
- Formularz edycji: klik "Aktualizuj"
- Bulk actions: klik "Usuń zaznaczone"

---

## 3. 💀 SKELETON LOADERS

**Lokalizacja:** `components/ui/Skeleton.tsx`

### Jak testować:

#### Test 1: Skeleton podczas ładowania listy
```tsx
function OrdersList() {
  const [isLoading, setIsLoading] = useState(true)
  const [orders, setOrders] = useState([])

  useEffect(() => {
    setTimeout(() => {
      setOrders([...mockOrders])
      setIsLoading(false)
    }, 2000)
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <div>{/* Lista zamówień */}</div>
}
```

**Oczekiwany rezultat:**
- ✅ Skeleton ma pulsującą animację (shimmer)
- ✅ Layout skeletona odpowiada rzeczywistym danym
- ✅ Po załadowaniu płynnie zamienia się w prawdziwy content
- ✅ W dark mode ma odpowiedni kolor

#### Test 2: Skeleton dla różnych elementów
```tsx
<Skeleton className="h-4 w-full" />          // Linia tekstu
<Skeleton className="h-32 w-full" />         // Karta
<Skeleton className="h-12 w-12 rounded-full" /> // Avatar
```

### Gdzie przetestować:
- Dashboard: odśwież stronę (F5)
- Lista zamówień: wyczyść cache i załaduj
- DevTools → Network → Throttling: "Slow 3G"

---

## 4. ⚡ OPTIMISTIC UPDATES

**Lokalizacja:** `hooks/useOptimistic.ts`

### Jak testować:

#### Test 1: Optimistic delete
```tsx
const { execute: deleteOrder } = useOptimistic({
  onExecute: async (orderId) => {
    await supabase.from('orders').delete().eq('id', orderId)
  },
  onSuccess: (orderId) => {
    setOrders(orders.filter(o => o.id !== orderId))
  },
})

const handleDelete = (orderId) => {
  // NATYCHMIAST usuwa z UI (przed API)
  setOrders(orders.filter(o => o.id !== orderId))

  deleteOrder(orderId)
}
```

**Oczekiwany rezultat:**
- ✅ Zamówienie znika NATYCHMIAST z listy
- ✅ Jeśli API sukces: zostaje usunięte
- ✅ Jeśli API błąd: wraca na listę + toast error
- ✅ Brak migania/re-renderowania

#### Test 2: Optimistic status change
```tsx
const handleStatusChange = (orderId, newStatus) => {
  // Zmień lokalnie
  setOrders(orders.map(o =>
    o.id === orderId ? { ...o, status: newStatus } : o
  ))

  // Wyślij do API
  execute(async () => {
    await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
  })
}
```

### Gdzie przetestować:
- Lista zamówień: usuń zamówienie (sprawdź czy znika od razu)
- Zmiana statusu: zmień status (sprawdź czy zmienia się od razu)
- DevTools Network: wyłącz internet PRZED kliknięciem → sprawdź rollback

---

## 5. ⌨️ KEYBOARD NAVIGATION

**Lokalizacja:** `hooks/useKeyboardShortcut.ts`

### Jak testować:

#### Test 1: Global shortcuts

**Skróty do przetestowania:**
- `Ctrl + K` (lub `Cmd + K` na Mac) → Otwiera Global Search
- `Ctrl + N` → Nowe zamówienie
- `Ctrl + S` → Zapisz (w formularzach)
- `Escape` → Zamknij modal/dialog
- `Enter` → Zatwierdź (w formularzu)
- `Tab` → Nawigacja między polami
- `Shift + Tab` → Nawigacja wstecz

**Oczekiwany rezultat:**
- ✅ Każdy skrót działa
- ✅ W input fields: `Ctrl + K` NIE wycina tekstu (preventDefault)
- ✅ Pokazuje się toast z nazwą akcji

#### Test 2: Custom shortcuts w komponencie
```tsx
function OrdersPage() {
  useKeyboardShortcut('ctrl+n', () => {
    router.push('/orders/new')
  })

  useKeyboardShortcut('ctrl+e', () => {
    setEditMode(true)
  })
}
```

### Gdzie przetestować:
- Każda strona w aplikacji
- Otwórz DevTools Console → sprawdź logi shortcutów
- Sprawdź czy `Ctrl + K` nie koliduje z przeglądarką

---

## 6. 🔔 TOAST IMPROVEMENTS

**Lokalizacja:** `lib/toast.tsx`

### Jak testować:

#### Test 1: Wszystkie typy toastów
```tsx
import { toast } from '@/lib/toast'

// Success
toast.success('Zamówienie zapisane!')

// Error
toast.error('Błąd zapisu!')

// Info
toast.info('Nowa wiadomość od klienta')

// Warning
toast.warning('Termin za 2 dni!')

// Loading
const loadingToast = toast.loading('Zapisywanie...')
// Później:
toast.success('Zapisano!', { id: loadingToast })
```

**Oczekiwany rezultat:**
- ✅ Success: zielony + ikona checkmark
- ✅ Error: czerwony + ikona X
- ✅ Info: niebieski + ikona info
- ✅ Warning: pomarańczowy + ikona alert
- ✅ Loading: spinner

#### Test 2: Toast z akcją (undo)
```tsx
toast.success('Zamówienie usunięte', {
  action: {
    label: 'Cofnij',
    onClick: () => {
      // Przywróć zamówienie
      restoreOrder(orderId)
    }
  }
})
```

**Oczekiwany rezultat:**
- ✅ Pokazuje przycisk "Cofnij"
- ✅ Kliknięcie wykonuje akcję
- ✅ Toast znika po kliknięciu

#### Test 3: Toast z promise
```tsx
toast.promise(
  saveOrder(),
  {
    loading: 'Zapisywanie...',
    success: 'Zapisano!',
    error: 'Błąd zapisu'
  }
)
```

**Oczekiwany rezultat:**
- ✅ Najpierw: loading toast
- ✅ Po sukcesie: zamienia się na success
- ✅ Po błędzie: zamienia się na error

### Gdzie przetestować:
- Formularz zapisywania: sprawdź success/error toasty
- Bulk delete: sprawdź undo functionality
- DevTools Console: `toast.success('Test')`

---

## 7. ✍️ FORM VALIDATION

**Lokalizacja:** `components/ui/FormField.tsx`

### Jak testować:

#### Test 1: Podstawowa walidacja
```tsx
<FormField
  label="Numer zamówienia"
  name="order_number"
  value={formData.order_number}
  onChange={(e) => setFormData({...formData, order_number: e.target.value})}
  required
  error={errors.order_number}
/>
```

**Kroki testowania:**
1. Zostaw pole puste → klik "Zapisz"
2. Wpisz nieprawidłową wartość
3. Wpisz prawidłową wartość

**Oczekiwany rezultat:**
- ✅ Puste pole: czerwona ramka + komunikat "To pole jest wymagane"
- ✅ Nieprawidłowa wartość: czerwona ramka + custom error
- ✅ Prawidłowa wartość: zielona ramka + checkmark
- ✅ Animacja shake przy błędzie

#### Test 2: Email validation
```tsx
<FormField
  type="email"
  label="Email"
  name="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
  error={emailError}
/>
```

**Kroki:**
1. Wpisz: `test` → błąd
2. Wpisz: `test@` → błąd
3. Wpisz: `test@example.com` → sukces

#### Test 3: Real-time validation
```tsx
const validateEmail = (email: string) => {
  if (!email) return 'Email jest wymagany'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Nieprawidłowy format email'
  }
  return ''
}

<FormField
  type="email"
  value={email}
  onChange={(e) => {
    setEmail(e.target.value)
    setError(validateEmail(e.target.value))
  }}
  error={error}
/>
```

**Oczekiwany rezultat:**
- ✅ Błąd pokazuje się podczas pisania
- ✅ Znika gdy wartość jest prawidłowa

### Gdzie przetestować:
- `/orders/new` - formularz nowego zamówienia
- `/settings` - formularz ustawień
- Każde pole inputowe w aplikacji

---

## 8. ✨ MICRO-ANIMATIONS

**Lokalizacja:** `app/globals.css` (animations)

### Jak testować:

#### Test 1: Hover animations
```tsx
<div className="hover-lift">
  <Card>Najedź myszką</Card>
</div>
```

**Animacje do przetestowania:**
- `.hover-lift` → Unosi się o 4px
- `.hover-scale` → Powiększa się 105%
- `.hover-glow` → Pojawia się świecenie

**Oczekiwany rezultat:**
- ✅ Płynna animacja (transition 200ms)
- ✅ Wraca do normalnego po zjechaniu myszką

#### Test 2: Entrance animations
```tsx
<div className="fade-in">Content</div>
<div className="slide-in">Content</div>
```

**Oczekiwany rezultat:**
- ✅ Fade-in: pojawia się z opacity 0 → 1
- ✅ Slide-in: wjeżdża z dołu

#### Test 3: Stagger animations (lista)
```tsx
<div className="stagger-fade-in">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

**Oczekiwany rezultat:**
- ✅ Elementy pojawiają się kolejno
- ✅ Opóźnienie 100ms między każdym

#### Test 4: Reduced motion (accessibility)

**Kroki:**
1. Otwórz System Settings → Accessibility
2. Włącz "Reduce motion"
3. Odśwież aplikację

**Oczekiwany rezultat:**
- ✅ Wszystkie animacje są wyłączone
- ✅ Media query `prefers-reduced-motion: reduce` działa

### Gdzie przetestować:
- Dashboard: karty mają hover-lift
- Lista zamówień: hover na wierszach
- Buttons: hover-scale
- Modals: fade-in przy otwarciu

---

## 9. 📭 EMPTY STATES

**Lokalizacja:** `components/ui/EmptyState.tsx`

### Jak testować:

#### Test 1: Empty lista zamówień
```tsx
{orders.length === 0 ? (
  <EmptyState
    title="Brak zamówień"
    description="Nie masz jeszcze żadnych zamówień. Utwórz pierwsze zamówienie."
    icon={<PackageOpen className="w-16 h-16" />}
    action={{
      label: "Dodaj zamówienie",
      onClick: () => router.push('/orders/new')
    }}
  />
) : (
  <OrdersList orders={orders} />
)}
```

**Oczekiwany rezultat:**
- ✅ Pokazuje ikonę + tytuł + opis
- ✅ Przycisk CTA (Call To Action)
- ✅ Centrowane na ekranie
- ✅ Responsywne (mobile/desktop)

#### Test 2: Preset - EmptyOrders
```tsx
import { EmptyOrders, EmptySearch, EmptyMachines } from '@/components/ui/EmptyState'

<EmptyOrders onCreateNew={() => router.push('/orders/new')} />
```

**Oczekiwany rezultat:**
- ✅ Gotowy preset z odpowiednią ikoną i tekstem
- ✅ Przycisk działa

#### Test 3: Empty search results
```tsx
<EmptySearch
  searchTerm="XYZ-123"
  onClearSearch={() => setSearchTerm('')}
/>
```

**Oczekiwany rezultat:**
- ✅ Pokazuje: "Nie znaleziono wyników dla: XYZ-123"
- ✅ Przycisk "Wyczyść wyszukiwanie"

### Gdzie przetestować:
- `/orders` - wyczyść wszystkie zamówienia w bazie
- Search bar - wyszukaj nieistniejącą frazę
- `/machines` - pusta lista maszyn

---

## 10. 🌓 DARK MODE TRANSITIONS

**Lokalizacja:** `app/globals.css`

### Jak testować:

#### Test 1: Płynne przejście dark/light
```css
* {
  transition: background-color 200ms ease,
              color 200ms ease,
              border-color 200ms ease;
}
```

**Kroki:**
1. Przełącz dark mode (przycisk w UI)
2. Obserwuj przejście

**Oczekiwany rezultat:**
- ✅ Wszystkie kolory zmieniają się płynnie (200ms)
- ✅ Brak migania
- ✅ Wszystkie elementy: tło, tekst, bordery

#### Test 2: Dark mode colors
```tsx
<div className="bg-background text-foreground">
  <Card className="bg-card">
    <p className="text-muted-foreground">Tekst</p>
  </Card>
</div>
```

**Oczekiwany rezultat:**
- ✅ Light mode: jasne tło, ciemny tekst
- ✅ Dark mode: ciemne tło, jasny tekst
- ✅ Kontrast czytelny (WCAG AA)

### Gdzie przetestować:
- Każda strona aplikacji
- Komponenty: Cards, Buttons, Inputs, Modals
- DevTools: sprawdź CSS custom properties

---

## 11. 🧭 BREADCRUMBS

**Lokalizacja:** `components/ui/Breadcrumbs.tsx`

### Jak testować:

#### Test 1: Podstawowy breadcrumb
```tsx
<Breadcrumbs
  items={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Zamówienia', href: '/orders' },
    { label: 'ORD-12345' }, // Ostatni bez href
  ]}
/>
```

**Oczekiwany rezultat:**
- ✅ Renderuje: Dashboard > Zamówienia > ORD-12345
- ✅ Pierwsze 2 są klikalne (linki)
- ✅ Ostatni nie jest linkiem (aktywna strona)
- ✅ Separator "/" między elementami

#### Test 2: Responsywność
Na mobile (width < 640px):
```
Dashboard > ... > ORD-12345
```

**Oczekiwany rezultat:**
- ✅ Ukrywa środkowe elementy
- ✅ Pokazuje tylko pierwszy i ostatni

### Gdzie przetestować:
- `/orders/[id]` - szczegóły zamówienia
- `/machines/[id]/edit` - edycja maszyny
- Każda strona zagnieżdżona

---

## 12. 🔍 GLOBAL SEARCH

**Lokalizacja:** `components/search/GlobalSearch.tsx`

### Jak testować:

#### Test 1: Otwórz search
**Kroki:**
1. Naciśnij `Ctrl + K` (lub `Cmd + K`)
2. Modal search się otwiera

**Oczekiwany rezultat:**
- ✅ Modal pojawia się
- ✅ Input jest automatycznie w focus
- ✅ Backdrop blur

#### Test 2: Wyszukiwanie
**Kroki:**
1. Wpisz: `ORD-123`
2. Poczekaj 300ms (debounce)

**Oczekiwany rezultat:**
- ✅ Fuzzy search (Fuse.js)
- ✅ Wyniki pogrupowane: Zamówienia / Maszyny / Klienci
- ✅ Highlight matched text
- ✅ Klawisze ↑↓ - nawigacja
- ✅ Enter - otwórz wynik
- ✅ Escape - zamknij

#### Test 3: Recent searches
**Kroki:**
1. Wyszukaj: "ORD-123"
2. Wybierz wynik
3. Otwórz ponownie search (`Ctrl + K`)

**Oczekiwany rezultat:**
- ✅ Pokazuje "Ostatnie wyszukiwania"
- ✅ "ORD-123" jest na liście
- ✅ Klik - powtarza wyszukiwanie

### Gdzie przetestować:
- Każda strona (global component)
- DevTools Console: sprawdź localStorage dla recent searches

---

# CZĘŚĆ 2: NOWE 15 FEATURES

## 13. 💾 AUTOSAVE FORMULARZY

**Lokalizacja:** `hooks/useAutosave.ts`

### Jak testować:

#### Test 1: Auto-save po zmianach
**Kod testowy:**
```tsx
function OrderForm() {
  const [formData, setFormData] = useState({ customer_name: '', notes: '' })

  const { hasUnsavedChanges } = useAutosave({
    data: formData,
    onSave: async (data) => {
      console.log('Auto-saving:', data)
      await new Promise(r => setTimeout(r, 500))
    },
    interval: 30000,
    debounce: 2000,
    showToast: true,
  })

  return (
    <div>
      <input
        value={formData.customer_name}
        onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
      />
      {hasUnsavedChanges && <p className="text-amber-500">Niezapisane zmiany...</p>}
    </div>
  )
}
```

**Kroki:**
1. Wpisz tekst w input
2. Przestań pisać na 2 sekundy
3. Sprawdź Console

**Oczekiwany rezultat:**
- ✅ Po 2s od ostatniej zmiany: auto-save
- ✅ Toast: "Automatycznie zapisano"
- ✅ Console log: "Auto-saving: {customer_name: '...'}"

#### Test 2: Ostrzeżenie przed opuszczeniem
**Kroki:**
1. Wpisz tekst (niezapisane zmiany)
2. Spróbuj zamknąć kartę (Ctrl + W)

**Oczekiwany rezultat:**
- ✅ Przeglądarka pokazuje: "Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?"

#### Test 3: LocalStorage backup
**Kroki:**
1. Wpisz tekst
2. Poczekaj 2s (auto-save)
3. Odśwież stronę (F5)
4. Sprawdź czy dane są przywrócone

**Oczekiwany rezultat:**
- ✅ Dane zapisane w localStorage
- ✅ Po refresh: dane są przywrócone

### Gdzie przetestować:
- `/orders/new` - nowe zamówienie
- `/orders/[id]/edit` - edycja
- DevTools → Application → Local Storage

---

## 14. ✅ BULK ACTIONS

**Lokalizacja:**
- Hook: `hooks/useBulkSelection.ts`
- UI: `components/ui/BulkActionBar.tsx`

### Jak testować:

#### Test 1: Zaznaczanie elementów
**Kod testowy:**
```tsx
function OrdersList() {
  const {
    selectedItems,
    selectedCount,
    toggleItem,
    toggleAll,
    deselectAll,
    isSelected,
    isAllSelected,
  } = useBulkSelection(orders)

  return (
    <div>
      <input type="checkbox" checked={isAllSelected} onChange={toggleAll} />
      <span>{selectedCount} zaznaczonych</span>

      {orders.map(order => (
        <div key={order.id}>
          <input
            type="checkbox"
            checked={isSelected(order.id)}
            onChange={() => toggleItem(order.id)}
          />
          {order.order_number}
        </div>
      ))}
    </div>
  )
}
```

**Kroki:**
1. Zaznacz checkbox przy 3 elementach
2. Kliknij "Select All" checkbox

**Oczekiwany rezultat:**
- ✅ Licznik pokazuje "3 zaznaczonych"
- ✅ "Select All" zaznacza wszystkie
- ✅ Ponowny klik "Select All" → odznacza wszystkie
- ✅ Częściowe zaznaczenie → checkbox indeterminate (kreska)

#### Test 2: Bulk Action Bar
**Kroki:**
1. Zaznacz 5 zamówień
2. Sprawdź dolną część ekranu

**Oczekiwany rezultat:**
- ✅ BulkActionBar pojawia się na dole (fixed position)
- ✅ Pokazuje: "5 zaznaczonych"
- ✅ Przyciski akcji: Usuń, Zmień status, Eksportuj
- ✅ Przycisk X (Anuluj)
- ✅ Animacja slide-in z dołu

#### Test 3: Bulk Delete
**Kroki:**
1. Zaznacz 3 zamówienia
2. Klik "Usuń"
3. Potwierdź

**Oczekiwany rezultat:**
- ✅ Wszystkie 3 zamówienia usunięte
- ✅ Toast: "Usunięto 3 zamówienia"
- ✅ BulkActionBar znika
- ✅ Zaznaczenie wyczyszczone

### Gdzie przetestować:
- `/orders` - lista zamówień
- `/machines` - lista maszyn

---

## 15. 📋 ACTIVITY LOG

**Lokalizacja:** `components/ui/ActivityLog.tsx`

### Jak testować:

#### Test 1: Podstawowy timeline
**Kod testowy:**
```tsx
<ActivityLog
  items={[
    {
      id: '1',
      user: { name: 'Jakub Kowalski', avatar: '/avatar.jpg' },
      action: 'zmienił status',
      details: 'Z "Oczekujące" na "W realizacji"',
      timestamp: new Date(Date.now() - 5 * 60000), // 5 min temu
      type: 'status',
    },
    {
      id: '2',
      user: { name: 'Anna Nowak' },
      action: 'dodała komentarz',
      details: 'Klient prosi o przyspieszenie',
      timestamp: new Date(Date.now() - 2 * 3600000), // 2h temu
      type: 'comment',
    },
  ]}
/>
```

**Oczekiwany rezultat:**
- ✅ Timeline z pionową linią łączącą eventy
- ✅ Avatary użytkowników (lub inicjały)
- ✅ Ikony dla typów: status, comment, update, delete, create
- ✅ Relative timestamps: "5 min temu", "2 godz. temu"
- ✅ Szczegóły pod akcją

#### Test 2: Różne typy akcji
**Typy do przetestowania:**
- `create` → ikona PlusCircle (zielona)
- `update` → ikona Edit (niebieska)
- `delete` → ikona Trash (czerwona)
- `comment` → ikona MessageCircle (fioletowa)
- `status` → ikona Activity (pomarańczowa)

#### Test 3: Timestamps
**Kroki:**
1. Utwórz eventy z różnymi datami:
   - 30 sekund temu
   - 5 minut temu
   - 2 godziny temu
   - Wczoraj
   - 5 dni temu

**Oczekiwany rezultat:**
- ✅ < 1 min: "Właśnie teraz"
- ✅ < 60 min: "X min temu"
- ✅ < 24h: "X godz. temu"
- ✅ 1 dzień: "Wczoraj"
- ✅ > 7 dni: Pełna data (np. "2024-12-01")

### Gdzie przetestować:
- `/orders/[id]` - szczegóły zamówienia (dodaj sekcję "Historia")
- Utwórz testową tabelę `activity_log` w Supabase

---

## 16. 🖼️ IMAGE OPTIMIZATION

**Lokalizacja:** Next.js `<Image>` component (built-in)

### Jak testować:

#### Test 1: Podstawowa optymalizacja
**Zamień:**
```tsx
<img src="/product.jpg" alt="Product" />
```

**Na:**
```tsx
import Image from 'next/image'

<Image
  src="/product.jpg"
  alt="Product"
  width={500}
  height={300}
  quality={85}
/>
```

**Kroki:**
1. Otwórz DevTools → Network
2. Załaduj stronę
3. Sprawdź rozmiar obrazu

**Oczekiwany rezultat:**
- ✅ Format: WebP (zamiast JPG/PNG)
- ✅ Rozmiar: 80-95% mniejszy
- ✅ Wiele rozmiarów (srcset): 640w, 750w, 828w, 1080w, 1200w

#### Test 2: Lazy Loading
**Kod:**
```tsx
<Image
  src="/hero.jpg"
  width={1200}
  height={600}
  loading="lazy"  // Domyślnie
  alt="Hero"
/>
```

**Kroki:**
1. Dodaj 10 obrazów poniżej fold (niewidoczne)
2. Otwórz DevTools → Network
3. Załaduj stronę
4. Scrolluj w dół

**Oczekiwany rezultat:**
- ✅ Początek: ładują się tylko widoczne obrazy
- ✅ Scroll w dół: ładują się kolejne
- ✅ Network tab: requesty pojawiają się podczas scrollowania

#### Test 3: Blur Placeholder
**Kod:**
```tsx
<Image
  src="/product.jpg"
  width={500}
  height={300}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  alt="Product"
/>
```

**Oczekiwany rezultat:**
- ✅ Podczas ładowania: rozmazany placeholder
- ✅ Po załadowaniu: płynne przejście do sharp image

#### Test 4: Priority (hero images)
**Kod:**
```tsx
<Image
  src="/hero.jpg"
  fill
  priority  // Wyłącz lazy loading
  alt="Hero"
/>
```

**Oczekiwany rezultat:**
- ✅ Ładuje się natychmiast (nie czeka)
- ✅ Brak lazy loading
- ✅ Wysoki priorytet w Network waterfall

### Gdzie przetestować:
- Landing page (hero image)
- Product gallery
- User avatars
- DevTools → Lighthouse: sprawdź score

---

## 17. 📜 VIRTUAL LISTS

**Lokalizacja:** `components/ui/VirtualList.tsx`

### Jak testować:

#### Test 1: Duża lista (1000+ elementów)
**Kod testowy:**
```tsx
// Generuj 5000 testowych zamówień
const mockOrders = Array.from({ length: 5000 }, (_, i) => ({
  id: i + 1,
  order_number: `ORD-${String(i + 1).padStart(5, '0')}`,
  customer_name: `Klient ${i + 1}`,
  status: ['pending', 'in_progress', 'completed'][i % 3],
}))

function HugeOrdersList() {
  return (
    <VirtualList
      items={mockOrders}
      itemHeight={80}
      containerHeight={600}
      overscan={5}
      renderItem={(order, index) => (
        <div className="p-4 border-b">
          <p className="font-bold">{order.order_number}</p>
          <p className="text-sm">{order.customer_name}</p>
        </div>
      )}
    />
  )
}
```

**Kroki:**
1. Załaduj komponent z 5000 elementami
2. Otwórz DevTools → Elements
3. Sprawdź liczbę DOM nodes
4. Scrolluj w dół i górę

**Oczekiwany rezultat:**
- ✅ DOM: tylko ~15 elementów (zamiast 5000)
- ✅ Scroll: płynny 60 FPS
- ✅ Overscan: elementy przed/po viewporcie są już renderowane
- ✅ Initial render: < 100ms

#### Test 2: Performance benchmark
**Porównaj:**
```tsx
// Bez Virtual List
{orders.map(order => <OrderRow order={order} />)}

// Z Virtual List
<VirtualList items={orders} ... />
```

**Metryki do sprawdzenia (DevTools → Performance):**
| Metryka | Bez VirtualList | Z VirtualList |
|---------|-----------------|---------------|
| Initial render | ~3000ms | ~50ms |
| DOM nodes | 5000 | ~15 |
| Memory | 180 MB | 12 MB |
| Scroll FPS | 15-20 | 60 |

### Gdzie przetestować:
- Stwórz testową stronę `/test/virtual-list`
- Użyj w `/orders` jeśli lista > 100 elementów

---

## 18. ♾️ INFINITE SCROLL

**Lokalizacja:** `hooks/useInfiniteScroll.ts`

### Jak testować:

#### Test 1: Automatyczne ładowanie
**Kod testowy:**
```tsx
function InfiniteOrdersList() {
  const [orders, setOrders] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const loadMore = async () => {
    setIsLoading(true)

    // Symuluj API call
    await new Promise(r => setTimeout(r, 1000))

    const newOrders = Array.from({ length: 20 }, (_, i) => ({
      id: page * 20 + i,
      order_number: `ORD-${page * 20 + i}`,
    }))

    setOrders(prev => [...prev, ...newOrders])
    setPage(prev => prev + 1)

    if (page >= 10) setHasMore(false) // Max 200 items
    setIsLoading(false)
  }

  const { loadMoreRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading,
    threshold: 200,
  })

  return (
    <div>
      {orders.map(order => <div key={order.id}>{order.order_number}</div>)}

      {hasMore && (
        <div ref={loadMoreRef} className="py-4 text-center">
          {isLoading ? 'Ładowanie...' : 'Scroll dla więcej'}
        </div>
      )}

      {!hasMore && <p>Koniec listy 🎉</p>}
    </div>
  )
}
```

**Kroki:**
1. Załaduj komponent
2. Scrolluj do dołu
3. Obserwuj automatyczne ładowanie

**Oczekiwany rezultat:**
- ✅ Scroll do końca → automatycznie ładuje
- ✅ Threshold 200px → ładuje PRZED dotarciem do końca
- ✅ Loader pokazuje się podczas ładowania
- ✅ Nowe elementy dodają się do listy
- ✅ Po ostatniej stronie: "Koniec listy"

#### Test 2: Intersection Observer
**Kroki:**
1. Otwórz DevTools Console
2. Dodaj log w hook:
```tsx
observer.observe(element)
console.log('Observer attached to sentinel')
```
3. Scrolluj

**Oczekiwany rezultat:**
- ✅ Console log: "Observer attached to sentinel"
- ✅ Przy scrollu: wykrywa intersection

#### Test 3: Zapobieganie duplikatom
**Kroki:**
1. Szybko scrolluj do dołu
2. Sprawdź Network tab

**Oczekiwany rezultat:**
- ✅ Tylko 1 request na raz (nie wysyła duplikatów)
- ✅ `if (isLoading) return` zapobiega nadmiarowym requestom

### Gdzie przetestować:
- `/orders` - lista zamówień z paginacją
- `/test/infinite-scroll` - testowa strona

---

## 19. 🎯 DRAG & DROP

**Lokalizacja:** `hooks/useDragAndDrop.ts`

### Jak testować:

#### Test 1: Reordering listy
**Kod testowy:**
```tsx
function SortableTaskList() {
  const [tasks, setTasks] = useState([
    { id: 1, name: 'Zadanie 1' },
    { id: 2, name: 'Zadanie 2' },
    { id: 3, name: 'Zadanie 3' },
  ])

  const {
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    isDragging,
  } = useDragAndDrop({
    items: tasks,
    onReorder: setTasks,
    getId: (task) => task.id,
  })

  return (
    <div>
      {tasks.map((task, index) => (
        <div
          key={task.id}
          draggable
          onDragStart={handleDragStart(task, index)}
          onDragOver={handleDragOver(index)}
          onDragEnd={handleDragEnd}
          className={isDragging === task.id ? 'opacity-50' : ''}
        >
          {task.name}
        </div>
      ))}
    </div>
  )
}
```

**Kroki:**
1. Przeciągnij "Zadanie 3" na miejsce "Zadanie 1"
2. Upuść

**Oczekiwany rezultat:**
- ✅ Visual feedback: przeciągany element ma opacity 50%
- ✅ Inne elementy przesuwają się
- ✅ Po upuszczeniu: kolejność zmieniona
- ✅ Console log: nowa kolejność

#### Test 2: Touch support (mobile)
**Kroki:**
1. Otwórz DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Wybierz iPhone/Android
3. Spróbuj przeciągnąć długim przytrzymaniem

**Oczekiwany rezultat:**
- ✅ Działa na touch events
- ✅ Przeciąganie długim tap

#### Test 3: Cancel drag (Escape)
**Kroki:**
1. Zacznij przeciągać element
2. Naciśnij Escape

**Oczekiwany rezultat:**
- ✅ Drag jest anulowany
- ✅ Element wraca na miejsce

### Gdzie przetestować:
- Kanban board (jeśli istnieje)
- Priority list (sortowanie ważności)
- File upload (reorder załączników)

---

## 20. ⚡ CODE SPLITTING

**Lokalizacja:** `PERFORMANCE_PATTERNS.md` (dokumentacja)

### Jak testować:

#### Test 1: Dynamic import
**Kod:**
```tsx
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <Skeleton className="h-[400px]" />,
  ssr: false,
})

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <HeavyChart data={chartData} />
    </div>
  )
}
```

**Kroki:**
1. Build aplikację: `npm run build`
2. Sprawdź output w konsoli
3. Otwórz DevTools → Network
4. Załaduj stronę z HeavyChart

**Oczekiwany rezultat:**
- ✅ Build output: osobny chunk `HeavyChart.xxxx.js`
- ✅ Network: chunk ładuje się dopiero gdy komponent potrzebny
- ✅ Skeleton pokazuje się podczas ładowania
- ✅ Mniejszy initial bundle

#### Test 2: Bundle size analysis
**Kroki:**
```bash
npm run build
```

**Sprawdź output:**
```
Route (app)                              Size     First Load JS
┌ ○ /                                    5.2 kB         92.1 kB
├ ○ /orders                              12.3 kB        105 kB
├ ○ /orders/[id]                         8.1 kB         95 kB
└ ○ /dashboard                           45.2 kB        132 kB (duży przez charts)
```

**Oczekiwany rezultat:**
- ✅ Każda route ma osobny chunk
- ✅ Heavy components są code-split

#### Test 3: Lazy loading route
```tsx
// app/heavy-page/page.tsx
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'))

export default function HeavyPage() {
  return <HeavyComponent />
}
```

### Gdzie przetestować:
- Dashboard (heavy charts)
- Reports page
- DevTools → Network → sprawdź chunk loading

---

## 21. 🧠 MEMOIZATION

**Lokalizacja:** `PERFORMANCE_PATTERNS.md`

### Jak testować:

#### Test 1: React.memo
**Kod testowy:**
```tsx
// Bez memo - re-renders za każdym razem
function ExpensiveListItem({ item }) {
  console.log('Rendering item:', item.id)
  return <div>{item.name}</div>
}

// Z memo - re-renders tylko gdy props się zmienią
const ExpensiveListItem = React.memo(({ item }) => {
  console.log('Rendering item:', item.id)
  return <div>{item.name}</div>
})

function ParentList() {
  const [count, setCount] = useState(0)
  const items = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }]

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      {items.map(item => <ExpensiveListItem key={item.id} item={item} />)}
    </div>
  )
}
```

**Kroki:**
1. Kliknij przycisk "Count" 5 razy
2. Sprawdź Console

**Oczekiwany rezultat:**
- ✅ Bez memo: "Rendering item: 1/2" pojawia się 5 razy
- ✅ Z memo: "Rendering item: 1/2" pojawia się TYLKO raz
- ✅ Items nie re-renderują się gdy count się zmienia

#### Test 2: useMemo
**Kod:**
```tsx
function OrdersList({ orders }) {
  // Bez useMemo - sortuje przy każdym renderze
  const sortedOrders = orders.sort((a, b) =>
    a.deadline.localeCompare(b.deadline)
  )

  // Z useMemo - sortuje tylko gdy orders się zmienią
  const sortedOrders = useMemo(() => {
    console.log('Sorting orders...')
    return orders.sort((a, b) =>
      a.deadline.localeCompare(b.deadline)
    )
  }, [orders])

  return <div>{sortedOrders.map(...)}</div>
}
```

**Kroki:**
1. Trigger re-render (np. zmień state w parent)
2. Sprawdź Console

**Oczekiwany rezultat:**
- ✅ "Sorting orders..." pojawia się tylko gdy `orders` się zmienią
- ✅ Nie sortuje przy każdym renderze

#### Test 3: useCallback
**Kod:**
```tsx
function Parent() {
  const [count, setCount] = useState(0)

  // Bez useCallback - nowa funkcja przy każdym renderze
  const handleClick = (id) => {
    console.log('Clicked:', id)
  }

  // Z useCallback - ta sama funkcja
  const handleClick = useCallback((id) => {
    console.log('Clicked:', id)
  }, [])

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Re-render</button>
      <ChildMemo onClick={handleClick} />
    </div>
  )
}

const ChildMemo = React.memo(({ onClick }) => {
  console.log('Child rendered')
  return <button onClick={() => onClick(1)}>Click me</button>
})
```

**Oczekiwany rezultat:**
- ✅ Bez useCallback: "Child rendered" przy każdym re-renderze Parent
- ✅ Z useCallback: "Child rendered" TYLKO raz

### Gdzie przetestować:
- Heavy computations (filtering, sorting)
- List components
- DevTools → React Profiler

---

## 22. 🔄 REAL-TIME DATA

**Lokalizacja:** `hooks/useRealTimeData.ts`

### Jak testować:

#### Test 1: Auto-refresh co 5s
**Kod testowy:**
```tsx
function LiveOrdersCounter() {
  const { data, isLoading, error, refetch } = useRealTimeData({
    fetcher: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
      return data?.length || 0
    },
    interval: 5000, // 5 sekund
  })

  return (
    <div>
      <h2>Zamówienia: {data}</h2>
      {isLoading && <Spinner />}
      <button onClick={refetch}>Odśwież teraz</button>
    </div>
  )
}
```

**Kroki:**
1. Załaduj komponent
2. Poczekaj 5 sekund
3. Dodaj nowe zamówienie w Supabase
4. Poczekaj kolejne 5 sekund

**Oczekiwany rezultat:**
- ✅ Co 5s: automatyczny fetch
- ✅ Licznik się aktualizuje
- ✅ Console Network: request co 5s
- ✅ Przycisk "Odśwież teraz" → natychmiastowy fetch

#### Test 2: Error handling
**Kod:**
```tsx
const { data, error } = useRealTimeData({
  fetcher: async () => {
    throw new Error('Test error')
  },
  interval: 5000,
  onError: (err) => {
    toast.error('Błąd podczas odświeżania')
  },
})
```

**Oczekiwany rezultat:**
- ✅ Toast z błędem
- ✅ `error` state jest ustawiony
- ✅ Nie crashuje aplikacji

#### Test 3: Disable/Enable polling
**Kod:**
```tsx
const [enabled, setEnabled] = useState(true)

const { data } = useRealTimeData({
  fetcher: fetchOrders,
  interval: 5000,
  enabled, // Kontrola
})

return (
  <div>
    <button onClick={() => setEnabled(!enabled)}>
      {enabled ? 'Wyłącz' : 'Włącz'} auto-refresh
    </button>
  </div>
)
```

**Oczekiwany rezultat:**
- ✅ Enabled = false → polling się zatrzymuje
- ✅ Enabled = true → polling się wznawia

### Gdzie przetestować:
- Dashboard (live stats)
- Order status tracking
- DevTools → Network → sprawdź interval

---

## 23. 📊 EXPORT EXCEL/CSV/PDF

**Lokalizacja:** `lib/export.ts`

### Jak testować:

#### Test 1: Export to CSV
**Kod testowy:**
```tsx
import { exportToCSV } from '@/lib/export'

function OrdersPage() {
  const [orders, setOrders] = useState([])

  const handleExportCSV = () => {
    exportToCSV(
      orders,
      'zamowienia-2024.csv',
      [
        { key: 'order_number', label: 'Numer' },
        { key: 'customer_name', label: 'Klient' },
        { key: 'status', label: 'Status' },
        { key: 'deadline', label: 'Termin' },
      ]
    )
  }

  return (
    <button onClick={handleExportCSV}>
      Eksportuj do CSV
    </button>
  )
}
```

**Kroki:**
1. Kliknij "Eksportuj do CSV"
2. Sprawdź folder Downloads
3. Otwórz plik w Excel

**Oczekiwany rezultat:**
- ✅ Plik `zamowienia-2024.csv` został pobrany
- ✅ Excel otwiera plik poprawnie
- ✅ Kolumny: Numer, Klient, Status, Termin
- ✅ Dane są poprawne
- ✅ Polski encoding (UTF-8 BOM)

#### Test 2: Export to JSON
**Kod:**
```tsx
import { exportToJSON } from '@/lib/export'

const handleExportJSON = () => {
  exportToJSON(orders, 'zamowienia.json')
}
```

**Oczekiwany rezultat:**
- ✅ Plik JSON pobrany
- ✅ Valid JSON format
- ✅ Można otworzyć w edytorze

#### Test 3: Print to PDF
**Kod:**
```tsx
import { printToPDF } from '@/lib/export'

const handlePrintPDF = () => {
  printToPDF('orders-table', 'zamowienia.pdf')
}

return (
  <div>
    <div id="orders-table">
      <table>
        {/* Tabela zamówień */}
      </table>
    </div>
    <button onClick={handlePrintPDF}>Eksportuj PDF</button>
  </div>
)
```

**Oczekiwany rezultat:**
- ✅ Otwiera się browser print dialog
- ✅ Preview pokazuje tabelę
- ✅ "Save as PDF" → generuje PDF

#### Test 4: Export z polskimi znakami
**Dane testowe:**
```tsx
const orders = [
  { customer_name: 'Józef Zięba', notes: 'Ważne! Śpieszne!' },
  { customer_name: 'Łukasz Ćwik', notes: 'Zażółć gęślą jaźń' },
]
```

**Oczekiwany rezultat:**
- ✅ Polskie znaki są poprawnie wyświetlone w CSV
- ✅ UTF-8 BOM zapewnia encoding

### Gdzie przetestować:
- `/orders` - eksport listy zamówień
- `/reports` - eksport raportów

---

## 24. 💬 COMMENTS SYSTEM

**Lokalizacja:** `components/ui/Comments.tsx`

### Jak testować:

#### Test 1: Dodawanie komentarza
**Kod testowy:**
```tsx
function OrderComments({ orderId }) {
  const [comments, setComments] = useState([])

  const handleAddComment = async (content: string) => {
    const newComment = {
      id: Date.now().toString(),
      user: { name: 'Jakub', avatar: '/avatar.jpg' },
      content,
      timestamp: new Date(),
    }
    setComments([...comments, newComment])
  }

  return (
    <Comments
      comments={comments}
      onAddComment={handleAddComment}
      onDeleteComment={(id) => setComments(comments.filter(c => c.id !== id))}
      onEditComment={(id, newContent) => {
        setComments(comments.map(c =>
          c.id === id ? { ...c, content: newContent } : c
        ))
      }}
    />
  )
}
```

**Kroki:**
1. Wpisz tekst w textarea
2. Kliknij "Dodaj komentarz"

**Oczekiwany rezultat:**
- ✅ Komentarz pojawia się na liście
- ✅ Avatar + nazwa użytkownika
- ✅ Timestamp: "Właśnie teraz"
- ✅ Textarea się czyści

#### Test 2: Nested replies (odpowiedzi)
**Kod:**
```tsx
const comments = [
  {
    id: '1',
    content: 'Główny komentarz',
    replies: [
      {
        id: '2',
        content: 'Odpowiedź 1',
        replies: [
          { id: '3', content: 'Odpowiedź na odpowiedź' }
        ]
      }
    ]
  }
]
```

**Kroki:**
1. Kliknij "Odpowiedz" na komentarzu
2. Wpisz odpowiedź
3. Wyślij

**Oczekiwany rezultat:**
- ✅ Odpowiedź jest wcięta (nested)
- ✅ Max 2 poziomy głębokości
- ✅ Visual indentation (padding-left)

#### Test 3: Edit/Delete
**Kroki:**
1. Najedź na swój komentarz
2. Kliknij "Edytuj"
3. Zmień tekst
4. Zapisz

**Oczekiwany rezultat:**
- ✅ Textarea z obecną treścią
- ✅ Po zapisie: tekst zaktualizowany
- ✅ "Edytowano" badge

**Delete:**
1. Kliknij "Usuń"
2. Potwierdź

**Oczekiwany rezultat:**
- ✅ Komentarz usunięty
- ✅ Confirmation dialog

### Gdzie przetestować:
- `/orders/[id]` - komentarze do zamówienia
- Utwórz tabelę `comments` w Supabase

---

## 25. 📱 PWA ENHANCEMENT

**Lokalizacja:** `public/sw.js`

### Jak testować:

#### Test 1: Service Worker registration
**Kroki:**
1. Otwórz DevTools → Application → Service Workers
2. Odśwież stronę

**Oczekiwany rezultat:**
- ✅ Service Worker: "Activated and running"
- ✅ Status: zielony
- ✅ Scope: `/`

#### Test 2: Offline mode
**Kroki:**
1. Załaduj stronę (cache się wypełnia)
2. DevTools → Network → Offline checkbox
3. Odśwież stronę (F5)

**Oczekiwany rezultat:**
- ✅ Strona działa offline
- ✅ Pokazuje cached content
- ✅ Jeśli strona nie w cache → offline fallback page

#### Test 3: Cache strategy (Network First)
**Kroki:**
1. DevTools → Application → Cache Storage
2. Sprawdź `cnc-pilot-v1`
3. Załaduj `/orders`
4. Sprawdź cache ponownie

**Oczekiwany rezultat:**
- ✅ Cache zawiera: `/`, `/orders`, `manifest.json`
- ✅ Network tab: "from ServiceWorker"
- ✅ Strategy: Network first → cache fallback

#### Test 4: PWA Install prompt
**Kroki (Desktop Chrome):**
1. Załaduj stronę
2. Sprawdź address bar → ikona "Install"
3. Kliknij

**Oczekiwany rezultat:**
- ✅ Pojawia się dialog: "Install CNC-Pilot?"
- ✅ Po instalacji: app otwiera się w osobnym oknie
- ✅ Brak address bar (standalone mode)

#### Test 5: Manifest.json
**Sprawdź:**
```
DevTools → Application → Manifest
```

**Oczekiwany rezultat:**
- ✅ Name: "CNC-Pilot MVP"
- ✅ Icons: 192x192, 512x512
- ✅ Start URL: `/`
- ✅ Display: standalone
- ✅ Theme color: ustawiony

### Gdzie przetestować:
- Każda strona (PWA działa globally)
- Mobile: sprawdź "Add to Home Screen"
- Lighthouse → Progressive Web App score

---

## 26. 🌐 MULTI-LANGUAGE (i18n)

**Lokalizacja:** `lib/i18n.ts`

### Jak testować:

#### Test 1: Podstawowe tłumaczenia
**Kod testowy:**
```tsx
import { useTranslation } from '@/lib/i18n'

function OrderForm() {
  const { t, locale, setLocale } = useTranslation()

  return (
    <div>
      <button onClick={() => setLocale(locale === 'pl' ? 'en' : 'pl')}>
        {locale === 'pl' ? 'EN' : 'PL'}
      </button>

      <h1>{t('orders.title')}</h1>
      <button>{t('common.save')}</button>
      <button>{t('common.cancel')}</button>
    </div>
  )
}
```

**Kroki:**
1. Załaduj stronę (domyślnie PL)
2. Sprawdź teksty
3. Kliknij przycisk zmiany języka
4. Sprawdź teksty ponownie

**Oczekiwany rezultat:**
- ✅ PL: "Zamówienia", "Zapisz", "Anuluj"
- ✅ EN: "Orders", "Save", "Cancel"
- ✅ Płynna zmiana (bez refresh)

#### Test 2: LocalStorage persistence
**Kroki:**
1. Zmień język na EN
2. Odśwież stronę (F5)

**Oczekiwany rezultat:**
- ✅ Język dalej EN (zapisany w localStorage)
- ✅ DevTools → Application → Local Storage → `locale: "en"`

#### Test 3: Brakujące tłumaczenia
**Kod:**
```tsx
{t('orders.nonexistent_key')}
```

**Oczekiwany rezultat:**
- ✅ Fallback: pokazuje klucz (`orders.nonexistent_key`)
- ✅ Nie crashuje

#### Test 4: Dodaj nowe tłumaczenia
**W `lib/i18n.ts`:**
```tsx
const translations = {
  pl: {
    common: { ... },
    orders: { ... },
    machines: {
      title: 'Maszyny',
      addNew: 'Dodaj maszynę',
      status: 'Status',
    }
  },
  en: {
    common: { ... },
    orders: { ... },
    machines: {
      title: 'Machines',
      addNew: 'Add machine',
      status: 'Status',
    }
  }
}
```

**Użycie:**
```tsx
{t('machines.title')} // → "Maszyny" lub "Machines"
```

### Gdzie przetestować:
- Każda strona z tekstami
- Formularze (labels, buttons)
- Toast messages

---

## 27. 🔎 SEARCH IMPROVEMENTS

**Uwaga:** Ten feature był już w oryginalnych 12 (Global Search), więc to są **ulepszenia** do istniejącego systemu.

### Dodatkowe funkcje do przetestowania:

#### Test 1: Fuzzy search accuracy
**Dane testowe:**
```tsx
const orders = [
  { order_number: 'ORD-12345' },
  { order_number: 'ORD-54321' },
  { order_number: 'ORD-99999' },
]
```

**Wyszukiwania:**
- `ord123` → znajdzie ORD-12345 ✅
- `or12345` → znajdzie ORD-12345 ✅
- `12345` → znajdzie ORD-12345 ✅
- `typo: odr123` → nadal znajdzie ORD-12345 ✅ (fuzzy)

#### Test 2: Search w multiple fields
```tsx
// Szukaj w: order_number, customer_name, notes
const searchKeys = ['order_number', 'customer_name', 'notes']
```

**Kroki:**
1. Wyszukaj: `Jakub`
2. Powinien znaleźć zamówienia gdzie customer_name = "Jakub Kowalski"

#### Test 3: Weighted search (ważność pól)
```tsx
// order_number jest ważniejsze niż notes
const fuseOptions = {
  keys: [
    { name: 'order_number', weight: 0.7 },
    { name: 'customer_name', weight: 0.2 },
    { name: 'notes', weight: 0.1 },
  ]
}
```

**Oczekiwany rezultat:**
- ✅ Match w order_number → wyżej w wynikach
- ✅ Match w notes → niżej w wynikach

---

# 🎯 CHECKLIST OGÓLNY

Przed wypuszczeniem do produkcji, przetestuj:

## Performance
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Virtual List dla list > 100 elementów
- [ ] Code splitting dla heavy components
- [ ] Image optimization wszystkie obrazy

## Accessibility
- [ ] Keyboard navigation działa
- [ ] Screen reader support
- [ ] Contrast ratio WCAG AA
- [ ] Focus indicators widoczne
- [ ] Reduced motion respektowane

## UX
- [ ] Loading states wszędzie
- [ ] Error boundaries
- [ ] Empty states
- [ ] Toast notifications
- [ ] Autosave w formularzach
- [ ] Optimistic updates

## Mobile
- [ ] Responsywne na wszystkich ekranach
- [ ] Touch-friendly (min 44x44px buttons)
- [ ] PWA instalowalna
- [ ] Offline mode działa

## Security
- [ ] RLS włączone w Supabase
- [ ] Input validation
- [ ] XSS prevention
- [ ] CSRF tokens (jeśli używasz)

## Browser Support
- [ ] Chrome ✅
- [ ] Firefox ✅
- [ ] Safari ✅
- [ ] Edge ✅
- [ ] Mobile Safari ✅
- [ ] Mobile Chrome ✅

---

# 📝 NOTATKI

- Zapisz wyniki testów w tym pliku
- Zgłoś bugi jako Issues w GitHub
- Każdy bug powinien mieć: steps to reproduce, expected vs actual, screenshots

**Powodzenia! 🚀**
