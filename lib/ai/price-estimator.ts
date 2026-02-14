// Price Estimator & Order Summary — migrated from openai-client.ts to use callGemini()
import { callGemini, callGeminiText } from '@/lib/ai/gemini-client'
import { SchemaType } from '@/lib/ai/schema-types'
import { logger } from '@/lib/logger'

export interface PriceEstimateParams {
  material: string
  dimensions?: string
  complexity?: 'low' | 'medium' | 'high'
  quantity?: number
  additionalNotes?: string
}

export interface PriceEstimateResult {
  estimatedPrice: number
  estimatedHours: number
  confidence: number
  breakdown: {
    materialCost: number
    laborCost: number
    machineTimeCost: number
    overhead: number
  }
  reasoning: string
}

export async function estimatePrice(
  params: PriceEstimateParams,
  companyContext?: {
    averageHourlyRate?: number
    typicalMaterialCosts?: Record<string, number>
  }
): Promise<PriceEstimateResult> {
  const {
    material,
    dimensions,
    complexity = 'medium',
    quantity = 1,
    additionalNotes,
  } = params

  const hourlyRate = companyContext?.averageHourlyRate || 150 // PLN per hour default
  const materialCosts = companyContext?.typicalMaterialCosts || {
    stal: 50,
    aluminium: 80,
    miedź: 120,
    plastik: 30,
  }

  const prompt = `Jesteś ekspertem od wyceny obróbki CNC. Na podstawie danych podaj szczegółową wycenę.

**Szczegóły zlecenia:**
- Materiał: ${material}
- Wymiary: ${dimensions || 'Nie podano'}
- Złożoność: ${complexity}
- Ilość sztuk: ${quantity}
- Uwagi: ${additionalNotes || 'Brak'}

**Kontekst firmy:**
- Stawka godzinowa: ${hourlyRate} PLN
- Typowe koszty materiałów (PLN/kg): ${JSON.stringify(materialCosts)}

Podaj wycenę w PLN. Reasoning po polsku.`

  const result = await callGemini<PriceEstimateResult>({
    label: 'price-estimator',
    prompt,
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        estimatedPrice: { type: SchemaType.NUMBER, description: 'Szacowana cena całkowita w PLN' },
        estimatedHours: { type: SchemaType.NUMBER, description: 'Szacowane godziny pracy' },
        confidence: { type: SchemaType.NUMBER, description: 'Pewność wyceny 0-100' },
        breakdown: {
          type: SchemaType.OBJECT,
          properties: {
            materialCost: { type: SchemaType.NUMBER },
            laborCost: { type: SchemaType.NUMBER },
            machineTimeCost: { type: SchemaType.NUMBER },
            overhead: { type: SchemaType.NUMBER },
          },
          required: ['materialCost', 'laborCost', 'machineTimeCost', 'overhead'],
        },
        reasoning: { type: SchemaType.STRING, description: 'Uzasadnienie wyceny po polsku' },
      },
      required: ['estimatedPrice', 'estimatedHours', 'confidence', 'breakdown', 'reasoning'],
    },
    temperature: 0.3,
  })

  if (result) {
    return result.data
  }

  return heuristicEstimate(params, hourlyRate, materialCosts)
}

function heuristicEstimate(
  params: PriceEstimateParams,
  hourlyRate: number,
  materialCosts: Record<string, number>
): PriceEstimateResult {
  const { material, complexity = 'medium', quantity = 1 } = params

  const complexityMultiplier = {
    low: 1.0,
    medium: 1.5,
    high: 2.5,
  }[complexity]

  const materialCost = materialCosts[material.toLowerCase()] || 50
  const estimatedHours = 2 * complexityMultiplier
  const laborCost = estimatedHours * hourlyRate
  const machineTimeCost = estimatedHours * 50
  const overhead = (materialCost + laborCost + machineTimeCost) * 0.2

  return {
    estimatedPrice: (materialCost + laborCost + machineTimeCost + overhead) * quantity,
    estimatedHours: estimatedHours * quantity,
    confidence: 50,
    breakdown: {
      materialCost: materialCost * quantity,
      laborCost: laborCost * quantity,
      machineTimeCost: machineTimeCost * quantity,
      overhead: overhead * quantity,
    },
    reasoning: 'Wycena heurystyczna — brak połączenia z AI.',
  }
}

export interface OrderDetails {
  customerName: string
  partName: string
  material: string
  quantity: number
  status: string
  deadline: string
}

export async function generateOrderSummary(orderId: string, orderDetails: OrderDetails): Promise<string> {
  const fallback = `Zamówienie #${orderId} dla ${orderDetails.customerName}: ${orderDetails.partName} (${orderDetails.material}, szt: ${orderDetails.quantity}). Termin: ${orderDetails.deadline}.`

  const prompt = `Napisz profesjonalne podsumowanie zlecenia CNC (2-3 zdania po polsku):

**Zlecenie #${orderId}**
- Klient: ${orderDetails.customerName}
- Detal: ${orderDetails.partName}
- Materiał: ${orderDetails.material}
- Ilość: ${orderDetails.quantity}
- Status: ${orderDetails.status}
- Termin: ${orderDetails.deadline}`

  const result = await callGeminiText({
    label: 'order-summary',
    prompt,
    temperature: 0.5,
  })

  if (result) {
    return result.text
  }

  return fallback
}
