// Report Scheduler - Cron jobs for automated reports
import cron from 'node-cron'
import { sendEmail, reportEmail } from '../email/email-client'
import { createClient } from '@/lib/supabase-server'

// Scheduled report types
type ReportType = 'orders' | 'inventory' | 'time' | 'revenue' | 'productivity'

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
  filters?: any
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
    console.error('Error loading scheduled reports:', error)
    return
  }

  reports?.forEach((report) => {
    scheduleReport(report as ScheduledReport)
  })

  console.log(`✅ Initialized ${reports?.length || 0} scheduled reports`)
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
  console.log(`📅 Scheduled report: ${report.name} (${cronExpression})`)
}

/**
 * Unschedule a report
 */
export function unscheduleReport(reportId: string) {
  if (activeJobs.has(reportId)) {
    activeJobs.get(reportId)?.stop()
    activeJobs.delete(reportId)
    console.log(`🛑 Unscheduled report: ${reportId}`)
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
  console.log(`📊 Executing report: ${report.name}`)

  try {
    const supabase = await createClient()

    // Generate report data based on type
    let reportData: any
    let summary: string

    switch (report.reportType) {
      case 'orders':
        reportData = await generateOrdersReport(supabase, report.companyId, report.filters)
        summary = `Wygenerowano raport zamówień: ${reportData.totalOrders} zamówień, ${reportData.completedOrders} ukończonych, ${reportData.pendingOrders} w toku.`
        break

      case 'inventory':
        reportData = await generateInventoryReport(supabase, report.companyId, report.filters)
        summary = `Raport magazynu: ${reportData.totalItems} pozycji, ${reportData.lowStockItems} z niskim stanem.`
        break

      case 'time':
        reportData = await generateTimeReport(supabase, report.companyId, report.filters)
        summary = `Raport czasu pracy: ${reportData.totalHours.toFixed(1)} godzin, ${reportData.activeSessions} aktywnych sesji.`
        break

      case 'revenue':
        reportData = await generateRevenueReport(supabase, report.companyId, report.filters)
        summary = `Raport przychodów: ${reportData.totalRevenue.toFixed(2)} PLN, średnia wartość zamówienia: ${reportData.averageOrderValue.toFixed(2)} PLN.`
        break

      case 'productivity':
        reportData = await generateProductivityReport(supabase, report.companyId, report.filters)
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

    console.log(`✅ Report sent: ${report.name} to ${report.recipients.length} recipients`)
  } catch (error) {
    console.error(`❌ Error executing report ${report.name}:`, error)

    // TODO: Log error to database or send alert
  }
}

/**
 * Calculate next send time based on frequency
 */
function calculateNextSendTime(report: ScheduledReport): string {
  const now = new Date()
  const [hour, minute] = report.timeOfDay.split(':').map(Number)

  let next = new Date(now)
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
async function generateOrdersReport(supabase: any, companyId: string, filters: any) {
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('company_id', companyId)

  return {
    totalOrders: orders?.length || 0,
    completedOrders: orders?.filter((o: any) => o.status === 'completed').length || 0,
    pendingOrders: orders?.filter((o: any) => o.status === 'in_progress').length || 0,
  }
}

async function generateInventoryReport(supabase: any, companyId: string, filters: any) {
  const { data: items } = await supabase
    .from('inventory')
    .select('*')
    .eq('company_id', companyId)

  return {
    totalItems: items?.length || 0,
    lowStockItems: items?.filter((i: any) => i.quantity < i.low_stock_threshold).length || 0,
  }
}

async function generateTimeReport(supabase: any, companyId: string, filters: any) {
  const { data: timeLogs } = await supabase
    .from('time_logs')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'completed')

  const totalHours =
    timeLogs?.reduce((sum: number, log: any) => {
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

async function generateRevenueReport(supabase: any, companyId: string, filters: any) {
  const { data: orders } = await supabase
    .from('orders')
    .select('total_cost')
    .eq('company_id', companyId)
    .not('total_cost', 'is', null)

  const totalRevenue = orders?.reduce((sum: number, o: any) => sum + (o.total_cost || 0), 0) || 0
  const averageOrderValue = orders && orders.length > 0 ? totalRevenue / orders.length : 0

  return {
    totalRevenue,
    averageOrderValue,
  }
}

async function generateProductivityReport(supabase: any, companyId: string, filters: any) {
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('company_id', companyId)

  return {
    totalEmployees: users?.length || 0,
    averageEfficiency: 85, // Placeholder - would calculate from actual data
  }
}
