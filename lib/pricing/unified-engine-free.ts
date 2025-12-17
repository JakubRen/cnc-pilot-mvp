// =====================================================
// UNIFIED PRICING ENGINE - FREE VERSION
// =====================================================
// Combines rule-based calculator + historical data
// NO AI, NO OpenAI API calls
// 100% free pricing intelligence
// =====================================================

import { calculatePricing } from '@/lib/pricing-calculator'
import { getSmartPricing } from '@/lib/pricing-engine'
import type { UnifiedPricingResult } from '@/types/quotes'
import type { PricingEstimateRequest } from '@/types/pricing'
import { logger } from '@/lib/logger'

export interface UnifiedPricingParams {
  material: string
  quantity: number
  partName?: string
  length?: number
  width?: number
  height?: number
  complexity?: 'simple' | 'medium' | 'complex'
}

/**
 * Get unified pricing recommendation
 * Combines rule-based calculator with historical data
 * Decision logic:
 * 1. If ≥5 similar orders → use historical (high confidence)
 * 2. If 3-4 similar orders → hybrid (average of both)
 * 3. Otherwise → rule-based only
 */
export async function getUnifiedPricing(
  params: UnifiedPricingParams
): Promise<UnifiedPricingResult> {
  const {
    material,
    quantity,
    partName,
    length,
    width,
    height,
    complexity = 'medium'
  } = params

  try {
    // Run both pricing engines in parallel
    const [ruleBasedResult, historicalResult] = await Promise.all([
      // 1. Rule-based calculator (always runs)
      Promise.resolve(calculatePricing({
        material,
        quantity,
        partName,
        length,
        width,
        height,
        complexity
      } as PricingEstimateRequest)),

      // 2. Historical data (may return null if no part name)
      partName && material
        ? getSmartPricing(partName, material)
        : Promise.resolve(null)
    ])

    // Convert historical confidence to number
    const historicalConfidenceNum = historicalResult
      ? historicalResult.confidence === 'high' ? 90
        : historicalResult.confidence === 'medium' ? 70
        : 50
      : 0

    // Decision logic: Pick best pricing method
    let recommendedPrice: number
    let recommendedPricePerUnit: number
    let recommendedMethod: 'rule_based' | 'historical' | 'hybrid'
    let recommendedConfidence: number
    let recommendedReasoning: string
    // Convert machiningCost → laborCost for QuoteBreakdown compatibility
    let recommendedBreakdown = {
      materialCost: ruleBasedResult.breakdown.materialCost,
      laborCost: ruleBasedResult.breakdown.machiningCost,
      setupCost: ruleBasedResult.breakdown.setupCost,
      marginPercentage: ruleBasedResult.breakdown.marginPercentage,
      totalCostBeforeMargin: ruleBasedResult.breakdown.totalCostBeforeMargin
    }

    // SCENARIO 1: High confidence historical data (≥5 orders)
    if (historicalResult && historicalResult.confidence === 'high' && historicalResult.orderCount >= 5) {
      recommendedPrice = historicalResult.avgPrice * quantity
      recommendedPricePerUnit = historicalResult.avgPrice
      recommendedMethod = 'historical'
      recommendedConfidence = 90
      recommendedReasoning = `Oparte na ${historicalResult.orderCount} podobnych zamówieniach z historii. ` +
        `Średnia cena: ${historicalResult.avgPrice.toFixed(2)} PLN/szt. ` +
        `Zakres cenowy: ${historicalResult.minPrice}-${historicalResult.maxPrice} PLN/szt. ` +
        `Średni czas realizacji: ${historicalResult.avgDuration}h. ` +
        `Wysoka pewność dzięki dużej próbce danych.`

      // Estimate breakdown from historical price
      const totalCost = recommendedPrice / (1 + recommendedBreakdown.marginPercentage / 100)
      recommendedBreakdown = {
        materialCost: totalCost * 0.4,
        laborCost: totalCost * 0.5,
        setupCost: totalCost * 0.1,
        marginPercentage: recommendedBreakdown.marginPercentage,
        totalCostBeforeMargin: totalCost
      }
    }
    // SCENARIO 2: Medium confidence historical (3-4 orders) - HYBRID
    else if (historicalResult && historicalResult.confidence === 'medium' && historicalResult.orderCount >= 3) {
      const historicalPriceTotal = historicalResult.avgPrice * quantity
      const ruleBasedPrice = ruleBasedResult.suggestedPrice

      // Average of both methods
      recommendedPrice = (historicalPriceTotal + ruleBasedPrice) / 2
      recommendedPricePerUnit = recommendedPrice / quantity
      recommendedMethod = 'hybrid'
      recommendedConfidence = 75
      recommendedReasoning = `Wycena hybrydowa: średnia z ${historicalResult.orderCount} podobnych zleceń ` +
        `(${historicalResult.avgPrice.toFixed(2)} PLN/szt) oraz kalkulatora rule-based ` +
        `(${ruleBasedResult.pricePerUnit.toFixed(2)} PLN/szt). ` +
        `Średnia pewność - dane historyczne wspomagają kalkulator.`

      // Average breakdown
      const historicalBreakdown = {
        materialCost: historicalPriceTotal * 0.4,
        laborCost: historicalPriceTotal * 0.5,
        setupCost: historicalPriceTotal * 0.1,
        marginPercentage: ruleBasedResult.breakdown.marginPercentage,
        totalCostBeforeMargin: historicalPriceTotal / (1 + ruleBasedResult.breakdown.marginPercentage / 100)
      }

      recommendedBreakdown = {
        materialCost: (ruleBasedResult.breakdown.materialCost + historicalBreakdown.materialCost) / 2,
        laborCost: (ruleBasedResult.breakdown.machiningCost + historicalBreakdown.laborCost) / 2,  // machiningCost → laborCost
        setupCost: (ruleBasedResult.breakdown.setupCost + historicalBreakdown.setupCost) / 2,
        marginPercentage: ruleBasedResult.breakdown.marginPercentage,
        totalCostBeforeMargin: (ruleBasedResult.breakdown.totalCostBeforeMargin + historicalBreakdown.totalCostBeforeMargin) / 2
      }
    }
    // SCENARIO 3: Rule-based only (no historical or low confidence)
    else {
      recommendedPrice = ruleBasedResult.suggestedPrice
      recommendedPricePerUnit = ruleBasedResult.pricePerUnit
      recommendedMethod = 'rule_based'
      recommendedConfidence = ruleBasedResult.confidence
      recommendedReasoning = ruleBasedResult.reasoning

      recommendedBreakdown = {
        materialCost: ruleBasedResult.breakdown.materialCost,
        laborCost: ruleBasedResult.breakdown.machiningCost,
        setupCost: ruleBasedResult.breakdown.setupCost,
        marginPercentage: ruleBasedResult.breakdown.marginPercentage,
        totalCostBeforeMargin: ruleBasedResult.breakdown.totalCostBeforeMargin
      }
    }

    // Build unified result
    const result: UnifiedPricingResult = {
      recommended: {
        price: Math.round(recommendedPrice * 100) / 100,
        pricePerUnit: Math.round(recommendedPricePerUnit * 100) / 100,
        method: recommendedMethod,
        confidence: recommendedConfidence,
        reasoning: recommendedReasoning,
        breakdown: {
          materialCost: Math.round(recommendedBreakdown.materialCost * 100) / 100,
          laborCost: Math.round(recommendedBreakdown.laborCost * 100) / 100,
          setupCost: Math.round(recommendedBreakdown.setupCost * 100) / 100,
          marginPercentage: recommendedBreakdown.marginPercentage,
          totalCostBeforeMargin: Math.round((recommendedBreakdown.totalCostBeforeMargin || 0) * 100) / 100
        }
      },
      estimates: {
        ruleBased: {
          price: Math.round(ruleBasedResult.suggestedPrice * 100) / 100,
          confidence: ruleBasedResult.confidence,
          breakdown: {
            materialCost: Math.round(ruleBasedResult.breakdown.materialCost * 100) / 100,
            laborCost: Math.round(ruleBasedResult.breakdown.machiningCost * 100) / 100,
            setupCost: Math.round(ruleBasedResult.breakdown.setupCost * 100) / 100,
            marginPercentage: ruleBasedResult.breakdown.marginPercentage,
            totalCostBeforeMargin: Math.round(ruleBasedResult.breakdown.totalCostBeforeMargin * 100) / 100
          },
          reasoning: ruleBasedResult.reasoning
        },
        historical: historicalResult ? {
          price: Math.round(historicalResult.avgPrice * quantity * 100) / 100,
          confidence: historicalConfidenceNum,
          orderCount: historicalResult.orderCount,
          reasoning: `Znaleziono ${historicalResult.orderCount} podobnych zleceń. ` +
            `Zakres cen: ${historicalResult.minPrice}-${historicalResult.maxPrice} PLN/szt. ` +
            `Średni czas: ${historicalResult.avgDuration}h.`,
          minPrice: historicalResult.minPrice,
          maxPrice: historicalResult.maxPrice,
          avgDuration: historicalResult.avgDuration
        } : null
      }
    }

    logger.info('Unified pricing calculated', {
      method: recommendedMethod,
      price: recommendedPrice,
      confidence: recommendedConfidence,
      hasHistorical: !!historicalResult
    })

    return result

  } catch (error) {
    logger.error('Error in unified pricing engine', { error, params })

    // Fallback to rule-based only
    const fallbackResult = calculatePricing({
      material,
      quantity,
      partName,
      length,
      width,
      height,
      complexity
    } as PricingEstimateRequest)

    return {
      recommended: {
        price: fallbackResult.suggestedPrice,
        pricePerUnit: fallbackResult.pricePerUnit,
        method: 'rule_based',
        confidence: fallbackResult.confidence,
        reasoning: fallbackResult.reasoning + ' (Fallback - błąd pobierania danych historycznych)',
        breakdown: {
          materialCost: fallbackResult.breakdown.materialCost,
          laborCost: fallbackResult.breakdown.machiningCost,
          setupCost: fallbackResult.breakdown.setupCost,
          marginPercentage: fallbackResult.breakdown.marginPercentage,
          totalCostBeforeMargin: fallbackResult.breakdown.totalCostBeforeMargin
        }
      },
      estimates: {
        ruleBased: {
          price: fallbackResult.suggestedPrice,
          confidence: fallbackResult.confidence,
          breakdown: {
            materialCost: fallbackResult.breakdown.materialCost,
            laborCost: fallbackResult.breakdown.machiningCost,
            setupCost: fallbackResult.breakdown.setupCost,
            marginPercentage: fallbackResult.breakdown.marginPercentage,
            totalCostBeforeMargin: fallbackResult.breakdown.totalCostBeforeMargin
          },
          reasoning: fallbackResult.reasoning
        },
        historical: null
      }
    }
  }
}
