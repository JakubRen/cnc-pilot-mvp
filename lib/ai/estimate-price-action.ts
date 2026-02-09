'use server'

import { estimatePrice, type PriceEstimateParams, type PriceEstimateResult } from '@/lib/ai/openai-client'
import { getUserProfile } from '@/lib/auth-server'

export async function estimatePriceAction(params: PriceEstimateParams): Promise<PriceEstimateResult & { error?: string }> {
  const userProfile = await getUserProfile()
  if (!userProfile?.company_id) {
    return {
      estimatedPrice: 0,
      estimatedHours: 0,
      confidence: 0,
      breakdown: { materialCost: 0, laborCost: 0, machineTimeCost: 0, overhead: 0 },
      reasoning: '',
      error: 'Unauthorized',
    }
  }

  return estimatePrice(params)
}
