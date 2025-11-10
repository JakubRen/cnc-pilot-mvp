import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import EditInventoryForm from './EditInventoryForm'

export default async function EditInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !item) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Edit: {item.name}</h1>
        <p className="text-slate-400 mb-8">SKU: {item.sku}</p>
        <EditInventoryForm item={item} />
      </div>
    </div>
  )
}
