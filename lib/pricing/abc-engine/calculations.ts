// =====================================================
// ABC PRICING ENGINE - Pure Calculation Functions
// =====================================================
// All pure (non-async) cost calculation functions.
// No database access — these work entirely with in-memory data.
// =====================================================

import { TIME } from '@/lib/constants/time'
import type {
  MachineCosts,
  ExternalService,
  PricingConfig,
  ProductABCFields,
  MachineRateDetails,
  MaterialCostDetails,
  MachiningCostDetails,
  SetupCostDetails,
  LaborCostDetails,
  ExternalServicesCostDetails,
  MarginDetails,
  ABCDataCompleteness,
} from '@/types/abc-pricing'
import { VOLUME_DISCOUNT_THRESHOLDS } from '@/types/abc-pricing'

// =====================================================
// 1. MACHINE HOURLY RATE CALCULATION
// =====================================================

/**
 * Oblicza stawkę godzinową maszyny (Real Hourly Rate)
 * RHR = (Annual_Fixed_Cost / Effective_Hours) + Variable_Costs_Per_Hour
 */
export function calculateMachineHourlyRate(
  machineCosts: MachineCosts,
  electricityPriceKwh: number
): MachineRateDetails {
  // Effective Hours = Shift Hours × Working Days × OEE%
  const effectiveHoursPerYear =
    machineCosts.shift_hours_per_day *
    machineCosts.working_days_per_year *
    (machineCosts.oee_percentage / 100)

  // ===== FIXED COSTS (Annual) =====

  // Depreciation (Replacement Value / Economic Life)
  const annualDepreciation = machineCosts.replacement_value
    ? machineCosts.replacement_value / machineCosts.economic_life_years
    : 0

  // Floor Space Cost
  const annualFloorSpaceCost =
    (machineCosts.floor_space_m2 || 0) * (machineCosts.cost_per_m2_yearly || 0)

  // Software & Financing
  const annualSoftwareCost = machineCosts.software_subscriptions_yearly
  const annualFinancingCost = machineCosts.financing_costs_yearly

  // Total Annual Fixed
  const totalAnnualFixed =
    annualDepreciation +
    annualFloorSpaceCost +
    annualSoftwareCost +
    annualFinancingCost

  // Fixed Per Hour
  const depreciationPerHour = annualDepreciation / effectiveHoursPerYear
  const floorSpaceCostPerHour = annualFloorSpaceCost / effectiveHoursPerYear
  const softwareCostPerHour = annualSoftwareCost / effectiveHoursPerYear
  const financingCostPerHour = annualFinancingCost / effectiveHoursPerYear
  const totalFixedPerHour = totalAnnualFixed / effectiveHoursPerYear

  // ===== VARIABLE COSTS (Per Hour) =====

  // Energy Cost = Power (kW) × Load Factor × Electricity Price
  const energyCostPerHour =
    (machineCosts.power_kw || 0) *
    machineCosts.average_load_factor *
    electricityPriceKwh

  // Consumables & Maintenance
  const consumablesPerHour = machineCosts.consumables_rate_hour
  const maintenancePerHour = machineCosts.maintenance_reserve_hour

  const totalVariablePerHour =
    energyCostPerHour + consumablesPerHour + maintenancePerHour

  // ===== TOTAL RATES =====

  // Base Rate (Fixed only)
  const baseRate = totalFixedPerHour

  // Run Rate (Fixed + Variable)
  const runRate = totalFixedPerHour + totalVariablePerHour

  // Total Rate with Operator
  const operatorCostPerMachine =
    machineCosts.operator_hourly_rate / machineCosts.machines_per_operator
  const totalRateWithOperator = runRate + operatorCostPerMachine

  return {
    depreciationPerHour,
    floorSpaceCostPerHour,
    softwareCostPerHour,
    financingCostPerHour,
    totalFixedPerHour,
    energyCostPerHour,
    consumablesPerHour,
    maintenancePerHour,
    totalVariablePerHour,
    baseRate,
    runRate,
    totalRateWithOperator,
    effectiveHoursPerYear,
    oeeUsed: machineCosts.oee_percentage,
  }
}

// =====================================================
// 2. MATERIAL COST CALCULATION
// =====================================================

/**
 * Oblicza koszt materiału z ryzykiem złomu i narzutem
 * Material_Cost = (Raw_Cost × Scrap_Risk + Bar_End_Loss) × (1 + Markup%)
 */
