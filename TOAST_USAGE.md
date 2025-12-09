# Toast Usage Guide

## Import

```typescript
import { customToast } from '@/lib/toast'
```

## Basic Usage

### Success Toast
```typescript
customToast.success('Zamówienie zapisane!')
```

### Error Toast
```typescript
customToast.error('Wystąpił błąd podczas zapisywania')
```

### Warning Toast
```typescript
customToast.warning('Ta akcja wymaga potwierdzenia')
```

### Info Toast
```typescript
customToast.info('Nowa wersja aplikacji jest dostępna')
```

### Loading Toast
```typescript
const loadingToast = customToast.loading('Zapisywanie...')
// Later:
toast.dismiss(loadingToast)
```

## Advanced Features

### Toast with Undo Action
```typescript
customToast.withUndo(
  'Zamówienie usunięte',
  () => {
    // Undo logic here
    console.log('Cofnięto usunięcie')
  }
)
```

### Promise Toast (auto-loading, success, error)
```typescript
await customToast.promise(
  supabase.from('orders').insert(data),
  {
    loading: 'Zapisywanie zamówienia...',
    success: 'Zamówienie zapisane!',
    error: 'Nie udało się zapisać zamówienia',
  }
)
```

### Custom Duration
```typescript
customToast.success('Szybka wiadomość', { duration: 1000 })
customToast.error('Długa wiadomość błędu', { duration: 10000 })
```

### Custom Icon
```typescript
customToast.info('Custom icon toast', {
  icon: <span>🚀</span>
})
```

### With Action Button
```typescript
customToast.success('Dane wyeksportowane', {
  action: {
    label: 'Pobierz',
    onClick: () => {
      // Download logic
    }
  }
})
```

## Features

✅ **Icons** - Automatically displays appropriate icons for each toast type
✅ **Undo Actions** - Easy undo functionality with `withUndo()`
✅ **Promise Handling** - Automatic loading → success/error flow
✅ **Dark Mode** - Fully styled for both light and dark themes
✅ **Animations** - Smooth enter/exit animations
✅ **Accessibility** - Close button and ARIA labels
✅ **Dismissible** - Click X to close manually

## Migrating from react-hot-toast

### Before
```typescript
import toast from 'react-hot-toast'
toast.success('Done!')
toast.error('Error!')
const loading = toast.loading('Loading...')
```

### After
```typescript
import { customToast } from '@/lib/toast'
customToast.success('Done!')
customToast.error('Error!')
const loading = customToast.loading('Loading...')
```

## Example: Form Submission

```typescript
async function handleSubmit(data: FormData) {
  await customToast.promise(
    saveOrder(data),
    {
      loading: 'Zapisywanie zamówienia...',
      success: (order) => `Zamówienie ${order.order_number} zapisane!`,
      error: (err) => `Błąd: ${err.message}`,
    }
  )
}
```

## Example: Delete with Undo

```typescript
function handleDelete(id: string) {
  // Optimistically delete
  const deletedItem = items.find(i => i.id === id)
  setItems(items.filter(i => i.id !== id))

  customToast.withUndo(
    'Element usunięty',
    () => {
      // Restore item
      setItems([...items, deletedItem])
    }
  )

  // Actually delete after undo window expires
  setTimeout(() => {
    supabase.from('items').delete().eq('id', id)
  }, 5000)
}
```
