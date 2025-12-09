// Example code splitting and memoization patterns

// 1. CODE SPLITTING - Dynamic imports
// Use in pages for heavy components:
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false
})

// 2. MEMOIZATION - React.memo
// Wrap expensive components:
export const ExpensiveList = React.memo(({ items }) => {
  return items.map(item => <Item key={item.id} {...item} />)
}, (prevProps, nextProps) => {
  return prevProps.items === nextProps.items
})

// 3. useMemo for expensive calculations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name))
}, [items])

// 4. useCallback for stable function references
const handleClick = useCallback((id: string) => {
  // Handle click
}, [/* dependencies */])

