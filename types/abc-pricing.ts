// types/abc-pricing.ts - Activity-Based Costing Types
// Zgodne ze specyfikacją Business Logic Specification

// =====================================================
// DATABASE ENTITIES
// =====================================================

/**
 * Koszty operacyjne maszyny (machine_costs table)
 * Dane potrzebne do obliczenia Real Hourly Rate (RHR)
 */
export interface MachineCosts {
  id: string;
  machine_id: string;
  company_id: string;

  // Wartości do obliczenia kosztów stałych (Annual Fixed Cost)
  replacement_value: number | null;        // Wartość odtworzeniowa (nie cena zakupu!)
  economic_life_years: number;             // Żywotność ekonomiczna (lata)
  floor_space_m2: number | null;           // Zajmowana powierzchnia (m²)
  cost_per_m2_yearly: number | null;       // Koszt hali za m²/rok
  software_subscriptions_yearly: number;   // CAD/CAM, monitoring
  financing_costs_yearly: number;          // Leasing/kredyt

  // OEE i dostępny czas pracy
  shift_hours_per_day: number;
  working_days_per_year: number;
  oee_percentage: number;                  // Overall Equipment Effectiveness (0-100)

  // Koszty zmienne (Variable Costs per hour)
  power_kw: number | null;                 // Moc maszyny (kW)
  average_load_factor: number;             // Współczynnik obciążenia (0.0-1.0)
  consumables_rate_hour: number;           // Chłodziwo, oleje (PLN/h)
  maintenance_reserve_hour: number;        // Rezerwa serwisowa (PLN/h)

  // Stawki operatora
  operator_hourly_rate: number;
  machines_per_operator: number;           // Ile maszyn obsługuje 1 operator
  setup_specialist_rate: number;           // Stawka setupowca (PLN/h)

  // Metadane
  created_at: string;
  updated_at: string;
}

/**
 * Usługi zewnętrzne / kooperacja (external_services table)
 */
export interface ExternalService {
  id: string;
  company_id: string;

  name: string;                            // np. "Anodowanie czarne"
  description: string | null;
  vendor_name: string | null;
  vendor_contact: string | null;

  // Cennik
  base_price: number;
  price_unit: 'szt' | 'kg' | 'm2' | 'mb';
  min_order_value: number | null;

  // Handling fee
  handling_fee_percent: number;

  // Lead time
  lead_time_days: number;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Globalna konfiguracja wyceny (pricing_config table)
 */
export interface PricingConfig {
  id: string;
  company_id: string;

  // Cena energii
  electricity_price_kwh: number;           // PLN/kWh

  // Marże
  default_margin_percent: number;
  min_margin_percent: number;

  // Volume discounts (marża zależna od ilości)
  margin_qty_1: number;                    // 1 szt
  margin_qty_10: number;                   // 2-10 szt
  margin_qty_50: number;                   // 11-50 szt
  margin_qty_100_plus: number;             // 50+ szt

  // Bar end loss
  bar_end_waste_kg: number;

  // Tool cost
  include_tool_costs: boolean;
  default_tool_cost_percent: number;

  updated_at: string;
}

/**
 * Powiązanie oferta-usługi (quote_services table)
 */
export interface QuoteService {
  id: string;
  quote_id: string;
  external_service_id: string;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  created_at: string;
}

/**
 * Rozszerzenie produktu o pola ABC (dodane do products table)
 */
export interface ProductABCFields {
  cycle_time_minutes: number | null;       // Czas cyklu z CAM/doświadczenia
  setup_time_minutes: number | null;       // Czas przezbrojenia
  efficiency_factor: number;               // Współczynnik wydajności (np. 1.15)
  default_machine_id: string | null;       // Domyślna maszyna
  scrap_risk_factor: number;               // Współczynnik ryzyka złomu
  material_markup_percent: number;         // Narzut na materiał
  material_weight_kg: number | null;       // Waga materiału na sztukę
}

// =====================================================
// ABC ENGINE INTERFACES
// =====================================================

/**
 * Input do silnika ABC
 */
export interface ABCPricingInput {
  // Wymagane
  productId: string;                       // Z karty produktu pobieramy cycle_time, setup_time
  machineId: string;                       // Maszyna do wyceny
  quantity: number;
  materialCostPerUnit: number;             // Koszt materiału na sztukę (PLN)

