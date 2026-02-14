import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth-server'
import { getAutoReorderDrafts } from '@/lib/ai/features/auto-reorder'

// =====================================================
// GET /api/agents/auto-reorder
// Returns auto-generated draft purchase orders grouped by supplier.
// =====================================================

export async function GET() {
  try {
    const userProfile = await getUserProfile()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = userProfile.company_id
    const drafts = await getAutoReorderDrafts(companyId)

    // Transform to frontend contract (flatten items for simpler display)
    const flatDrafts = drafts.flatMap(draft =>
      draft.items.map(item => ({
        id: `${draft.supplierId || 'no-supplier'}-${item.itemId}`,
        product_name: item.itemName,
        sku: null, // inventory table doesn't expose SKU here
        suggested_quantity: item.orderQuantity,
        current_stock: 0, // Would need to re-query; available via item context
        days_until_stockout: null, // Could be calculated from daily rate
        supplier_name: draft.supplierName,
        estimated_cost: item.estimatedLineCostPln,
        urgency: draft.urgency,
        reason: item.reason,
        created_at: draft.createdAt,
      }))
    )

    // Also return grouped format for supplier-grouped view
    const grouped = drafts.map(draft => ({
      supplier_id: draft.supplierId,
      supplier_name: draft.supplierName,
      items: draft.items.map(item => ({
        item_id: item.itemId,
        item_name: item.itemName,
        order_quantity: item.orderQuantity,
        estimated_unit_cost_pln: item.estimatedUnitCostPln,
        estimated_line_cost_pln: item.estimatedLineCostPln,
        reason: item.reason,
      })),
      total_estimated_cost_pln: draft.totalEstimatedCostPln,
      urgency: draft.urgency,
      created_at: draft.createdAt,
    }))

    return NextResponse.json({
      success: true,
      data: flatDrafts,
      grouped,
      count: flatDrafts.length,
      supplier_count: drafts.length,
    })
  } catch (error) {
    console.error('[auto-reorder] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
