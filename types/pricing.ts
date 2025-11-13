// types/pricing.ts - Pricing Calculator Types

export interface PricingEstimateRequest {
  partName: string;
  material: string;
  length?: number;  // mm
  width?: number;   // mm
  height?: number;  // mm
  quantity: number;
  complexity: 'simple' | 'medium' | 'complex';
  notes?: string;
}

export interface PricingEstimateResponse {
  suggestedPrice: number;  // PLN (total for all units)
  pricePerUnit: number;    // PLN (per single unit)
  confidence: number;      // 0-100% (based on data completeness)
  reasoning: string;       // Polish explanation
  breakdown: {
    materialCost: number;
    machiningCost: number;
    setupCost: number;
    marginPercentage: number;
    totalCostBeforeMargin: number;
  };
}

export interface MaterialData {
  name: string;
  costPerKg: number;      // PLN/kg
  densityKgPerCm3: number; // kg/cm³
  machiningRate: number;   // PLN/hour
}

export interface ComplexityData {
  simple: {
    baseTimeHours: number;
    setupTimeHours: number;
  };
  medium: {
    baseTimeHours: number;
    setupTimeHours: number;
  };
  complex: {
    baseTimeHours: number;
    setupTimeHours: number;
  };
}
