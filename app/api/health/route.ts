import { createClient } from '@/lib/supabase-server'

// Track server start time for uptime calculation
const serverStartTime = Date.now()

interface TableHealthCheck {
  status: 'ok' | 'error'
  responseTime?: number
  error?: string
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  version: string
  environment: string
  uptime: {
    seconds: number
    formatted: string
  }
  database: {
    status: 'connected' | 'connection_failed'
    responseTime?: number
    tables: Record<string, TableHealthCheck>
  }
  checks: {
    supabaseUrl: boolean
    supabaseKey: boolean
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  parts.push(`${secs}s`)

  return parts.join(' ')
}

async function checkTable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tableName: string
): Promise<TableHealthCheck> {
  const start = Date.now()
  try {
    const { error } = await supabase
      .from(tableName)
      .select('count')
      .limit(1)

    if (error) {
      return { status: 'error', error: error.message }
    }

    return {
      status: 'ok',
      responseTime: Date.now() - start,
    }
  } catch (error: unknown) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function GET() {
  const dbStartTime = Date.now()
  const uptimeSeconds = (Date.now() - serverStartTime) / 1000

  try {
    const supabase = await createClient()

    // Check critical tables in parallel
    const [usersCheck, ordersCheck, inventoryCheck, timeLogsCheck] =
      await Promise.all([
        checkTable(supabase, 'users'),
        checkTable(supabase, 'orders'),
        checkTable(supabase, 'inventory'),
        checkTable(supabase, 'time_logs'),
      ])

    const tables: Record<string, TableHealthCheck> = {
      users: usersCheck,
      orders: ordersCheck,
      inventory: inventoryCheck,
      time_logs: timeLogsCheck,
    }

    // Determine overall status
    const allTablesOk = Object.values(tables).every((t) => t.status === 'ok')
    const anyTableOk = Object.values(tables).some((t) => t.status === 'ok')

    let status: 'ok' | 'degraded' | 'error' = 'ok'
    if (!allTablesOk && anyTableOk) status = 'degraded'
    if (!anyTableOk) status = 'error'

    const response: HealthResponse = {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: {
        seconds: Math.floor(uptimeSeconds),
        formatted: formatUptime(uptimeSeconds),
      },
      database: {
        status: 'connected',
        responseTime: Date.now() - dbStartTime,
        tables,
      },
      checks: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    }

    return Response.json(response, {
      status: status === 'error' ? 503 : 200,
    })
  } catch (error: unknown) {
    const response: HealthResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: {
        seconds: Math.floor(uptimeSeconds),
        formatted: formatUptime(uptimeSeconds),
      },
      database: {
        status: 'connection_failed',
        responseTime: Date.now() - dbStartTime,
        tables: {},
      },
      checks: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    }

    return Response.json(response, { status: 503 })
  }
}
