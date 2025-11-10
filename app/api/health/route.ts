import { createClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Test database connection by querying users table
    const { error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (usersError) throw usersError

    // Test orders table
    const { error: ordersError } = await supabase
      .from('orders')
      .select('count')
      .limit(1)

    if (ordersError) throw ordersError

    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      tables: {
        users: 'ok',
        orders: 'ok',
      },
      version: 'Day 5',
    })
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'connection_failed',
        error: error.message,
      },
      { status: 500 }
    )
  }
}
