// ============================================
// TypeScript Types dla struktury operacyjnej
// ============================================

export type OperationType =
  | 'milling'       // Frezowanie
  | 'turning'       // Toczenie
  | 'drilling'      // Wiercenie
  | 'grinding'      // Szlifowanie
  | 'cutting'       // Cięcie
  | 'deburring'     // Usuwanie zadziorów
  | 'quality_control' // Kontrola jakości
  | 'other'         // Inne

export type OperationStatus =
  | 'pending'       // Oczekuje
  | 'in_progress'   // W realizacji
  | 'completed'     // Ukończone
  | 'quality_check' // Kontrola jakości
  | 'failed'        // Nieudane

export type Complexity =
  | 'simple'        // Proste
  | 'medium'        // Średnie
  | 'complex'       // Złożone

// Order Item (pozycja zlecenia)
export interface OrderItem {
  id: string
  order_id: string
  part_name: string
  quantity: number
  drawing_file_id?: string | null
  length?: number | null
  width?: number | null
  height?: number | null
  material?: string | null
  complexity?: Complexity | null
  notes?: string | null

  // Sumy (obliczane automatycznie przez triggery)
  total_setup_time_minutes: number
  total_run_time_minutes: number
  total_cost: number

  created_at: string
  updated_at: string

  // Relations (opcjonalne, zależne od query)
  operations?: Operation[]
  drawing_file?: {
    id: string
    name: string
    url: string
    file_type: string
    file_size: number
  } | null
}

// Operation (operacja technologiczna)
export interface Operation {
  id: string
  production_plan_id: string  // Changed from order_item_id - now points to production_plans table
  operation_number: number
  operation_type: OperationType
  operation_name: string
  description?: string | null

  // Przypisanie do maszyny
  machine_id?: string | null

  // KLUCZOWE: Setup Time vs Run Time
  setup_time_minutes: number          // Czas przygotowawczy (jednorazowy)
  run_time_per_unit_minutes: number   // Czas obróbki 1 sztuki

  // Stawka
  hourly_rate: number                 // PLN/godzinę

  // Koszty (obliczane automatycznie)
  total_setup_cost: number            // (setup_time / 60) * hourly_rate
  total_run_cost: number              // (run_time_per_unit * quantity / 60) * hourly_rate
  total_operation_cost: number        // setup_cost + run_cost

  // Status i przypisanie
  status: OperationStatus
  assigned_operator_id?: number | null

  // Tracking czasu
  started_at?: string | null
  completed_at?: string | null

  created_at: string
  updated_at: string

  // Relations (opcjonalne)
  machine?: {
    id: string
    name: string
    machine_type: string
  } | null
  assigned_operator?: {
    id: number
    full_name: string
  } | null
}

// Estimation results from RPC function
export interface OperationTimeEstimate {
  setup_time_minutes: number
  run_time_per_unit_minutes: number
}

// Form data dla tworzenia/edycji operacji
export interface OperationFormData {
  operation_number: number
  operation_type: OperationType
  operation_name: string
  description?: string
  machine_id?: string
  setup_time_minutes: number
  run_time_per_unit_minutes: number
  hourly_rate: number
}

// Form data dla tworzenia/edycji pozycji zlecenia
export interface OrderItemFormData {
  part_name: string
  quantity: number
  drawing_file_id?: string | null
  length?: number
  width?: number
  height?: number
  material?: string
  complexity?: Complexity
  notes?: string
  operations: OperationFormData[]
}

// Summary z view operations_summary
export interface OperationSummary {
  id: string
  order_item_id: string
  order_id: string
  order_number: string
  part_name: string
  quantity: number
  operation_number: number
  operation_type: OperationType
  operation_name: string
  machine_name?: string | null
  operator_name?: string | null

  // Czasy
  setup_time_minutes: number
  run_time_per_unit_minutes: number
  total_run_time_minutes: number
  total_time_minutes: number

  // Koszty
  hourly_rate: number
  total_setup_cost: number
  total_run_cost: number
  total_operation_cost: number

  // Status
  status: OperationStatus
  started_at?: string | null
  completed_at?: string | null

  // Czas realizacji (jeśli ukończone)
  actual_duration_minutes?: number | null
}

// Labels dla UI
export const operationTypeLabels: Record<OperationType, string> = {
  milling: '🔧 Frezowanie',
  turning: '⚙️ Toczenie',
  drilling: '🔩 Wiercenie',
  grinding: '💎 Szlifowanie',
  cutting: '✂️ Cięcie',
  deburring: '🪛 Usuwanie zadziorów',
  quality_control: '✅ Kontrola jakości',
  other: '🛠️ Inne'
}

export const operationStatusLabels: Record<OperationStatus, string> = {
  pending: 'Oczekuje',
  in_progress: 'W realizacji',
  completed: 'Ukończone',
  quality_check: 'Kontrola jakości',
  failed: 'Nieudane'
}

export const operationStatusColors: Record<OperationStatus, string> = {
  pending: 'bg-yellow-600',
  in_progress: 'bg-blue-600',
  completed: 'bg-green-600',
  quality_check: 'bg-purple-600',
  failed: 'bg-red-600'
}

export const complexityLabels: Record<Complexity, string> = {
  simple: '🟢 Proste',
  medium: '🟡 Średnie',
  complex: '🔴 Złożone'
}

// Helper functions
export function calculateOperationCost(
  setupTime: number,
  runTimePerUnit: number,
  quantity: number,
  hourlyRate: number
): {
  setupCost: number
  runCost: number
  totalCost: number
  totalTimeMinutes: number
} {
  const setupCost = (setupTime / 60) * hourlyRate
  const totalRunTime = runTimePerUnit * quantity
  const runCost = (totalRunTime / 60) * hourlyRate
  const totalCost = setupCost + runCost
  const totalTimeMinutes = setupTime + totalRunTime

  return {
    setupCost: Math.round(setupCost * 100) / 100,
    runCost: Math.round(runCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalTimeMinutes: Math.round(totalTimeMinutes * 100) / 100
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`
  }

  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (mins === 0) {
    return `${hours}h`
  }

  return `${hours}h ${mins}min`
}

export function formatCost(amount: number): string {
  return `${amount.toFixed(2)} PLN`
}
