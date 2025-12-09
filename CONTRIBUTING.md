# 🤝 CONTRIBUTING TO CNC-PILOT MVP

Dziękujemy za zainteresowanie kontrybu

cją do CNC-Pilot MVP! Ten dokument zawiera wytyczne jak efektywnie współpracować przy projekcie.

---

## 📋 Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Commit Guidelines](#commit-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Testing Requirements](#testing-requirements)
8. [Documentation](#documentation)

---

## 🌟 Code of Conduct

### Our Standards

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the problem, not the person
- Accept responsibility for mistakes
- Learn from each other

---

## 🚀 Getting Started

### Prerequisites

```bash
# Required
- Node.js 18.x or higher
- npm 9.x or higher
- Git

# Recommended
- VS Code with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript
```

### Local Setup

1. **Fork the repository**

2. **Clone your fork**
```bash
git clone https://github.com/YOUR_USERNAME/cnc-pilot-mvp.git
cd cnc-pilot-mvp
```

3. **Install dependencies**
```bash
npm install
```

4. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

5. **Run development server**
```bash
npm run dev
```

6. **Run tests**
```bash
npm test
npm run test:e2e
```

---

## 🔄 Development Workflow

### Branching Strategy

We use **Git Flow**:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Creating a New Feature

```bash
# 1. Create branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 2. Make changes, commit regularly

# 3. Push to your fork
git push origin feature/your-feature-name

# 4. Create Pull Request on GitHub
```

### Example Branch Names

✅ **Good:**
- `feature/add-machine-utilization-chart`
- `bugfix/fix-order-calculation-rounding`
- `hotfix/critical-auth-bypass`

❌ **Bad:**
- `new-feature`
- `fix`
- `update`

---

## 💻 Coding Standards

### TypeScript

**Always use TypeScript. No `any` types.**

✅ **Good:**
```typescript
interface Order {
  id: string
  order_number: string
  customer_name: string
  status: 'pending' | 'in_progress' | 'completed'
}

function getOrder(id: string): Promise<Order> {
  return supabase.from('orders').select('*').eq('id', id).single()
}
```

❌ **Bad:**
```typescript
function getOrder(id: any): any {
  return supabase.from('orders').select('*').eq('id', id).single()
}
```

### React Components

**Use functional components with hooks.**

✅ **Good:**
```tsx
export function OrderCard({ order }: { order: Order }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)
    await deleteOrder(order.id)
    setIsLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{order.order_number}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleDelete} loading={isLoading}>
          Delete
        </Button>
      </CardContent>
    </Card>
  )
}
```

❌ **Bad:**
```tsx
class OrderCard extends React.Component {
  // Don't use class components
}
```

### File Naming

- **Components:** PascalCase (`OrderCard.tsx`)
- **Utilities:** camelCase (`formatDate.ts`)
- **Hooks:** camelCase with `use` prefix (`useAutosave.ts`)
- **Types:** PascalCase (`Order.ts` or in `types/order.ts`)

### Folder Structure

```
app/
  orders/
    page.tsx
    [id]/
      page.tsx
components/
  ui/
    button.tsx
    card.tsx
  dashboard/
    RevenueChart.tsx
  orders/
    OrderCard.tsx
lib/
  supabase.ts
  utils.ts
hooks/
  useAutosave.ts
  useBulkSelection.ts
types/
  order.ts
  machine.ts
```

### Code Style

**Use Prettier and ESLint**

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix lint errors
npm run lint:fix
```

**Tailwind CSS Classes**

Use `cn()` utility for conditional classes:

```tsx
import { cn } from '@/lib/utils'

<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' && 'primary-class'
)}>
```

**Avoid inline styles unless absolutely necessary:**

❌ **Bad:**
```tsx
<div style={{ marginTop: '20px', color: 'red' }}>
```

✅ **Good:**
```tsx
<div className="mt-5 text-red-500">
```

---

## 📝 Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, no logic change)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Add or update tests
- `chore` - Build process, tooling changes

### Examples

✅ **Good commits:**

```
feat(orders): add export to CSV functionality

Implemented CSV export for orders list using exportToCSV utility.
Includes proper UTF-8 BOM for Polish characters.

Closes #123
```

```
fix(auth): resolve session timeout on page refresh

Session was being lost when user refreshed the page.
Added session persistence to localStorage.

Fixes #456
```

```
test(hooks): add unit tests for useAutosave