  // Opcjonalne
  materialWeightKg?: number;               // Waga materiału (dla bar end loss)
  externalServiceIds?: string[];           // Usługi kooperacyjne
  customMarginPercent?: number;            // Nadpisanie marży
}

/**
 * Szczegóły stawki godzinowej maszyny
 */
export interface MachineRateDetails {
  // Koszty stałe (Fixed Costs)
  depreciationPerHour: number;             // Amortyzacja
  floorSpaceCostPerHour: number;           // Koszt powierzchni
  softwareCostPerHour: number;             // Software
  financingCostPerHour: number;            // Finansowanie
  totalFixedPerHour: number;

  // Koszty zmienne (Variable Costs)
  energyCostPerHour: number;               // Energia
  consumablesPerHour: number;              // Zużywalne
  maintenancePerHour: number;              // Serwis
  totalVariablePerHour: number;

  // Stawka całkowita
  baseRate: number;                        // Fixed / Effective Hours
  runRate: number;                         // Base + Variable
  totalRateWithOperator: number;           // Run + Operator

  // Metadane
  effectiveHoursPerYear: number;
  oeeUsed: number;
}

/**
 * Szczegóły kosztów materiału
 */
export interface MaterialCostDetails {
  rawCost: number;                         // Surowy koszt materiału
  scrapRiskAdjustment: number;             // Narzut za ryzyko złomu
  barEndLossPerUnit: number;               // Amortyzowana końcówka pręta
  materialMarkup: number;                  // Narzut %
  totalMaterialCost: number;               // Suma
}

/**
 * Szczegóły kosztów obróbki
 */
export interface MachiningCostDetails {
  cycleTimeMinutes: number;
  efficiencyFactor: number;
  adjustedCycleTime: number;               // cycle_time * efficiency_factor
  machineRunRate: number;
  machiningCostPerUnit: number;
  totalMachiningCost: number;              // Per quantity
}

/**
 * Szczegóły kosztów setup
 */
export interface SetupCostDetails {
  setupTimeMinutes: number;
  machineRate: number;
  setupSpecialistRate: number;
  totalSetupCost: number;
  setupCostPerUnit: number;                // Amortyzowany na partię
}

/**
 * Szczegóły kosztów operatora
 */
export interface LaborCostDetails {
  operatorHourlyRate: number;
  machinesPerOperator: number;
  effectiveRatePerMachine: number;
  totalLaborCost: number;
  laborCostPerUnit: number;
}

/**
 * Szczegóły kosztów kooperacji
 */
export interface ExternalServicesCostDetails {
  services: Array<{
    serviceId: string;
    serviceName: string;
    basePrice: number;
    quantity: number;
    handlingFeePercent: number;
    handlingFee: number;
    totalPrice: number;
  }>;
  totalExternalCost: number;
  totalExternalCostPerUnit: number;
}

/**
 * Szczegóły marży
 */
export interface MarginDetails {
  baseMarginPercent: number;
  volumeAdjustedMargin: number;            // Po uwzględnieniu volume discount
  finalMarginPercent: number;
  marginAmount: number;
  marginPerUnit: number;
}

/**
 * Pełny breakdown kosztów ABC
 */
export interface ABCCostBreakdown {
  material: MaterialCostDetails;
  machining: MachiningCostDetails;
  setup: SetupCostDetails;
  labor: LaborCostDetails;
  externalServices: ExternalServicesCostDetails;
  toolCost: number;                        // Opcjonalny koszt narzędzi

  // Sumy
  totalCostBeforeMargin: number;
  totalCostPerUnitBeforeMargin: number;
}

/**
 * Wynik wyceny ABC
 */
export interface ABCPricingResult {
  // Ceny
  unitPrice: number;                       // Cena jednostkowa
  totalPrice: number;                      // Cena całkowita