export function calculateMaterialCost(
  rawCostPerUnit: number,
  scrapRiskFactor: number,
  barEndWasteKg: number,
  materialWeightKg: number | null,
  materialMarkupPercent: number,
  quantity: number,
  materialCostPerKg: number = 0
): MaterialCostDetails {
  // Scrap risk adjustment
  const scrapRiskAdjustment = rawCostPerUnit * (scrapRiskFactor - 1)
  const adjustedRawCost = rawCostPerUnit * scrapRiskFactor

  // Bar end loss (amortized across batch)
  // Bar End Loss per Unit = (Bar End Waste kg × Material Cost/kg) / Batch Size
  const barEndLossTotal = barEndWasteKg * materialCostPerKg
  const barEndLossPerUnit = quantity > 0 ? barEndLossTotal / quantity : 0

  // Material markup
  const costBeforeMarkup = adjustedRawCost + barEndLossPerUnit
  const materialMarkup = costBeforeMarkup * (materialMarkupPercent / 100)

  // Total material cost per unit
  const totalMaterialCostPerUnit = costBeforeMarkup + materialMarkup

  return {
    rawCost: rawCostPerUnit,
    scrapRiskAdjustment,
    barEndLossPerUnit,
    materialMarkup,
    totalMaterialCost: totalMaterialCostPerUnit * quantity,
  }
}

// =====================================================
// 3. MACHINING COST CALCULATION
// =====================================================

/**
 * Oblicza koszt obróbki
 * Machining_Cost = (Cycle_Time × Efficiency_Factor) × Machine_Run_Rate
 */
export function calculateMachiningCost(
  cycleTimeMinutes: number,
  efficiencyFactor: number,
  machineRunRate: number,
  quantity: number
): MachiningCostDetails {
  // Adjust cycle time for efficiency (CAM is too optimistic)
  const adjustedCycleTime = cycleTimeMinutes * efficiencyFactor
  const adjustedCycleTimeHours = adjustedCycleTime / TIME.MINUTES_PER_HOUR

  // Cost per unit
  const machiningCostPerUnit = adjustedCycleTimeHours * machineRunRate

  return {
    cycleTimeMinutes,
    efficiencyFactor,
    adjustedCycleTime,
    machineRunRate,
    machiningCostPerUnit,
    totalMachiningCost: machiningCostPerUnit * quantity,
  }
}

// =====================================================
// 4. SETUP COST CALCULATION
// =====================================================

/**
 * Oblicza koszt przezbrojenia (amortyzowany na partię)
 * Setup_Cost = Setup_Time × (Machine_Rate + Setup_Specialist_Rate)
 * Setup_Cost_Per_Unit = Setup_Cost / Batch_Size
 */
export function calculateSetupCost(
  setupTimeMinutes: number,
  machineRunRate: number,
  setupSpecialistRate: number,
  batchSize: number
): SetupCostDetails {
  const setupTimeHours = setupTimeMinutes / TIME.MINUTES_PER_HOUR

  // Total setup cost (machine tied up + specialist)
  const totalSetupCost = setupTimeHours * (machineRunRate + setupSpecialistRate)

  // Amortized per unit
  const setupCostPerUnit = batchSize > 0 ? totalSetupCost / batchSize : 0

  return {
    setupTimeMinutes,
    machineRate: machineRunRate,
    setupSpecialistRate,
    totalSetupCost,
    setupCostPerUnit,
  }
}

// =====================================================
// 5. LABOR COST CALCULATION
// =====================================================

/**
 * Oblicza koszt operatora
 * Labor_Cost = (Cycle_Time × Operator_Rate) / Machines_Per_Operator
 */
export function calculateLaborCost(
  cycleTimeMinutes: number,
  efficiencyFactor: number,
  operatorHourlyRate: number,
  machinesPerOperator: number,
  quantity: number
): LaborCostDetails {
  const adjustedCycleTimeHours = (cycleTimeMinutes * efficiencyFactor) / TIME.MINUTES_PER_HOUR

  // Effective rate per machine (shared operator)
  const effectiveRatePerMachine = operatorHourlyRate / machinesPerOperator

  // Labor cost per unit
  const laborCostPerUnit = adjustedCycleTimeHours * effectiveRatePerMachine

  return {
    operatorHourlyRate,
    machinesPerOperator,
    effectiveRatePerMachine,
    totalLaborCost: laborCostPerUnit * quantity,
    laborCostPerUnit,
  }
}