Added comprehensive tests covering:
- Debounce functionality
- localStorage persistence
- beforeunload warning
```

❌ **Bad commits:**

```
fix stuff
```

```
update
```

```
WIP
```

### Commit Frequency

- Commit **early and often**
- Each commit should be a **logical unit** of work
- Don't commit broken code to `main` or `develop`

---

## 🔀 Pull Request Process

### Before Creating PR

✅ **Checklist:**
- [ ] Code follows style guidelines
- [ ] All tests pass (`npm test` && `npm run test:e2e`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Added tests for new features
- [ ] Updated documentation if needed
- [ ] Rebased on latest `develop`

### PR Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How to Test
1. Go to '...'
2. Click on '...'
3. See result

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### PR Review Process

1. **Author** creates PR from `feature/*` to `develop`
2. **CI/CD** runs automated tests
3. **Reviewer(s)** review code
4. **Author** addresses feedback
5. **Maintainer** merges PR

### Review Guidelines

**As a Reviewer:**
- Be kind and constructive
- Suggest improvements, don't demand
- Approve if code is "good enough" (don't block on nitpicks)
- Test the changes locally if possible

**As an Author:**
- Respond to all comments
- Don't take feedback personally
- Ask questions if unclear
- Request re-review after changes

---

## ✅ Testing Requirements

### Unit Tests

**All new features must include unit tests.**

```typescript
// __tests__/hooks/useAutosave.test.ts
import { renderHook, act } from '@testing-library/react'
import { useAutosave } from '@/hooks/useAutosave'

describe('useAutosave', () => {
  it('should call onSave after debounce', async () => {
    const onSave = vi.fn()
    const { result } = renderHook(() => useAutosave({ data: {}, onSave, debounce: 1000 }))

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(onSave).toHaveBeenCalled()
  })
})
```

### E2E Tests

**Critical user flows must have E2E tests.**

```typescript
// e2e/orders.spec.ts
test('should create new order', async ({ page }) => {
  await page.goto('/orders/new')
  await page.fill('input[name="order_number"]', 'ORD-123')
  await page.click('button:has-text("Zapisz")')
  await expect(page.locator('.toast')).toContainText('Zapisano')
})
```

### Test Coverage

Target: **80%+ coverage**

```bash
npm test -- --coverage
```

---

## 📖 Documentation

### When to Update Documentation

Update docs when you:
- Add new feature
- Change API
- Modify configuration
- Fix significant bug

### Documentation Files

- `README.md` - Project overview, quick start
- `FEATURES_COMPLETE.md` - Feature list with examples
- `ARCHITECTURE.md` - System architecture
- `PRODUCTION_READINESS.md` - Deployment guide
- `TESTING_GUIDE.md` - How to test features
- `CONTRIBUTING.md` - This file

### Code Comments

**Write comments for WHY, not WHAT.**

✅ **Good:**
```typescript
// Debounce save to prevent excessive API calls
// when user is typing rapidly
const debouncedSave = useMemo(
  () => debounce(performSave, 2000),
  []
)
```

❌ **Bad:**
```typescript
// Call debounce function
const debouncedSave = useMemo(
  () => debounce(performSave, 2000),
  []
)
```

### JSDoc for Public APIs

```typescript
/**
 * Exports data to CSV format with UTF-8 BOM for Polish characters
 *
 * @param data - Array of objects to export
 * @param filename - Name of the downloaded file (without extension)
 * @param columns - Optional column configuration
 *
 * @example
 * exportToCSV(orders, 'orders-2024', [
 *   { key: 'order_number', label: 'Numer' },
 *   { key: 'customer_name', label: 'Klient' }
 * ])
 */
export function exportToCSV<T>(
  data: T[],
  filename: string,
  columns?: Array<{ key: keyof T; label: string }>
): void {
  // Implementation
}
```

---

## 🐛 Reporting Bugs

### Bug Report Template

```markdown
**Describe the bug**
Clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. Windows 11]
- Browser: [e.g. Chrome 120]
- Version: [e.g. 1.2.0]

**Additional context**
Any other relevant information.
```

---

## 💡 Feature Requests

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Clear description of the problem.

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives you've considered**
Other solutions you thought of.

**Additional context**
Mockups, examples, etc.
```

---

## 🎯 Best Practices

### Performance

- Use `React.memo` for expensive components
- Use `useMemo` / `useCallback` appropriately
- Lazy load heavy components with `dynamic()`
- Optimize images with Next.js `Image`
- Use virtual lists for long lists (>100 items)

### Accessibility

- All interactive elements must be keyboard accessible
- Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- Provide `aria-label` for icon-only buttons
- Ensure color contrast meets WCAG AA
- Test with screen reader

### Security

- Never commit API keys or secrets
- Validate all user input
- Use parameterized SQL queries
- Enable RLS on all Supabase tables
- Sanitize data before rendering

---

## 📞 Getting Help

- **Questions?** Open a [Discussion](https://github.com/yourorg/cnc-pilot-mvp/discussions)
- **Bug?** Open an [Issue](https://github.com/yourorg/cnc-pilot-mvp/issues)
- **Chat:** Join our [Discord](#)

---

## 🙏 Thank You!

Your contributions make this project better for everyone. We appreciate your time and effort!

Happy coding! 🚀
