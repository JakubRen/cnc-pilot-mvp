// =====================================================
// ABC PRICING ENGINE - Async Orchestration Functions
// =====================================================
// Functions that interact with the database (Supabase).
// These orchestrate the pure calculation functions from
// calculations.ts with real data fetched from the DB.
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
  ABCCostBreakdown,
} from '@/types/abc-pricing'
import { ABC_DEFAULTS } from '@/types/abc-pricing'

import {
  calculateMachineHourlyRate,
  calculateMaterialCost,
  calculateMachiningCost,
  calculateSetupCost,
  calculateLaborCost,
  calculateExternalServicesCost,
  calculateMargin,
  checkDataCompleteness,
} from './calculations'

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
