// OpenAI Client for AI-powered features
import OpenAI from 'openai'
import { logger } from '@/lib/logger'

// Initialize OpenAI client (will use OPENAI_API_KEY from env)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

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

  // Build prompt for GPT-4
  const prompt = `
You are an expert CNC machining cost estimator. Based on the following project details, provide a detailed cost estimate.

**Project Details:**
- Material: ${material}
- Dimensions: ${dimensions || 'Not specified'}
- Complexity: ${complexity}
- Quantity: ${quantity}
- Additional notes: ${additionalNotes || 'None'}

**Company Context:**
- Hourly labor rate: ${hourlyRate} PLN
- Typical material costs: ${JSON.stringify(materialCosts, null, 2)}

**Please provide:**
1. Estimated total price (in PLN)
2. Estimated machine/labor hours
3. Confidence score (0-100%)
4. Breakdown of costs (material, labor, machine time, overhead)
5. Brief reasoning for your estimate

Respond ONLY with valid JSON in this exact format:
{
  "estimatedPrice": <number>,
  "estimatedHours": <number>,
  "confidence": <number 0-100>,
  "breakdown": {
    "materialCost": <number>,
    "laborCost": <number>,
    "machineTimeCost": <number>,
    "overhead": <number>
  },
  "reasoning": "<string>"
}
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert CNC machining cost estimator. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent estimates
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content || '{}'
    const result = JSON.parse(content) as PriceEstimateResult

    return result
  } catch (error) {
    logger.error('OpenAI API error', { error })

    // Fallback to simple heuristic estimation
    const complexityMultiplier = {
      low: 1.0,
      medium: 1.5,
      high: 2.5,
    }[complexity]

    const materialCost = materialCosts[material.toLowerCase()] || 50
    const estimatedHours = 2 * complexityMultiplier
    const laborCost = estimatedHours * hourlyRate
    const machineTimeCost = estimatedHours * 50 // Machine time rate
    const overhead = (materialCost + laborCost + machineTimeCost) * 0.2 // 20% overhead

    return {
      estimatedPrice: (materialCost + laborCost + machineTimeCost + overhead) * quantity,
      estimatedHours: estimatedHours * quantity,
      confidence: 50, // Low confidence for fallback
      breakdown: {
        materialCost: materialCost * quantity,
        laborCost: laborCost * quantity,
        machineTimeCost: machineTimeCost * quantity,
        overhead: overhead * quantity,
      },
      reasoning: 'Fallback heuristic estimate used due to API error or unavailability.',
    }
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
  const prompt = `
Generate a professional order summary for this CNC manufacturing order:

**Order #${orderId}**
- Customer: ${orderDetails.customerName}
- Part: ${orderDetails.partName}
- Material: ${orderDetails.material}
- Quantity: ${orderDetails.quantity}
- Status: ${orderDetails.status}
- Deadline: ${orderDetails.deadline}

Write a concise 2-3 sentence summary suitable for email or export.
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a professional technical writer for manufacturing.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 150,
    })

    return response.choices[0]?.message?.content || 'Order summary unavailable.'
  } catch (error) {
    logger.error('OpenAI API error', { error })
    return `Order #${orderId} for ${orderDetails.customerName}: ${orderDetails.partName} (${orderDetails.material}, qty: ${orderDetails.quantity}). Due by ${orderDetails.deadline}.`
  }
}
