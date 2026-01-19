// =====================================================
// ABC PRICING ENGINE - Activity-Based Costing
// =====================================================
// Pełny model ABC zgodny ze specyfikacją biznesową
// Oblicza rzeczywiste koszty na podstawie:
// - Real Hourly Rate (RHR) maszyny
// - Czas cyklu z karty produktu
// - Koszty materiału z ryzykiem złomu
// - Koszty operatora i setupu
// - Usługi kooperacyjne
// =====================================================

import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import type {
  MachineCosts,
  ExternalService,
  PricingConfig,
  ProductABCFields,
  ABCPricingInput,
  ABCPricingResult,
  MachineRateDetails,
  MaterialCostDetails,
  MachiningCostDetails,
  SetupCostDetails,
  LaborCostDetails,
  ExternalServicesCostDetails,
  MarginDetails,
  ABCCostBreakdown,
  ABCDataCompleteness,
} from '@/types/abc-pricing'
import { ABC_DEFAULTS, VOLUME_DISCOUNT_THRESHOLDS } from '@/types/abc-pricing'

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
  const adjustedCycleTimeHours = adjustedCycleTime / 60

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
  const setupTimeHours = setupTimeMinutes / 60

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
  const adjustedCycleTimeHours = (cycleTimeMinutes * efficiencyFactor) / 60

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

// =====================================================
// 9. MAIN ABC PRICING FUNCTION
// =====================================================

/**
 * Główna funkcja wyceny ABC
 * Agreguje wszystkie komponenty kosztów i oblicza cenę końcową
 */
