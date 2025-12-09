# Micro-Animations Guide

## Overview

Subtelne animacje które poprawiają user experience bez przesadzania. Wszystkie animacje są zoptymalizowane pod kątem performance (używają `transform` i `opacity`).

## Hover Effects

### Hover Lift
Podnosi element przy hoverze + cień

```tsx
<div className="hover-lift rounded-lg p-4 bg-white dark:bg-slate-800">
  Card content
</div>
```

### Hover Scale
Lekkie powiększenie przy hoverze

```tsx
<button className="hover-scale px-4 py-2 bg-blue-600 text-white rounded-lg">
  Kliknij mnie
</button>
```

### Hover Glow
Świecenie przy hoverze (niebieski/cyan w zależności od motywu)

```tsx
<div className="hover-glow border border-slate-200 dark:border-slate-700 rounded-lg p-6">
  Important card
</div>
```

## Entrance Animations

### Fade In
Pojawienie się z lekkim przesunięciem z dołu

```tsx
<div className="animate-fade-in">
  Zawartość która się pojawia
</div>

{/* Wolniejsza wersja */}
<div className="animate-fade-in-slow">
  Zawartość która się pojawia powoli
</div>
```

### Slide In Right
Wjazd z prawej strony

```tsx
<div className="animate-slide-in-right">
  Nowy element
</div>
```

### Slide In Left
Wjazd z lewej strony

```tsx
<div className="animate-slide-in-left">
  Nowy element
</div>
```

### Scale In
Pojawienie się ze skalowaniem

```tsx
<div className="animate-scale-in">
  Modal content
</div>
```

## Loading States

### Pulse Slow
Wolne pulsowanie (dla loading states)

```tsx
<div className="animate-pulse-slow bg-slate-200 dark:bg-slate-700 h-20 rounded-lg">
  Loading...
</div>
```

## Notifications

### Bounce Small
Małe podskoczenie (dla notyfikacji)

```tsx
<div className="animate-bounce-small bg-blue-500 text-white px-4 py-2 rounded-lg">
  Nowa wiadomość!
</div>
```

## List Animations

### Stagger Fade In
Każdy element listy pojawia się po kolei z opóźnieniem

```tsx
<div className="stagger-fade-in space-y-4">
  <div>Element 1</div>
  <div>Element 2</div>
  <div>Element 3</div>
  <div>Element 4</div>
  {/* Do 10 elementów wspieranych automatycznie */}
</div>
```

## Smooth Transitions

### All Properties
Płynne przejścia dla wszystkich właściwości

```tsx
<div className="transition-all-smooth hover:bg-blue-100 dark:hover:bg-blue-900">
  Hover me
</div>
```

### Colors Only
Płynne przejścia tylko dla kolorów (wydajniejsze)

```tsx
<button className="transition-colors-smooth hover:text-blue-600 dark:hover:text-blue-400">
  Hover for color change
</button>
```

## Usage Examples

### Dashboard Card

```tsx
<div className="glass-panel hover-lift rounded-xl p-6 animate-fade-in">
  <h3 className="text-lg font-semibold mb-2">Zamówienia</h3>
  <p className="text-3xl font-bold">142</p>
</div>
```

### Metric Cards Grid

```tsx
<div className="grid grid-cols-4 gap-6 stagger-fade-in">
  <MetricCard title="Wszystkie" value="142" />
  <MetricCard title="W realizacji" value="38" />
  <MetricCard title="Ukończone" value="95" />
  <MetricCard title="Opóźnione" value="9" />
</div>
```

### Action Button

```tsx
<button className="hover-scale transition-colors-smooth bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">
  Dodaj zamówienie
</button>
```

### Notification Toast (when it appears)

```tsx
<div className="animate-slide-in-right animate-bounce-small glass-panel p-4 rounded-lg">
  Zmiany zapisane!
</div>
```

### Loading Skeleton

```tsx
<div className="animate-pulse-slow bg-slate-200 dark:bg-slate-700 h-20 rounded-lg" />
```

### Modal/Dialog

```tsx
{isOpen && (
  <>
    {/* Backdrop fade in */}
    <div className="fixed inset-0 bg-black/60 animate-fade-in" />

    {/* Modal scale in */}
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="animate-scale-in glass-panel rounded-xl p-6">
        Modal content
      </div>
    </div>
  </>
)}
```

### Navigation Items

```tsx
<nav>
  <a href="/" className="transition-colors-smooth hover:text-blue-600 dark:hover:text-blue-400">
    Dashboard
  </a>
  <a href="/orders" className="transition-colors-smooth hover:text-blue-600 dark:hover:text-blue-400">
    Zamówienia
  </a>
</nav>
```

### Interactive Card

```tsx
<Link href={`/orders/${order.id}`}>
  <div className="glass-panel hover-lift hover-glow rounded-lg p-6 transition-all-smooth cursor-pointer">
    <h3 className="font-semibold">{order.order_number}</h3>
    <p className="text-slate-500 dark:text-slate-400">{order.customer_name}</p>
  </div>
</Link>
```

## Performance Tips

1. **Use `transform` and `opacity`** - Te właściwości są najszybsze do animowania
2. **Avoid animating `width`, `height`, `top`, `left`** - Powodują reflow
3. **Prefer CSS animations over JavaScript** - Lepsze performance
4. **Use `will-change` sparingly** - Tylko dla animacji które naprawdę tego potrzebują
5. **Limit stagger-fade-in** - Do max 10 elementów jednocześnie

## Animation Durations

- **Quick (0.2s)**: Hover effects, scale animations
- **Normal (0.3s)**: Fade in, slide in, most entrance animations
- **Slow (0.5s)**: Important entrance animations, modals
- **Very Slow (2s)**: Loading pulses

## Combining Animations

Możesz łączyć klasy:

```tsx
<div className="animate-fade-in hover-lift hover-glow transition-colors-smooth">
  Kombinacja: fade in + hover lift + hover glow + smooth colors
</div>
```

## Accessibility

Wszystkie animacje respektują `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Dodaj to do globals.css jeśli chcesz wspierać użytkowników z preferencją reduced motion.
