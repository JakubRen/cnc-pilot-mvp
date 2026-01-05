// Report Scheduler - Cron jobs for automated reports
import cron from 'node-cron'
import { sendEmail, reportEmail } from '../email/email-client'
import { createClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

// Scheduled report types
type ReportType = 'orders' | 'inventory' | 'time' | 'revenue' | 'productivity'

// Report filter types
interface OrderFilters {
  status?: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled'
  dateFrom?: string
  dateTo?: string
  customer?: string
}

interface InventoryFilters {
  category?: string
  lowStockOnly?: boolean
}

interface TimeFilters {
  dateFrom: string
  dateTo: string
  userId?: number
}

interface RevenueFilters {
  dateFrom?: string
  dateTo?: string
}

interface ProductivityFilters {
  dateFrom?: string
  dateTo?: string
  userId?: number
}

type ReportFilters = OrderFilters | InventoryFilters | TimeFilters | RevenueFilters | ProductivityFilters

// Report data types
interface OrdersReportData {
  totalOrders: number
  completedOrders: number
  pendingOrders: number
}

interface InventoryReportData {
  totalItems: number
  lowStockItems: number
}

interface TimeReportData {
  totalHours: number
  activeSessions: number
}

interface RevenueReportData {
  totalRevenue: number
  averageOrderValue: number
}

interface ProductivityReportData {
  totalEmployees: number
  averageEfficiency: number
}

type ReportData = OrdersReportData | InventoryReportData | TimeReportData | RevenueReportData | ProductivityReportData

interface ScheduledReport {
  id: string
  companyId: string
  name: string
  reportType: ReportType
  recipients: string[]
  frequency: 'daily' | 'weekly' | 'monthly'
  dayOfWeek?: number // 0-6 (Sunday-Saturday)
  dayOfMonth?: number // 1-31
  timeOfDay: string // HH:MM format
  filters?: ReportFilters
  isActive: boolean
  nextSendAt: string
}

// Store active cron jobs
const activeJobs = new Map<string, ReturnType<typeof cron.schedule>>()

/**
 * Initialize all scheduled reports from database
 */
export async function initializeScheduler() {
  const supabase = await createClient()

  const { data: reports, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('is_active', true)

  if (error) {
    logger.error('Error loading scheduled reports', { error })
    return
  }

  reports?.forEach((report) => {
    scheduleReport(report as ScheduledReport)
  })

  logger.info(`Initialized ${reports?.length || 0} scheduled reports`)
}

/**
 * Schedule a single report
 */
export function scheduleReport(report: ScheduledReport) {
  const cronExpression = getCronExpression(report)

  // Stop existing job if any
  if (activeJobs.has(report.id)) {
    activeJobs.get(report.id)?.stop()
  }

  // Create new cron job
  const task = cron.schedule(cronExpression, async () => {
    await executeReport(report)
  })

  activeJobs.set(report.id, task)
  logger.info(`Scheduled report: ${report.name} (${cronExpression})`)
}

/**
 * Unschedule a report
 */
export function unscheduleReport(reportId: string) {
  if (activeJobs.has(reportId)) {
    activeJobs.get(reportId)?.stop()
    activeJobs.delete(reportId)
    logger.info(`Unscheduled report: ${reportId}`)
  }
}

/**
 * Convert report schedule to cron expression
 */
function getCronExpression(report: ScheduledReport): string {
  const [hour, minute] = report.timeOfDay.split(':').map(Number)

  switch (report.frequency) {
    case 'daily':
      // Every day at specified time
      return `${minute} ${hour} * * *`

    case 'weekly':
      // Every week on specified day at specified time
      const dayOfWeek = report.dayOfWeek ?? 1 // Default to Monday
      return `${minute} ${hour} * * ${dayOfWeek}`

    case 'monthly':
      // Every month on specified day at specified time
      const dayOfMonth = report.dayOfMonth ?? 1 // Default to 1st
      return `${minute} ${hour} ${dayOfMonth} * *`

    default:
      throw new Error(`Unknown frequency: ${report.frequency}`)
  }
}

/**
 * Execute a report and send via email
 */
async function executeReport(report: ScheduledReport) {
  logger.info(`Executing report: ${report.name}`)

  try {
    const supabase = await createClient()

    // Generate report data based on type
    let reportData: ReportData
    let summary: string

    switch (report.reportType) {
      case 'orders':
        reportData = await generateOrdersReport(supabase, report.companyId, report.filters as OrderFilters | undefined)
        summary = `Wygenerowano raport zamówień: ${reportData.totalOrders} zamówień, ${reportData.completedOrders} ukończonych, ${reportData.pendingOrders} w toku.`
        break

      case 'inventory':
        reportData = await generateInventoryReport(supabase, report.companyId, report.filters as InventoryFilters | undefined)
        summary = `Raport magazynu: ${reportData.totalItems} pozycji, ${reportData.lowStockItems} z niskim stanem.`
        break

      case 'time':
        reportData = await generateTimeReport(supabase, report.companyId, report.filters as TimeFilters | undefined)
        summary = `Raport czasu pracy: ${reportData.totalHours.toFixed(1)} godzin, ${reportData.activeSessions} aktywnych sesji.`
        break

      case 'revenue':
        reportData = await generateRevenueReport(supabase, report.companyId, report.filters as RevenueFilters | undefined)
        summary = `Raport przychodów: ${reportData.totalRevenue.toFixed(2)} PLN, średnia wartość zamówienia: ${reportData.averageOrderValue.toFixed(2)} PLN.`
        break

      case 'productivity':
        reportData = await generateProductivityReport(supabase, report.companyId, report.filters as ProductivityFilters | undefined)
        summary = `Raport produktywności: ${reportData.totalEmployees} pracowników, średnia wydajność: ${reportData.averageEfficiency.toFixed(1)}%.`
        break

      default:
        throw new Error(`Unknown report type: ${report.reportType}`)
    }

    // Get company name
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', report.companyId)
      .single()

    // Send email
    const emailSent = await sendEmail({
      to: report.recipients,
      subject: `${report.name} - ${new Date().toLocaleDateString('pl-PL')}`,
      html: reportEmail({
        companyName: company?.name || 'Twoja firma',
        reportType: report.name,
        reportDate: new Date().toLocaleDateString('pl-PL', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        summary,
        // TODO: Add CSV/Excel attachment
      }),
      text: summary,
    })

    // Update last_sent_at and next_send_at
    await supabase
      .from('scheduled_reports')
      .update({
        last_sent_at: new Date().toISOString(),
        next_send_at: calculateNextSendTime(report),
      })
      .eq('id', report.id)

    logger.info(`Report sent: ${report.name} to ${report.recipients.length} recipients`)
  } catch (error) {
    logger.error(`Error executing report ${report.name}`, { error })

    // TODO: Log error to database or send alert
  }
}

/**
 * Calculate next send time based on frequency
 */
function calculateNextSendTime(report: ScheduledReport): string {
  const now = new Date()
  const [hour, minute] = report.timeOfDay.split(':').map(Number)

  const next = new Date(now)
  next.setHours(hour, minute, 0, 0)

  switch (report.frequency) {
    case 'daily':
      if (next <= now) {
        next.setDate(next.getDate() + 1)
      }
      break

    case 'weekly':
      const dayOfWeek = report.dayOfWeek ?? 1
      next.setDate(next.getDate() + ((7 + dayOfWeek - next.getDay()) % 7))
      if (next <= now) {
        next.setDate(next.getDate() + 7)
      }
      break

    case 'monthly':
      const dayOfMonth = report.dayOfMonth ?? 1
      next.setDate(dayOfMonth)
      if (next <= now) {
        next.setMonth(next.getMonth() + 1)
      }
      break
  }

  return next.toISOString()
}

// Report generation functions
async function generateOrdersReport(supabase: SupabaseClient, companyId: string, filters?: OrderFilters): Promise<OrdersReportData> {
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('company_id', companyId)

  interface Order {
    status: string
  }

  return {
    totalOrders: orders?.length || 0,
    completedOrders: orders?.filter((o: Order) => o.status === 'completed').length || 0,
    pendingOrders: orders?.filter((o: Order) => o.status === 'in_progress').length || 0,
  }
}

async function generateInventoryReport(supabase: SupabaseClient, companyId: string, filters?: InventoryFilters): Promise<InventoryReportData> {
  const { data: items } = await supabase
    .from('inventory')
    .select('*')
    .eq('company_id', companyId)

  interface InventoryItem {
    quantity: number
    low_stock_threshold: number
  }

  return {
    totalItems: items?.length || 0,
    lowStockItems: items?.filter((i: InventoryItem) => i.quantity < i.low_stock_threshold).length || 0,
  }
}

async function generateTimeReport(supabase: SupabaseClient, companyId: string, filters?: TimeFilters): Promise<TimeReportData> {
  const { data: timeLogs } = await supabase
    .from('time_logs')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'completed')

  interface TimeLog {
    start_time: string | null
    end_time: string | null
  }

  const totalHours =
    timeLogs?.reduce((sum: number, log: TimeLog) => {
      if (log.end_time && log.start_time) {
        const hours = (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / 3600000
        return sum + hours
      }
      return sum
    }, 0) || 0

  return {
    totalHours,
    activeSessions: 0, // Would need to query active timers
  }
}

async function generateRevenueReport(supabase: SupabaseClient, companyId: string, filters?: RevenueFilters): Promise<RevenueReportData> {
  const { data: orders } = await supabase
    .from('orders')
    .select('total_cost')
    .eq('company_id', companyId)
    .not('total_cost', 'is', null)

  interface Order {
    total_cost: number | null
  }

  const totalRevenue = orders?.reduce((sum: number, o: Order) => sum + (o.total_cost || 0), 0) || 0
  const averageOrderValue = orders && orders.length > 0 ? totalRevenue / orders.length : 0

  return {
    totalRevenue,
    averageOrderValue,
  }
}

async function generateProductivityReport(supabase: SupabaseClient, companyId: string, filters?: ProductivityFilters): Promise<ProductivityReportData> {
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('company_id', companyId)

  return {
    totalEmployees: users?.length || 0,
    averageEfficiency: 85, // Placeholder - would calculate from actual data
  }
}