export async function calculateABCPricing(
  input: ABCPricingInput,
  companyId: string
): Promise<ABCPricingResult> {
  const supabase = await createClient()
  const warnings: string[] = []

  try {
    // ===== FETCH DATA =====

    // 1. Get machine costs
    const { data: machineCosts, error: machineError } = await supabase
      .from('machine_costs')
      .select('*')
      .eq('machine_id', input.machineId)
      .eq('company_id', companyId)
      .single()

    if (machineError || !machineCosts) {
      warnings.push('Brak konfiguracji kosztów maszyny - użyto wartości domyślne')
    }

    // 2. Get product ABC fields
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('cycle_time_minutes, setup_time_minutes, efficiency_factor, scrap_risk_factor, material_markup_percent, material_weight_kg')
      .eq('id', input.productId)
      .single()

    if (productError || !product) {
      warnings.push('Brak danych produktu - użyto wartości domyślne')
    }

    // 3. Get pricing config
    const { data: pricingConfig, error: configError } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('company_id', companyId)
      .single()

    if (configError || !pricingConfig) {
      warnings.push('Brak konfiguracji wyceny - użyto wartości domyślne')
    }

    // 4. Get external services if specified
    let externalServices: ExternalService[] = []
    if (input.externalServiceIds && input.externalServiceIds.length > 0) {
      const { data: services } = await supabase
        .from('external_services')
        .select('*')
        .in('id', input.externalServiceIds)
        .eq('company_id', companyId)
        .eq('is_active', true)

      externalServices = services || []
    }

    // ===== BUILD DEFAULT VALUES =====

    const defaults = {
      ...ABC_DEFAULTS,
    }

    const effectiveMachineCosts: MachineCosts = machineCosts || {
      id: '',
      machine_id: input.machineId,
      company_id: companyId,
      replacement_value: 200000, // Default 200k PLN
      economic_life_years: defaults.economic_life_years,
      floor_space_m2: 10,
      cost_per_m2_yearly: 200,
      software_subscriptions_yearly: 5000,
      financing_costs_yearly: 0,
      shift_hours_per_day: defaults.shift_hours_per_day,
      working_days_per_year: defaults.working_days_per_year,
      oee_percentage: defaults.oee_percentage,
      power_kw: 15,
      average_load_factor: defaults.average_load_factor,
      consumables_rate_hour: defaults.consumables_rate_hour,
      maintenance_reserve_hour: defaults.maintenance_reserve_hour,
      operator_hourly_rate: defaults.operator_hourly_rate,
      machines_per_operator: defaults.machines_per_operator,
      setup_specialist_rate: defaults.setup_specialist_rate,
      created_at: '',
      updated_at: '',
    }

    const effectiveProduct: ProductABCFields = {
      cycle_time_minutes: product?.cycle_time_minutes || 30, // Default 30 min
      setup_time_minutes: product?.setup_time_minutes || 60, // Default 60 min
      efficiency_factor: product?.efficiency_factor || defaults.efficiency_factor,
      default_machine_id: null,
      scrap_risk_factor: product?.scrap_risk_factor || defaults.scrap_risk_factor,
      material_markup_percent: product?.material_markup_percent || defaults.material_markup_percent,
      material_weight_kg: product?.material_weight_kg || input.materialWeightKg || null,
    }

    const effectiveConfig: PricingConfig = pricingConfig || {
      id: '',
      company_id: companyId,
      electricity_price_kwh: defaults.electricity_price_kwh,
      default_margin_percent: defaults.default_margin_percent,
      min_margin_percent: defaults.min_margin_percent,
      margin_qty_1: 45,
      margin_qty_10: 35,
      margin_qty_50: 25,
      margin_qty_100_plus: 20,
      bar_end_waste_kg: defaults.bar_end_waste_kg,
      include_tool_costs: false,
      default_tool_cost_percent: 5,
      updated_at: '',
    }

    // ===== CALCULATE COMPONENTS =====

    // 1. Machine hourly rate
    const machineRateDetails = calculateMachineHourlyRate(
      effectiveMachineCosts,
      effectiveConfig.electricity_price_kwh
    )

    // 2. Material cost
    const materialDetails = calculateMaterialCost(
      input.materialCostPerUnit,
      effectiveProduct.scrap_risk_factor,
      effectiveConfig.bar_end_waste_kg,
      effectiveProduct.material_weight_kg,
      effectiveProduct.material_markup_percent,
      input.quantity,
      input.materialCostPerUnit / (effectiveProduct.material_weight_kg || 1) // Estimate cost/kg
    )

    // 3. Machining cost
    const machiningDetails = calculateMachiningCost(
      effectiveProduct.cycle_time_minutes || 30,
      effectiveProduct.efficiency_factor,
      machineRateDetails.runRate,
      input.quantity
    )

    // 4. Setup cost
    const setupDetails = calculateSetupCost(
      effectiveProduct.setup_time_minutes || 60,
      machineRateDetails.runRate,
      effectiveMachineCosts.setup_specialist_rate,
      input.quantity
    )

    // 5. Labor cost
    const laborDetails = calculateLaborCost(
      effectiveProduct.cycle_time_minutes || 30,
      effectiveProduct.efficiency_factor,
      effectiveMachineCosts.operator_hourly_rate,
      effectiveMachineCosts.machines_per_operator,
      input.quantity
    )

    // 6. External services cost
    const externalServicesDetails = calculateExternalServicesCost(
      externalServices,
      input.quantity
    )

    // 7. Tool cost (optional)
    const machiningCostForTools = machiningDetails.totalMachiningCost
    const toolCost = effectiveConfig.include_tool_costs
      ? machiningCostForTools * (effectiveConfig.default_tool_cost_percent / 100)
      : 0

    // ===== AGGREGATE COSTS =====

    const totalCostBeforeMargin =
      materialDetails.totalMaterialCost +
      machiningDetails.totalMachiningCost +
      setupDetails.totalSetupCost +
      laborDetails.totalLaborCost +
      externalServicesDetails.totalExternalCost +
      toolCost

    const totalCostPerUnitBeforeMargin =
      input.quantity > 0 ? totalCostBeforeMargin / input.quantity : 0

    // ===== CALCULATE MARGIN =====

    const marginDetails = calculateMargin(
      totalCostBeforeMargin,
      input.quantity,
      effectiveConfig,
      input.customMarginPercent
    )

    // ===== VALIDATE MARGIN =====

    if (marginDetails.finalMarginPercent < effectiveConfig.min_margin_percent) {
      warnings.push(
        `Marża (${marginDetails.finalMarginPercent}%) poniżej minimum (${effectiveConfig.min_margin_percent}%)`
      )
    }

    // ===== BUILD RESULT =====

    const totalPrice = totalCostBeforeMargin + marginDetails.marginAmount
    const unitPrice = input.quantity > 0 ? totalPrice / input.quantity : 0

    const breakdown: ABCCostBreakdown = {
      material: materialDetails,
      machining: machiningDetails,
      setup: setupDetails,
      labor: laborDetails,
      externalServices: externalServicesDetails,
      toolCost,
      totalCostBeforeMargin,
      totalCostPerUnitBeforeMargin,
    }

    // Calculate confidence based on data completeness
    const completeness = checkDataCompleteness(
      machineCosts,
      product as ProductABCFields | null,
      pricingConfig
    )

    const result: ABCPricingResult = {
      unitPrice: Math.round(unitPrice * 100) / 100,
      totalPrice: Math.round(totalPrice * 100) / 100,
      breakdown,
      machineRateDetails,
      margin: marginDetails,
      confidence: completeness.overallScore,
      warnings,
      calculatedAt: new Date().toISOString(),
      input: {
        productId: input.productId,
        machineId: input.machineId,
        quantity: input.quantity,
      },
    }

    logger.info('ABC pricing calculated', {
      productId: input.productId,
      machineId: input.machineId,
      quantity: input.quantity,
      unitPrice: result.unitPrice,
      totalPrice: result.totalPrice,
      confidence: result.confidence,
    })

    return result

  } catch (error) {
    logger.error('Error in ABC pricing engine', { error, input })
    throw error
  }
}

