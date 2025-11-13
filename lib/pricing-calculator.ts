// lib/pricing-calculator.ts - Rule-based Pricing Calculator

import type {
  PricingEstimateRequest,
  PricingEstimateResponse,
  MaterialData,
  ComplexityData
} from '@/types/pricing'

// Material database (Polish market prices 2024)
const MATERIALS: Record<string, MaterialData> = {
  'aluminum_6061': {
    name: 'Aluminium 6061',
    costPerKg: 30,           // 25-35 PLN/kg
    densityKgPerCm3: 0.0027, // 2.7 g/cm³
    machiningRate: 120,       // 80-150 PLN/h
  },
  'aluminum': { // Generic aluminum
    name: 'Aluminium',
    costPerKg: 28,
    densityKgPerCm3: 0.0027,
    machiningRate: 115,
  },
  'steel_c45': {
    name: 'Stal C45',
    costPerKg: 12,           // 8-15 PLN/kg
    densityKgPerCm3: 0.00785, // 7.85 g/cm³
    machiningRate: 140,       // 100-180 PLN/h
  },
  'steel': { // Generic steel
    name: 'Stal',
    costPerKg: 10,
    densityKgPerCm3: 0.00785,
    machiningRate: 130,
  },
  'stainless_304': {
    name: 'Stal nierdzewna 304',
    costPerKg: 40,           // 30-50 PLN/kg
    densityKgPerCm3: 0.008,   // 8.0 g/cm³
    machiningRate: 160,       // 120-200 PLN/h
  },
  'stainless': { // Generic stainless
    name: 'Stal nierdzewna',
    costPerKg: 38,
    densityKgPerCm3: 0.008,
    machiningRate: 155,
  },
  'brass': {
    name: 'Mosiądz',
    costPerKg: 65,           // 50-80 PLN/kg
    densityKgPerCm3: 0.0085,  // 8.5 g/cm³
    machiningRate: 125,       // 90-160 PLN/h
  },
  'plastic_abs': {
    name: 'Plastik ABS',
    costPerKg: 22,           // 15-30 PLN/kg
    densityKgPerCm3: 0.00105, // 1.05 g/cm³
    machiningRate: 90,        // 60-120 PLN/h
  },
  'plastic_pom': {
    name: 'Plastik POM (Delrin)',
    costPerKg: 25,
    densityKgPerCm3: 0.00142, // 1.42 g/cm³
    machiningRate: 95,
  },
  'plastic': { // Generic plastic
    name: 'Plastik',
    costPerKg: 20,
    densityKgPerCm3: 0.00115,
    machiningRate: 85,
  },
  'bronze': {
    name: 'Brąz',
    costPerKg: 70,
    densityKgPerCm3: 0.0088,
    machiningRate: 130,
  },
  'copper': {
    name: 'Miedź',
    costPerKg: 55,
    densityKgPerCm3: 0.00896,
    machiningRate: 110,
  },
}

// Complexity factors (machining time estimates)
const COMPLEXITY: ComplexityData = {
  simple: {
    baseTimeHours: 1.5,    // 1-2h typical
    setupTimeHours: 0.5,
  },
  medium: {
    baseTimeHours: 4.5,    // 3-6h typical
    setupTimeHours: 1.0,
  },
  complex: {
    baseTimeHours: 14,     // 8-20h typical
    setupTimeHours: 2.0,
  },
}

// Volume discounts (margin adjustments)
function getMarginPercentage(quantity: number): number {
  if (quantity === 1) return 45 // Single parts: 30-50%
  if (quantity <= 10) return 35 // Small batches: 25-40%
  if (quantity <= 50) return 25 // Medium batches: 20-30%
  return 20 // Large batches: 15-25%
}

// Find material from user input (fuzzy matching)
function findMaterial(materialInput: string): MaterialData | null {
  const input = materialInput.toLowerCase().trim()

  // Exact match
  if (MATERIALS[input]) return MATERIALS[input]

  // Fuzzy matching
  if (input.includes('alumi') || input.includes('alu')) return MATERIALS.aluminum
  if (input.includes('stal') && (input.includes('nierdzew') || input.includes('stainless'))) return MATERIALS.stainless
  if (input.includes('stal') || input.includes('steel')) return MATERIALS.steel
  if (input.includes('mosiądz') || input.includes('brass')) return MATERIALS.brass
  if (input.includes('brąz') || input.includes('bronze')) return MATERIALS.bronze
  if (input.includes('miedź') || input.includes('copper')) return MATERIALS.copper
  if (input.includes('plastik') || input.includes('plastic') || input.includes('abs') || input.includes('pom')) {
    if (input.includes('abs')) return MATERIALS.plastic_abs
    if (input.includes('pom') || input.includes('delrin')) return MATERIALS.plastic_pom
    return MATERIALS.plastic
  }

  // Default to aluminum (most common CNC material)
  return MATERIALS.aluminum
}