  // Szczegółowy breakdown
  breakdown: ABCCostBreakdown;
  machineRateDetails: MachineRateDetails;
  margin: MarginDetails;

  // Metadane
  confidence: number;                      // 0-100 (zależne od kompletności danych)
  warnings: string[];                      // np. "Brak OEE - użyto domyślne 65%"
  calculatedAt: string;

  // Użyte dane wejściowe
  input: {
    productId: string;
    machineId: string;
    quantity: number;
  };
}

// =====================================================
// FORM/UI TYPES
// =====================================================

/**
 * Formularz konfiguracji kosztów maszyny
 */
export interface MachineCostsFormData {
  machine_id: string;
  replacement_value: number | '';
  economic_life_years: number;
  floor_space_m2: number | '';
  cost_per_m2_yearly: number | '';
  software_subscriptions_yearly: number;
  financing_costs_yearly: number;
  shift_hours_per_day: number;
  working_days_per_year: number;
  oee_percentage: number;
  power_kw: number | '';
  average_load_factor: number;
  consumables_rate_hour: number;
  maintenance_reserve_hour: number;
  operator_hourly_rate: number;
  machines_per_operator: number;
  setup_specialist_rate: number;
}

/**
 * Formularz usługi zewnętrznej
 */
export interface ExternalServiceFormData {
  name: string;
  description: string;
  vendor_name: string;
  vendor_contact: string;
  base_price: number;
  price_unit: 'szt' | 'kg' | 'm2' | 'mb';
  min_order_value: number | '';
  handling_fee_percent: number;
  lead_time_days: number;
  is_active: boolean;
}

/**
 * Formularz konfiguracji wyceny
 */
export interface PricingConfigFormData {
  electricity_price_kwh: number;
  default_margin_percent: number;
  min_margin_percent: number;
  margin_qty_1: number;
  margin_qty_10: number;
  margin_qty_50: number;
  margin_qty_100_plus: number;
  bar_end_waste_kg: number;
  include_tool_costs: boolean;
  default_tool_cost_percent: number;
}

/**
 * Rozszerzenie formularza produktu
 */
export interface ProductABCFormData {
  cycle_time_minutes: number | '';
  setup_time_minutes: number | '';
  efficiency_factor: number;
  default_machine_id: string | '';
  scrap_risk_factor: number;
  material_markup_percent: number;
  material_weight_kg: number | '';
}

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Status kompletności danych dla wyceny
 */
export interface ABCDataCompleteness {
  hasMachineCosts: boolean;
  hasCycleTime: boolean;
  hasSetupTime: boolean;
  hasMaterialData: boolean;
  hasPricingConfig: boolean;
  overallScore: number;                    // 0-100
  missingFields: string[];
}

/**
 * Domyślne wartości dla ABC
 */
export const ABC_DEFAULTS = {
  economic_life_years: 10,
  oee_percentage: 65,
  shift_hours_per_day: 8,
  working_days_per_year: 250,
  average_load_factor: 0.7,
  consumables_rate_hour: 5,
  maintenance_reserve_hour: 10,
  operator_hourly_rate: 50,
  machines_per_operator: 1,
  setup_specialist_rate: 70,
  electricity_price_kwh: 0.85,
  default_margin_percent: 25,
  min_margin_percent: 15,
  efficiency_factor: 1.15,
  scrap_risk_factor: 1.0,
  material_markup_percent: 15,
  bar_end_waste_kg: 0.5,
  handling_fee_percent: 20,
} as const;

/**
 * Progi volume discount
 */
export const VOLUME_DISCOUNT_THRESHOLDS = {
  qty_1: 1,
  qty_10: 10,
  qty_50: 50,
  qty_100: 100,
} as const;

/**
 * Współczynniki ryzyka materiałowego
 */
export const MATERIAL_RISK_FACTORS = {
  aluminum: 1.0,
  steel: 1.05,
  stainless_steel: 1.10,
  titanium: 1.15,
  inconel: 1.20,
  brass: 1.02,
  copper: 1.03,
} as const;

export type MaterialRiskType = keyof typeof MATERIAL_RISK_FACTORS;
