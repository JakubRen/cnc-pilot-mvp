// Gemini Client for AI-powered features (migrated from OpenAI)
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
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

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    logger.warn('[estimatePrice] No GOOGLE_GENERATIVE_AI_API_KEY — using heuristic fallback')
    return heuristicEstimate(params, hourlyRate, materialCosts)
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

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
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
      },
    })

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text) as PriceEstimateResult

    return parsed
  } catch (error) {
    logger.error('[estimatePrice] Gemini API error, using fallback', { error })
    return heuristicEstimate(params, hourlyRate, materialCosts)
  }
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
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    return `Zamówienie #${orderId} dla ${orderDetails.customerName}: ${orderDetails.partName} (${orderDetails.material}, szt: ${orderDetails.quantity}). Termin: ${orderDetails.deadline}.`
  }

  const prompt = `Napisz profesjonalne podsumowanie zlecenia CNC (2-3 zdania po polsku):

**Zlecenie #${orderId}**
- Klient: ${orderDetails.customerName}
- Detal: ${orderDetails.partName}
- Materiał: ${orderDetails.material}
- Ilość: ${orderDetails.quantity}
- Status: ${orderDetails.status}
- Termin: ${orderDetails.deadline}`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.5 },
    })

    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (error) {
    logger.error('[generateOrderSummary] Gemini API error', { error })
    return `Zamówienie #${orderId} dla ${orderDetails.customerName}: ${orderDetails.partName} (${orderDetails.material}, szt: ${orderDetails.quantity}). Termin: ${orderDetails.deadline}.`
  }
}
