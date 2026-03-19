/**
 * CRON JOB: Predictive Deadline Alert
 *
 * Schedule: Every 4 hours (Vercel Cron)
 * Purpose: Predict which orders will miss their deadline based on
 *          remaining operations × avg time vs available time.
 *          Notifies for critical/at_risk orders only.
 *
 * Uses getOrderCompletionLikelihoods() from deadline-monitor.ts
 * which analyzes production plan progress (operations done/total,
 * estimated minutes, work hours available).
 *
 * Deduplication: skips orders already notified today.
 *
 * Vercel Cron calls this endpoint automatically.
 * Manual test: GET /api/cron/deadline-reminder with Authorization header
 */

import { createClient } from '@/lib/supabase-server';
import { getOrderCompletionLikelihoods, type CompletionRisk } from '@/lib/ai/features/deadline-monitor';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DAYS_AHEAD = 7; // Look-ahead window

export async function GET(request: Request) {
  const startTime = Date.now();

  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const hasValidSecret = authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !hasValidSecret) {
    logger.warn('Unauthorized cron access attempt', {
      endpoint: '/api/cron/deadline-reminder',
      hasAuthHeader: !!authHeader,
    });
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Predictive deadline alert cron started');

  try {
    const supabase = await createClient();

    // 1. Get all companies with active orders
    const { data: companies, error: companiesError } = await supabase
      .from('orders')
      .select('company_id')
      .in('status', ['pending', 'in_progress', 'delayed'])
      .not('deadline', 'is', null);

    if (companiesError) {
      logger.error('Failed to fetch companies', { error: companiesError.message });
      return Response.json({ error: 'Database error' }, { status: 500 });
    }

    const companyIds = [...new Set((companies || []).map(c => c.company_id))];

    if (companyIds.length === 0) {
      return Response.json({
        success: true,
        message: 'No active orders with deadlines',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }

    // 2. Get completion likelihoods for each company
    let totalAtRisk = 0;
    let totalCritical = 0;
    let notificationsCreated = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    for (const companyId of companyIds) {
      const likelihoods = await getOrderCompletionLikelihoods(companyId, DAYS_AHEAD);

      // Filter: only critical and at_risk
      const riskyOrders = likelihoods.filter(l => l.risk === 'critical' || l.risk === 'at_risk');

      if (riskyOrders.length === 0) continue;

      totalCritical += riskyOrders.filter(o => o.risk === 'critical').length;
      totalAtRisk += riskyOrders.filter(o => o.risk === 'at_risk').length;

      // 3. Get users to notify (owners, admins, managers)
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', companyId)
        .in('role', ['owner', 'admin', 'manager']);

      if (!users || users.length === 0) continue;

      // 4. Check existing notifications today (dedup)
      const orderLinks = riskyOrders.map(o => `/orders/${o.orderId}`);
      const { data: existingNotifs } = await supabase
        .from('notifications')
        .select('link')
        .eq('company_id', companyId)
        .in('link', orderLinks)
        .gte('created_at', `${todayStr}T00:00:00`);

      const alreadyNotified = new Set((existingNotifs || []).map(n => n.link));

      // 5. Create notifications for risky orders (not already notified today)
      for (const order of riskyOrders) {
        const link = `/orders/${order.orderId}`;
        if (alreadyNotified.has(link)) continue;

        const icon = order.risk === 'critical' ? '🔴' : '🟡';
        const riskLabel = order.risk === 'critical' ? 'KRYTYCZNE' : 'ZAGROŻONE';

        const deadlineDate = new Date(order.deadline);
        const formattedDeadline = deadlineDate.toLocaleDateString('pl-PL', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });

        const title = `${icon} ${riskLabel}: ${order.orderNumber}`;
        const message = [
          `${order.customerName} — termin: ${formattedDeadline} (${order.daysRemaining} dni)`,
          `Szansa na czas: ${order.completionLikelihood}%`,
          order.statusSummary,
        ].join('. ');

        for (const user of users) {
          const { error: notifError } = await supabase.from('notifications').insert({
            user_id: user.id,
            company_id: companyId,
            type: order.risk === 'critical' ? 'error' : 'warning',
            title,
            message,
            link,
          });

          if (!notifError) notificationsCreated++;
        }
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Predictive deadline alert cron completed', {
      companies: companyIds.length,
      critical: totalCritical,
      atRisk: totalAtRisk,
      notificationsCreated,
      duration,
    });

    return Response.json({
      success: true,
      message: 'Predictive deadline alert completed',
      companies: companyIds.length,
      critical: totalCritical,
      at_risk: totalAtRisk,
      notifications_created: notificationsCreated,
      days_ahead: DAYS_AHEAD,
      duration,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Predictive deadline alert cron failed', { error: errorMessage });

    return Response.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