// =====================================================
// 6. EXTERNAL SERVICES CALCULATION
// =====================================================

/**
 * Oblicza koszty usług kooperacyjnych
 * Service_Cost = Base_Price × Quantity × (1 + Handling_Fee%)
 */
export function calculateExternalServicesCost(
  services: ExternalService[],
  quantity: number
): ExternalServicesCostDetails {
  const serviceDetails = services.map((service) => {
    const handlingFee = service.base_price * quantity * (service.handling_fee_percent / 100)
    const totalPrice = service.base_price * quantity + handlingFee

    return {
      serviceId: service.id,
      serviceName: service.name,
      basePrice: service.base_price,
      quantity,
      handlingFeePercent: service.handling_fee_percent,
      handlingFee,
      totalPrice,
    }
  })

  const totalExternalCost = serviceDetails.reduce((sum, s) => sum + s.totalPrice, 0)

  return {
    services: serviceDetails,
    totalExternalCost,
    totalExternalCostPerUnit: quantity > 0 ? totalExternalCost / quantity : 0,
  }
}

// =====================================================
// 7. MARGIN CALCULATION WITH VOLUME DISCOUNT
// =====================================================

/**
 * Oblicza marżę z uwzględnieniem volume discount
 */
export function calculateMargin(
  totalCostBeforeMargin: number,
  quantity: number,
  pricingConfig: PricingConfig,
  customMarginPercent?: number
): MarginDetails {
  // Base margin from config or custom
  const baseMarginPercent = customMarginPercent ?? pricingConfig.default_margin_percent

  // Volume-adjusted margin
  let volumeAdjustedMargin: number
  if (quantity >= VOLUME_DISCOUNT_THRESHOLDS.qty_100) {
    volumeAdjustedMargin = pricingConfig.margin_qty_100_plus
  } else if (quantity >= VOLUME_DISCOUNT_THRESHOLDS.qty_50) {
    volumeAdjustedMargin = pricingConfig.margin_qty_50
  } else if (quantity >= VOLUME_DISCOUNT_THRESHOLDS.qty_10) {
    volumeAdjustedMargin = pricingConfig.margin_qty_10
  } else {
    volumeAdjustedMargin = pricingConfig.margin_qty_1
  }

  // Use the lower of base and volume-adjusted (if custom wasn't specified)
  const finalMarginPercent = customMarginPercent
    ? baseMarginPercent
    : Math.min(baseMarginPercent, volumeAdjustedMargin)

  // Margin amount
  const marginAmount = totalCostBeforeMargin * (finalMarginPercent / 100)

  return {
    baseMarginPercent,
    volumeAdjustedMargin,
    finalMarginPercent,
    marginAmount,
    marginPerUnit: quantity > 0 ? marginAmount / quantity : 0,
  }
}

// =====================================================
// 8. DATA COMPLETENESS CHECK
// =====================================================

/**
 * Sprawdza kompletność danych do wyceny ABC
 */
export function checkDataCompleteness(
  machineCosts: MachineCosts | null,
  productFields: ProductABCFields | null,
  pricingConfig: PricingConfig | null
): ABCDataCompleteness {
  const missingFields: string[] = []

  const hasMachineCosts = !!machineCosts
  if (!hasMachineCosts) missingFields.push('Konfiguracja kosztów maszyny')

  const hasCycleTime = !!(productFields?.cycle_time_minutes)
  if (!hasCycleTime) missingFields.push('Czas cyklu produktu')

  const hasSetupTime = !!(productFields?.setup_time_minutes)
  if (!hasSetupTime) missingFields.push('Czas przezbrojenia')

  const hasMaterialData = true // Assuming material cost is passed directly

  const hasPricingConfig = !!pricingConfig
  if (!hasPricingConfig) missingFields.push('Konfiguracja wyceny')

  // Calculate overall score
  const checks = [hasMachineCosts, hasCycleTime, hasSetupTime, hasMaterialData, hasPricingConfig]
  const overallScore = Math.round((checks.filter(Boolean).length / checks.length) * 100)

  return {
    hasMachineCosts,
    hasCycleTime,
    hasSetupTime,
    hasMaterialData,
    hasPricingConfig,
    overallScore,
    missingFields,
  }
}