// =====================================================
// 10. HELPER: GET DEFAULT PRICING CONFIG
// =====================================================

/**
 * Pobiera lub tworzy domyślną konfigurację wyceny dla firmy
 */
export async function getOrCreatePricingConfig(
  companyId: string
): Promise<PricingConfig> {
  const supabase = await createClient()

  // Try to get existing config
  const { data: existing } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (existing) {
    return existing
  }

  // Create default config
  const defaults = ABC_DEFAULTS
  const { data: created, error } = await supabase
    .from('pricing_config')
    .insert({
      company_id: companyId,
      electricity_price_kwh: defaults.electricity_price_kwh,
      default_margin_percent: defaults.default_margin_percent,
      min_margin_percent: defaults.min_margin_percent,
      margin_qty_1: 45,
      margin_qty_10: 35,
      margin_qty_50: 25,
      margin_qty_100_plus: 20,
      bar_end_waste_kg: defaults.bar_end_waste_kg,
      include_tool_costs: false,
      default_tool_cost_percent: 5,
    })
    .select()
    .single()

  if (error) {
    logger.error('Error creating pricing config', { error, companyId })
    throw error
  }

  return created
}

// =====================================================
// 11. HELPER: SEED EXTERNAL SERVICES
// =====================================================

/**
 * Seeduje domyślne usługi kooperacyjne dla firmy
 */
export async function seedExternalServices(companyId: string): Promise<void> {
  const supabase = await createClient()

  // Check if any services exist
  const { data: existing } = await supabase
    .from('external_services')
    .select('id')
    .eq('company_id', companyId)
    .limit(1)

  if (existing && existing.length > 0) {
    return // Already seeded
  }

  const defaultServices = [
    { name: 'Anodowanie naturalne', description: 'Anodowanie aluminium - warstwa naturalna', base_price: 5, price_unit: 'szt', handling_fee_percent: 20, lead_time_days: 5 },
    { name: 'Anodowanie czarne', description: 'Anodowanie aluminium - kolor czarny', base_price: 7, price_unit: 'szt', handling_fee_percent: 20, lead_time_days: 5 },
    { name: 'Hartowanie', description: 'Hartowanie stali do 60 HRC', base_price: 8, price_unit: 'szt', handling_fee_percent: 25, lead_time_days: 7 },
    { name: 'Cynkowanie galwaniczne', description: 'Cynkowanie galwaniczne z pasywacją', base_price: 4, price_unit: 'szt', handling_fee_percent: 20, lead_time_days: 5 },
    { name: 'Malowanie proszkowe', description: 'Malowanie proszkowe RAL', base_price: 12, price_unit: 'szt', handling_fee_percent: 15, lead_time_days: 7 },
    { name: 'Chromowanie twarde', description: 'Chromowanie twarde przemysłowe', base_price: 25, price_unit: 'szt', handling_fee_percent: 25, lead_time_days: 10 },
    { name: 'Piaskowanie', description: 'Piaskowanie powierzchni', base_price: 3, price_unit: 'szt', handling_fee_percent: 15, lead_time_days: 3 },
  ]

  const servicesWithCompanyId = defaultServices.map((s) => ({
    ...s,
    company_id: companyId,
    is_active: true,
  }))

  const { error } = await supabase
    .from('external_services')
    .insert(servicesWithCompanyId)

  if (error) {
    logger.error('Error seeding external services', { error, companyId })
  }
}
