# Form Validation Visual Feedback

## Components

### FormField
Individual form field with validation states

### FormErrorsSummary
Summary of all form errors at the top

## Usage

```typescript
import { FormField, FormErrorsSummary } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'

function MyForm() {
  const { register, formState: { errors, dirtyFields }, handleSubmit } = useForm()

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Errors summary at top */}
      <FormErrorsSummary errors={errors} className="mb-6" />

      {/* Form fields with validation */}
      <FormField
        label="Nazwa klienta"
        error={errors.customer_name}
        success={dirtyFields.customer_name && !errors.customer_name}
        required
        hint="Pełna nazwa firmy lub osoby"
      >
        <Input
          {...register('customer_name')}
          placeholder="np. Metal-Precyzja Sp. z o.o."
        />
      </FormField>

      <FormField
        label="Email"
        error={errors.email}
        success={dirtyFields.email && !errors.email}
        required
      >
        <Input
          {...register('email')}
          type="email"
          placeholder="kontakt@firma.pl"
        />
      </FormField>
    </form>
  )
}
```

## Features

✅ **Error Icons** - Red X icon for invalid fields
✅ **Success Icons** - Green checkmark for valid fields
✅ **Shake Animation** - Fields shake when validation fails
✅ **Color Coding** - Red borders for errors, green for success
✅ **Errors Summary** - All errors displayed at top of form
✅ **Inline Messages** - Error messages below each field
✅ **Hint Text** - Optional helper text
✅ **Required Indicator** - Red asterisk for required fields
✅ **Dark Mode** - Fully styled for both themes

## Props

### FormField

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Field label |
| `error` | `FieldError \| string` | Error from react-hook-form or custom string |
| `success` | `boolean` | Show success state (green checkmark) |
| `required` | `boolean` | Show required asterisk |
| `hint` | `string` | Helper text below input (hidden when error shown) |
| `children` | `ReactNode` | Input component |
| `className` | `string` | Additional classes |

### FormErrorsSummary

| Prop | Type | Description |
|------|------|-------------|
| `errors` | `Record<string, any>` | Errors object from react-hook-form |
| `className` | `string` | Additional classes |

## Validation States

### Error State
- Red border on input
- Red X icon on right
- Error message below with icon
- Shake animation on submit
- Listed in errors summary

### Success State
- Green border on input
- Green checkmark icon on right
- Hint text shown if provided

### Neutral State
- Default border color
- Hint text shown if provided

## Example: Complete Form

```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2, 'Nazwa musi mieć min. 2 znaki'),
  email: z.string().email('Nieprawidłowy email'),
  quantity: z.number().min(1, 'Ilość musi być > 0'),
})

function OrderForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data) => {
    // Save data
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormErrorsSummary errors={errors} />

      <FormField
        label="Nazwa zamówienia"
        error={errors.name}
        success={dirtyFields.name && !errors.name}
        required
      >
        <Input {...register('name')} />
      </FormField>

      <FormField
        label="Email kontaktowy"
        error={errors.email}
        success={dirtyFields.email && !errors.email}
        required
        hint="Wyślemy powiadomienie na ten adres"
      >
        <Input {...register('email')} type="email" />
      </FormField>

      <FormField
        label="Ilość"
        error={errors.quantity}
        success={dirtyFields.quantity && !errors.quantity}
        required
      >
        <Input {...register('quantity', { valueAsNumber: true })} type="number" />
      </FormField>

      <Button type="submit" isLoading={isSubmitting}>
        Zapisz zamówienie
      </Button>
    </form>
  )
}
```

## Animations

The shake animation triggers automatically when:
- Form is submitted with errors
- Individual field has an error

Duration: 400ms
Intensity: ±4px horizontal movement
