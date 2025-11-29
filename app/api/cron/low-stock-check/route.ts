/**
 * CRON JOB: Low Stock Check
 *
 * Schedule: Daily at 6:00 AM (Europe/Warsaw)
 * Purpose: Find inventory items below threshold and create notifications
 *
 * Vercel Cron calls this endpoint automatically.
 * Manual test: GET /api/cron/low-stock-check with Authorization header
 */

import { createClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  low_stock_threshold: number;
  unit: string;
  company_id: string;
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
      endpoint: '/api/cron/low-stock-check',
      hasAuthHeader: !!authHeader,
    });
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Low stock check cron started', { endpoint: '/api/cron/low-stock-check' });

  try {
    const supabase = await createClient();

    // Find items where quantity is at or below the low stock threshold
    // Using raw filter since we need to compare two columns
    const { data: allItems, error: itemsError } = await supabase
      .from('inventory')
      .select('id, name, sku, quantity, low_stock_threshold, unit, company_id')
      .gt('low_stock_threshold', 0); // Only items that have a threshold set

    if (itemsError) {
      logger.error('Failed to fetch inventory items', { error: itemsError.message });
      return Response.json({ error: 'Database error', details: itemsError.message }, { status: 500 });
    }

    // Filter in memory: quantity <= low_stock_threshold
    const lowStockItems = ((allItems || []) as LowStockItem[]).filter(
      item => item.quantity <= item.low_stock_threshold
    );

    logger.info('Found low stock items', { count: lowStockItems.length });

    if (lowStockItems.length === 0) {
      return Response.json({
        success: true,
        message: 'No low stock items found',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }

    // Get unique company IDs
    const companyIds = [...new Set(lowStockItems.map(i => i.company_id))];

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

    // Group items by company for batch notifications
    const itemsByCompany = lowStockItems.reduce((acc, item) => {
      if (!acc[item.company_id]) {
        acc[item.company_id] = [];
      }
      acc[item.company_id].push(item);
      return acc;
    }, {} as Record<string, LowStockItem[]>);

    // Create notifications
    let notificationsCreated = 0;

    for (const [companyId, items] of Object.entries(itemsByCompany)) {
      const companyUsers = users.filter(u => u.company_id === companyId);

      // Create one notification per company summarizing all low stock items
      const itemNames = items.slice(0, 3).map(i => i.name).join(', ');
      const moreCount = items.length > 3 ? ` i ${items.length - 3} więcej` : '';

      for (const user of companyUsers) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: user.id,
          company_id: companyId,
          type: 'warning',
          title: `Niski stan magazynowy (${items.length} pozycji)`,
          message: `Materiały poniżej progu: ${itemNames}${moreCount}`,
          link: '/inventory?filter=low-stock',
        });

        if (notifError) {
          logger.warn('Failed to create notification', {
            companyId,
            userId: user.id,
            error: notifError.message,
          });
        } else {
          notificationsCreated++;
        }
      }

      // Also create individual notifications for critical items (quantity = 0)
      const criticalItems = items.filter(i => i.quantity === 0);
      for (const item of criticalItems) {
        for (const user of companyUsers) {
          const { error: criticalNotifError } = await supabase.from('notifications').insert({
            user_id: user.id,
            company_id: companyId,
            type: 'error',
            title: `BRAK NA STANIE: ${item.name}`,
            message: `SKU: ${item.sku} - ilość wynosi 0 ${item.unit}`,
            link: `/inventory/${item.id}`,
          });

          if (!criticalNotifError) {
            notificationsCreated++;
          }
        }
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Low stock check cron completed', {
      itemsFound: lowStockItems.length,
      companiesAffected: Object.keys(itemsByCompany).length,
      notificationsCreated,
      duration,
    });

    return Response.json({
      success: true,
      message: 'Low stock check cron completed',
      processed: lowStockItems.length,
      companiesAffected: Object.keys(itemsByCompany).length,
      notificationsCreated,
      duration,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Low stock check cron failed', { error: errorMessage });

    return Response.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
