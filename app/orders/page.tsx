import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import OrdersClient from './OrdersClient'
import { Button } from '@/components/ui/Button'

export default async function OrdersPage() {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch orders filtered by company
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('company_id', userProfile.company_id)
    .order('deadline', { ascending: true })

  // Fetch all order tags for filtering
  const { data: orderTags } = await supabase
    .from('entity_tags')
    .select(`
      entity_id,
      tag_id,
      tags (
        id,
        name,
        color
      )
    `)
    .eq('entity_type', 'order')
    .in('entity_id', (orders || []).map(o => o.id))

  // Create a map of order_id -> tags[]
  type TagData = { id: string; name: string; color: string }
  const orderTagsMap: Record<string, TagData[]> = {}
  if (orderTags) {
    orderTags.forEach((et) => {
      const entityId = et.entity_id as string
      const tagData = et.tags as unknown as TagData | null
      if (!orderTagsMap[entityId]) {
        orderTagsMap[entityId] = []
      }
      if (tagData) {
        orderTagsMap[entityId].push(tagData)
      }
    })
  }

  // Attach tags to each order
  const ordersWithTags = (orders || []).map(order => ({
    ...order,
    tags: orderTagsMap[order.id] || []
  }))

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">Zamówienia</h1>
            <Button href="/orders/add" variant="primary">
              + Dodaj Zamówienie
            </Button>
          </div>

          <OrdersClient orders={ordersWithTags} currentUserRole={userProfile.role} />
        </div>
      </div>
    </AppLayout>
  )
}
