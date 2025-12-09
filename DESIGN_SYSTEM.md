# 🎨 CNC-PILOT MVP - DESIGN SYSTEM

**Last Updated:** 2025-12-09
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [Design Principles](#design-principles)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing](#spacing)
5. [Components](#components)
6. [Animations](#animations)
7. [Dark Mode](#dark-mode)
8. [Accessibility](#accessibility)
9. [Responsive Design](#responsive-design)
10. [Best Practices](#best-practices)

---

## 🎯 Design Principles

### 1. **Clarity First**
- Clear hierarchy
- Obvious actions
- Minimal cognitive load

### 2. **Performance Matters**
- Fast interactions (60 FPS)
- Instant feedback
- Progressive loading

### 3. **Consistency**
- Reusable patterns
- Predictable behavior
- Unified language

### 4. **Accessibility**
- WCAG AA compliance
- Keyboard navigation
- Screen reader support

---

## 🎨 Color System

### Light Mode

```css
--background: 0 0% 100%;           /* White */
--foreground: 222.2 84% 4.9%;      /* Near black */

--card: 0 0% 100%;                 /* White */
--card-foreground: 222.2 84% 4.9%;

--popover: 0 0% 100%;
--popover-foreground: 222.2 84% 4.9%;

--primary: 222.2 47.4% 11.2%;      /* Dark blue */
--primary-foreground: 210 40% 98%;

--secondary: 210 40% 96.1%;        /* Light gray */
--secondary-foreground: 222.2 47.4% 11.2%;

--muted: 210 40% 96.1%;
--muted-foreground: 215.4 16.3% 46.9%;

--accent: 210 40% 96.1%;
--accent-foreground: 222.2 47.4% 11.2%;

--destructive: 0 84.2% 60.2%;      /* Red */
--destructive-foreground: 210 40% 98%;

--border: 214.3 31.8% 91.4%;       /* Light gray */
--input: 214.3 31.8% 91.4%;
--ring: 222.2 84% 4.9%;

--radius: 0.5rem;                  /* 8px */
```

### Dark Mode

```css
--background: 222.2 84% 4.9%;      /* Near black */
--foreground: 210 40% 98%;          /* Near white */

--card: 222.2 84% 4.9%;
--card-foreground: 210 40% 98%;

--popover: 222.2 84% 4.9%;
--popover-foreground: 210 40% 98%;

--primary: 210 40% 98%;             /* White */
--primary-foreground: 222.2 47.4% 11.2%;

--secondary: 217.2 32.6% 17.5%;     /* Dark gray */
--secondary-foreground: 210 40% 98%;

--muted: 217.2 32.6% 17.5%;
--muted-foreground: 215 20.2% 65.1%;

--accent: 217.2 32.6% 17.5%;
--accent-foreground: 210 40% 98%;

--destructive: 0 62.8% 30.6%;       /* Dark red */
--destructive-foreground: 210 40% 98%;

--border: 217.2 32.6% 17.5%;
--input: 217.2 32.6% 17.5%;
--ring: 212.7 26.8% 83.9%;
```

### Semantic Colors

```css
/* Success */
--success: 142 76% 36%;              /* Green */
--success-foreground: 210 40% 98%;

/* Warning */
--warning: 38 92% 50%;               /* Orange */
--warning-foreground: 222.2 84% 4.9%;

/* Info */
--info: 221 83% 53%;                 /* Blue */
--info-foreground: 210 40% 98%;
```

### Usage

```tsx
// Background colors
<div className="bg-background text-foreground" />
<div className="bg-card text-card-foreground" />
<div className="bg-muted text-muted-foreground" />

// Interactive elements
<Button className="bg-primary text-primary-foreground" />
<Button variant="secondary" />
<Button variant="destructive" />

// Status indicators
<Badge className="bg-success text-success-foreground">Active</Badge>
<Badge className="bg-warning text-warning-foreground">Pending</Badge>
<Badge className="bg-destructive text-destructive-foreground">Error</Badge>
```

---

## 📝 Typography

### Font Family

```css
/* Sans-serif (Primary) */
font-family: var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;

/* Monospace (Code) */
font-family: var(--font-mono), 'SF Mono', 'Monaco', 'Courier New', monospace;
```

### Font Sizes

```css
/* Headings */
--text-5xl: 3rem;      /* 48px - H1 */
--text-4xl: 2.25rem;   /* 36px - H2 */
--text-3xl: 1.875rem;  /* 30px - H3 */
--text-2xl: 1.5rem;    /* 24px - H4 */
--text-xl: 1.25rem;    /* 20px - H5 */
--text-lg: 1.125rem;   /* 18px - H6 */

/* Body */
--text-base: 1rem;     /* 16px - Default */
--text-sm: 0.875rem;   /* 14px - Small */
--text-xs: 0.75rem;    /* 12px - Extra small */
```

### Font Weights

```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights

```css
--leading-none: 1;
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Usage

```tsx
// Headings
<h1 className="text-5xl font-bold">Dashboard</h1>
<h2 className="text-4xl font-semibold">Orders</h2>
<h3 className="text-3xl font-medium">Statistics</h3>

// Body text
<p className="text-base">Regular paragraph text</p>
<p className="text-sm text-muted-foreground">Secondary information</p>
<p className="text-xs text-muted-foreground">Helper text</p>

// Code
<code className="font-mono text-sm bg-muted px-1 rounded">npm install</code>
```

---

## 📏 Spacing

### Scale

```css
0   → 0px
0.5 → 2px
1   → 4px
2   → 8px
3   → 12px
4   → 16px
5   → 20px
6   → 24px
8   → 32px
10  → 40px
12  → 48px
16  → 64px
20  → 80px
24  → 96px
```

### Usage

```tsx
// Padding
<div className="p-4">16px all sides</div>
<div className="px-6 py-4">24px horizontal, 16px vertical</div>

// Margin
<div className="mb-8">32px bottom margin</div>
<div className="mt-4">16px top margin</div>

// Gap (Flexbox/Grid)
<div className="flex gap-4">16px gap between children</div>
<div className="grid grid-cols-3 gap-6">24px gap</div>

// Space between
<div className="space-y-4">16px vertical spacing</div>
<div className="space-x-2">8px horizontal spacing</div>
```

### Layout Containers

```tsx
// Page container
<div className="container mx-auto px-4 py-8">
  {/* Content with 16px horizontal padding, 32px vertical */}
</div>

// Section spacing
<section className="mb-16">
  {/* 64px spacing between sections */}
</section>

// Card spacing
<Card className="p-6">
  {/* 24px padding inside cards */}
</Card>
```

---

## 🧩 Components

### Button

```tsx
// Variants
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

// States
<Button loading>Saving...</Button>
<Button disabled>Disabled</Button>
```

### Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Order #12345</CardTitle>
    <CardDescription>Created on Dec 9, 2025</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Main content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>View Details</Button>
  </CardFooter>
</Card>
```

### Input

```tsx
// Text input
<Input
  type="text"
  placeholder="Enter order number"
  value={value}
  onChange={e => setValue(e.target.value)}
/>

// With label
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
</div>

// With error
<div className="space-y-2">
  <Input className="border-destructive" />
  <p className="text-sm text-destructive">Invalid email</p>
</div>
```

### Badge

```tsx
// Status badges
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Draft</Badge>

// Custom colors
<Badge className="bg-success text-success-foreground">Completed</Badge>
<Badge className="bg-warning text-warning-foreground">Warning</Badge>
```

### Dialog

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button variant="destructive">Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## ✨ Animations

### Transition Durations

```css
--duration-75: 75ms;
--duration-100: 100ms;
--duration-150: 150ms;
--duration-200: 200ms;
--duration-300: 300ms;
--duration-500: 500ms;
```

### Easing Functions

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Hover Animations

```css
/* Lift (Button, Card) */
.hover-lift {
  transition: transform 200ms ease;
}
.hover-lift:hover {
  transform: translateY(-4px);
}

/* Scale (Icon, Image) */
.hover-scale {
  transition: transform 200ms ease;
}
.hover-scale:hover {
  transform: scale(1.05);
}

/* Glow (Focus state) */
.hover-glow {
  transition: box-shadow 200ms ease;
}
.hover-glow:hover {
  box-shadow: 0 0 0 4px hsl(var(--ring) / 0.1);
}
```

### Entrance Animations

```css
/* Fade in */
.fade-in {
  animation: fadeIn 300ms ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Slide in from bottom */
.slide-in {
  animation: slideIn 400ms cubic-bezier(0, 0, 0.2, 1);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Stagger children */
.stagger-fade-in > * {
  animation: fadeIn 400ms ease-out;
  animation-fill-mode: backwards;
}

.stagger-fade-in > *:nth-child(1) { animation-delay: 0ms; }
.stagger-fade-in > *:nth-child(2) { animation-delay: 100ms; }
.stagger-fade-in > *:nth-child(3) { animation-delay: 200ms; }
```

### Loading Animations

```css
/* Spinner */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Pulse (Skeleton) */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

### Usage

```tsx
// Hover effects
<Card className="hover-lift cursor-pointer">
  <CardContent>Click me</CardContent>
</Card>

// Entrance animations
<div className="fade-in">
  <h1>Welcome!</h1>
</div>

// Stagger list
<div className="stagger-fade-in">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

// Loading
<div className="animate-spin">
  <Loader2 />
</div>
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🌓 Dark Mode

### Implementation

```tsx
// app/providers/ThemeProvider.tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  )
}
```

### Toggle Component

```tsx
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

### Smooth Transitions

```css
/* app/globals.css */
* {
  transition: background-color 200ms ease,
              color 200ms ease,
              border-color 200ms ease;
}
```

### Dark Mode Images

```tsx
// Different image for dark mode
<div className="hidden dark:block">
  <Image src="/logo-dark.svg" alt="Logo" />
</div>
<div className="block dark:hidden">
  <Image src="/logo-light.svg" alt="Logo" />
</div>
```

---

## ♿ Accessibility

### WCAG AA Compliance

✅ **Color Contrast**
- Text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- UI components: 3:1 minimum

✅ **Focus Indicators**
```css
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

✅ **Keyboard Navigation**
```tsx
// All interactive elements are keyboard accessible
<Button>Can be triggered with Enter/Space</Button>

// Tab order is logical
<form>
  <Input tabIndex={1} />
  <Input tabIndex={2} />
  <Button tabIndex={3}>Submit</Button>
</form>
```

✅ **Screen Reader Support**
```tsx
// Provide descriptive labels
<Button aria-label="Delete order #12345">
  <Trash2 />
</Button>

// Use semantic HTML
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>

// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  Order saved successfully
</div>
```

✅ **Alt Text for Images**
```tsx
<Image
  src="/product.jpg"
  alt="CNC machine cutting aluminum part"
  width={500}
  height={300}
/>
```

---

## 📱 Responsive Design

### Breakpoints

```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large desktop */
```

### Mobile-First Approach

```tsx
// Base styles for mobile, then add breakpoints
<div className="
  w-full           /* Mobile: full width */
  md:w-1/2         /* Tablet: half width */
  lg:w-1/3         /* Desktop: third width */
  px-4             /* Mobile: 16px padding */
  md:px-6          /* Tablet: 24px padding */
  lg:px-8          /* Desktop: 32px padding */
">
  Content
</div>
```

### Responsive Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</div>
```

### Responsive Typography

```tsx
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  Heading scales with screen size
</h1>
```

### Hide/Show on Breakpoints

```tsx
// Show only on mobile
<div className="block md:hidden">
  Mobile menu
</div>

// Show only on desktop
<div className="hidden md:block">
  Desktop sidebar
</div>
```

---

## ✅ Best Practices

### 1. Use Semantic HTML

✅ **Good:**
```tsx
<nav>
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>

<main>
  <article>
    <h1>Order Details</h1>
    <section>...</section>
  </article>
</main>
```

❌ **Bad:**
```tsx
<div>
  <div>
    <div onClick={navigate}>Dashboard</div>
  </div>
</div>
```

### 2. Consistent Component Usage

✅ **Good:**
```tsx
// Always use Button component
<Button onClick={handleSave}>Save</Button>
<Button variant="secondary">Cancel</Button>
```

❌ **Bad:**
```tsx
// Mix of button, Button, custom div
<button onClick={handleSave}>Save</button>
<div className="cursor-pointer" onClick={cancel}>Cancel</div>
```

### 3. Meaningful Class Names

✅ **Good:**
```tsx
<div className="order-card-container">
  <div className="order-header">...</div>
  <div className="order-details">...</div>
</div>
```

❌ **Bad:**
```tsx
<div className="container1">
  <div className="box1">...</div>
  <div className="box2">...</div>
</div>
```

### 4. Loading States

✅ **Good:**
```tsx
{isLoading ? (
  <Skeleton className="h-32 w-full" />
) : (
  <OrderCard order={order} />
)}
```

❌ **Bad:**
```tsx
{isLoading && <div>Loading...</div>}
{!isLoading && <OrderCard order={order} />}
```

### 5. Error States

✅ **Good:**
```tsx
{error ? (
  <Alert variant="destructive">
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>{error.message}</AlertDescription>
  </Alert>
) : (
  <Content />
)}
```

❌ **Bad:**
```tsx
{error && <p style={{ color: 'red' }}>{error}</p>}
```

---

## 🎨 Design Checklist

Before marking design as complete:

- [ ] All colors use CSS variables (--background, --foreground, etc.)
- [ ] Dark mode works on all pages
- [ ] Smooth transitions between light/dark
- [ ] All interactive elements have hover states
- [ ] Focus indicators visible on all focusable elements
- [ ] Keyboard navigation works everywhere
- [ ] Screen reader tested
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Responsive on mobile (375px), tablet (768px), desktop (1024px+)
- [ ] Loading states for all async operations
- [ ] Error states for all failure scenarios
- [ ] Empty states when no data
- [ ] Consistent spacing (multiples of 4px)
- [ ] Consistent typography (defined font sizes)
- [ ] No inline styles (use Tailwind classes)
- [ ] All images have alt text
- [ ] All forms have labels
- [ ] Toast notifications for user feedback
- [ ] Animations respect prefers-reduced-motion

---

## 📚 Resources

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

**Design System maintained with ❤️ by the CNC-Pilot team**