// Calculate volume in cm³
function calculateVolume(length?: number, width?: number, height?: number): number | null {
  if (!length || !width || !height) return null
  // Convert mm to cm and calculate volume
  return (length / 10) * (width / 10) * (height / 10)
}

// Main pricing calculator
export function calculatePricing(request: PricingEstimateRequest): PricingEstimateResponse {
  const { material: materialInput, length, width, height, quantity, complexity, partName } = request

  // Find material data
  const material = findMaterial(materialInput)
  if (!material) {
    throw new Error('Nieznany materiał. Proszę wybrać z listy.')
  }

  // Get complexity data
  const complexityData = COMPLEXITY[complexity]

  // Calculate material cost
  let materialCost = 0
  let hasDimensions = false

  const volume = calculateVolume(length, width, height)
  if (volume) {
    hasDimensions = true
    const massKg = volume * material.densityKgPerCm3
    materialCost = massKg * material.costPerKg * quantity
  } else {
    // Estimate based on complexity if no dimensions
    const estimatedMassKg = complexity === 'simple' ? 0.5 : complexity === 'medium' ? 2 : 5
    materialCost = estimatedMassKg * material.costPerKg * quantity
  }

  // Calculate machining cost
  const machiningTimePerUnit = complexityData.baseTimeHours
  const totalMachiningTime = machiningTimePerUnit * quantity
  const machiningCost = totalMachiningTime * material.machiningRate

  // Calculate setup cost (one-time, doesn't scale with quantity)
  const setupCost = complexityData.setupTimeHours * material.machiningRate

  // Total cost before margin
  const totalCostBeforeMargin = materialCost + machiningCost + setupCost

  // Apply margin
  const marginPercentage = getMarginPercentage(quantity)
  const marginAmount = totalCostBeforeMargin * (marginPercentage / 100)
  const suggestedPrice = totalCostBeforeMargin + marginAmount

  // Price per unit
  const pricePerUnit = suggestedPrice / quantity

  // Confidence score (based on data completeness)
  let confidence = 70 // Base confidence
  if (hasDimensions) confidence += 20 // Has dimensions
  if (partName && partName.trim().length > 0) confidence += 10 // Has part name

  // Generate reasoning in Polish
  const reasoning = generateReasoning(
    material,
    complexity,
    quantity,
    hasDimensions,
    machiningTimePerUnit,
    marginPercentage
  )

  return {
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    pricePerUnit: Math.round(pricePerUnit * 100) / 100,
    confidence,
    reasoning,
    breakdown: {
      materialCost: Math.round(materialCost * 100) / 100,
      machiningCost: Math.round(machiningCost * 100) / 100,
      setupCost: Math.round(setupCost * 100) / 100,
      marginPercentage,
      totalCostBeforeMargin: Math.round(totalCostBeforeMargin * 100) / 100,
    },
  }
}

// Generate Polish explanation
function generateReasoning(
  material: MaterialData,
  complexity: 'simple' | 'medium' | 'complex',
  quantity: number,
  hasDimensions: boolean,
  machiningTimePerUnit: number,
  marginPercentage: number
): string {
  const complexityPL = {
    simple: 'prosty',
    medium: 'średniej złożoności',
    complex: 'złożony',
  }[complexity]

  const quantityDesc = quantity === 1
    ? 'pojedyncza sztuka'
    : quantity <= 10
    ? `mała seria (${quantity} szt.)`
    : quantity <= 50
    ? `średnia seria (${quantity} szt.)`
    : `duża seria (${quantity} szt.)`

  const dimensionNote = hasDimensions
    ? 'na podstawie podanych wymiarów'
    : 'szacunkowo (brak dokładnych wymiarów)'

  return `Wycena dla części ${complexityPL} wykonanej z materiału ${material.name}. ` +
    `Liczba sztuk: ${quantityDesc}. ` +
    `Szacowany czas obróbki: ~${machiningTimePerUnit.toFixed(1)}h/szt. ` +
    `Koszt materiału obliczony ${dimensionNote}. ` +
    `Marża: ${marginPercentage}%.`
}

// Export list of available materials for UI
export const MATERIAL_OPTIONS = [
  { value: 'aluminum', label: 'Aluminium (ogólnie)' },
  { value: 'aluminum_6061', label: 'Aluminium 6061' },
  { value: 'steel', label: 'Stal (ogólnie)' },
  { value: 'steel_c45', label: 'Stal C45' },
  { value: 'stainless', label: 'Stal nierdzewna (ogólnie)' },
  { value: 'stainless_304', label: 'Stal nierdzewna 304' },
  { value: 'brass', label: 'Mosiądz' },
  { value: 'bronze', label: 'Brąz' },
  { value: 'copper', label: 'Miedź' },
  { value: 'plastic', label: 'Plastik (ogólnie)' },
  { value: 'plastic_abs', label: 'Plastik ABS' },
  { value: 'plastic_pom', label: 'Plastik POM (Delrin)' },
]
