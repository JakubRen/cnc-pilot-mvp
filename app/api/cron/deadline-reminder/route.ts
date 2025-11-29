/**
 * CRON JOB: Deadline Reminder
 *
 * Schedule: Daily at 8:00 AM (Europe/Warsaw)
 * Purpose: Find orders with deadline in next 24h and create notifications
 *
 * Vercel Cron calls this endpoint automatically.
 * Manual test: GET /api/cron/deadline-reminder with Authorization header
 */

import { createClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface UrgentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  deadline: string;
  company_id: string;
  status: string;
}

interface CompanyUser {
  id: number;
  company_id: string;
  role: string;
}

export async function GET(request: Request) {
  const startTime = Date.now();

  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Allow requests from Vercel Cron (they have special header) or with valid secret
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const hasValidSecret = authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !hasValidSecret) {
    logger.warn('Unauthorized cron access attempt', {
      endpoint: '/api/cron/deadline-reminder',
      hasAuthHeader: !!authHeader,
    });
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Deadline reminder cron started', { endpoint: '/api/cron/deadline-reminder' });

  try {
    const supabase = await createClient();

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find orders with deadline within next 24 hours (not completed/cancelled)
    const { data: urgentOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, deadline, company_id, status')
      .in('status', ['pending', 'in_progress'])
      .gte('deadline', today.toISOString().split('T')[0])
      .lte('deadline', tomorrow.toISOString().split('T')[0]);

    if (ordersError) {
      logger.error('Failed to fetch urgent orders', { error: ordersError.message });
      return Response.json({ error: 'Database error', details: ordersError.message }, { status: 500 });
    }

    const orders = (urgentOrders || []) as UrgentOrder[];
    logger.info('Found urgent orders', { count: orders.length });

    if (orders.length === 0) {
      return Response.json({
        success: true,
        message: 'No urgent orders found',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }

    // Get unique company IDs
    const companyIds = [...new Set(orders.map(o => o.company_id))];

    // Get users from these companies (owners, admins, managers) to notify
    const { data: usersToNotify, error: usersError } = await supabase
      .from('users')
      .select('id, company_id, role')
      .in('company_id', companyIds)
      .in('role', ['owner', 'admin', 'manager']);

    if (usersError) {
      logger.error('Failed to fetch users', { error: usersError.message });
      return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const users = (usersToNotify || []) as CompanyUser[];

    // Create notifications
    let notificationsCreated = 0;

    for (const order of orders) {
      // Find users in this company to notify
      const companyUsers = users.filter(u => u.company_id === order.company_id);

      // Format deadline for Polish locale
      const deadlineDate = new Date(order.deadline);
      const formattedDeadline = deadlineDate.toLocaleDateString('pl-PL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

      for (const user of companyUsers) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: user.id,
          company_id: order.company_id,
          type: 'warning',
          title: `Zbliża się deadline: ${order.order_number}`,
          message: `Zamówienie dla ${order.customer_name} ma termin: ${formattedDeadline}`,
          link: `/orders/${order.id}`,
        });

        if (notifError) {
          logger.warn('Failed to create notification', {
            orderId: order.id,
            userId: user.id,
            error: notifError.message,
          });
        } else {
          notificationsCreated++;
        }
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Deadline reminder cron completed', {
      ordersFound: orders.length,
      notificationsCreated,
      duration,
    });

    return Response.json({
      success: true,
      message: 'Deadline reminder cron completed',
      processed: orders.length,
      notificationsCreated,
      duration,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Deadline reminder cron failed', { error: errorMessage });

    return Response.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
