// ============================================
// EMAIL CLIENT - CNC-Pilot (Resend)
// ============================================

import { Resend } from 'resend'
import { TIME } from '@/lib/constants/time'
import { logger } from '@/lib/logger'

// Initialize Resend client only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Default from address
const FROM_EMAIL = process.env.EMAIL_FROM || 'CNC-Pilot <notifications@cnc-pilot.pl>'

// Email types
export type EmailType =
  | 'order_created'
  | 'order_status_changed'
  | 'deadline_approaching'
  | 'low_stock_alert'
  | 'team_invitation'
  | 'welcome'

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export interface OrderEmailData {
  orderNumber: string
  customerName: string
  partName?: string
  quantity?: number
  deadline?: string
  status?: string
  oldStatus?: string
  newStatus?: string
}

export interface StockAlertData {
  itemName: string
  currentQuantity: number
  threshold: number
  unit: string
}

export interface TeamInviteData {
  inviterName: string
  companyName: string
  role: string
}

// ============================================
// EMAIL SENDING FUNCTION
// ============================================

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    if (!resend) {
      logger.warn('[EMAIL] RESEND_API_KEY not configured - skipping email')
      return { success: false, error: 'Email not configured' }
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })

    if (error) {
      logger.error('[EMAIL] Send error', { error })
      return { success: false, error: error.message }
    }

    logger.info('[EMAIL] Sent successfully', { emailId: data?.id })
    return { success: true, id: data?.id }
  } catch (err) {
    logger.error('[EMAIL] Exception', { error: err })
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

const baseTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e2e8f0;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #3b82f6;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      color: #1e293b;
      margin: 16px 0;
    }
    .content {
      margin: 24px 0;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #64748b;
      font-size: 14px;
    }
    .info-value {
      font-weight: 600;
      color: #1e293b;
    }
    .btn {
      display: inline-block;
      background: #3b82f6;
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 16px;
    }
    .btn:hover {
      background: #2563eb;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 500;
    }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-in_progress { background: #dbeafe; color: #1e40af; }
    .status-completed { background: #d1fae5; color: #065f46; }
    .status-delayed { background: #fee2e2; color: #991b1b; }
    .alert { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .warning { background: #fffbeb; border: 1px solid #fed7aa; color: #92400e; }
    .success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">🔧 CNC-Pilot</div>
      </div>
      ${content}
      <div class="footer">
        <p>Ten email został wysłany automatycznie z systemu CNC-Pilot.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://cnc-pilot.pl'}">Zaloguj się do aplikacji</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`

// ============================================
// SPECIFIC EMAIL GENERATORS
// ============================================

export function generateOrderCreatedEmail(data: OrderEmailData): EmailPayload {
  const html = baseTemplate(`
    <h2 class="title">Nowe zamówienie utworzone</h2>
    <div class="content">
      <p>Nowe zamówienie zostało dodane do systemu:</p>
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Numer zamówienia:</span>
          <span class="info-value">${data.orderNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Klient:</span>
          <span class="info-value">${data.customerName}</span>
        </div>
        ${data.partName ? `
        <div class="info-row">
          <span class="info-label">Nazwa części:</span>
          <span class="info-value">${data.partName}</span>
        </div>
        ` : ''}
        ${data.quantity ? `
        <div class="info-row">
          <span class="info-label">Ilość:</span>
          <span class="info-value">${data.quantity} szt.</span>
        </div>
        ` : ''}
        ${data.deadline ? `
        <div class="info-row">
          <span class="info-label">Termin realizacji:</span>
          <span class="info-value">${new Date(data.deadline).toLocaleDateString('pl-PL')}</span>
        </div>
        ` : ''}
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/orders" class="btn">Zobacz zamówienie</a>
    </div>
  `, 'Nowe zamówienie - CNC-Pilot')

  return {
    to: '',
    subject: `[CNC-Pilot] Nowe zamówienie: ${data.orderNumber}`,
    html,
    text: `Nowe zamówienie ${data.orderNumber} dla klienta ${data.customerName} zostało utworzone.`
  }
}

export function generateStatusChangedEmail(data: OrderEmailData): EmailPayload {
  const statusLabels: Record<string, string> = {
    pending: 'Oczekujące',
    in_progress: 'W realizacji',
    completed: 'Zakończone',
    delayed: 'Opóźnione',
    cancelled: 'Anulowane'
  }

  const html = baseTemplate(`
    <h2 class="title">Zmiana statusu zamówienia</h2>
    <div class="content">
      <p>Status zamówienia <strong>${data.orderNumber}</strong> został zmieniony:</p>
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Zamówienie:</span>
          <span class="info-value">${data.orderNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Klient:</span>
          <span class="info-value">${data.customerName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Poprzedni status:</span>
          <span class="status-badge status-${data.oldStatus}">${statusLabels[data.oldStatus || ''] || data.oldStatus}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Nowy status:</span>
          <span class="status-badge status-${data.newStatus}">${statusLabels[data.newStatus || ''] || data.newStatus}</span>
        </div>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/orders" class="btn">Zobacz szczegóły</a>
    </div>
  `, 'Zmiana statusu - CNC-Pilot')

  return {
    to: '',
    subject: `[CNC-Pilot] ${data.orderNumber}: ${statusLabels[data.newStatus || ''] || data.newStatus}`,
    html,
    text: `Status zamówienia ${data.orderNumber} zmieniony z "${data.oldStatus}" na "${data.newStatus}".`
  }
}

export function generateDeadlineApproachingEmail(data: OrderEmailData): EmailPayload {
  const daysLeft = data.deadline
    ? Math.ceil((new Date(data.deadline).getTime() - Date.now()) / TIME.MS_PER_DAY)
    : 0

  const html = baseTemplate(`
    <h2 class="title">⚠️ Zbliżający się termin realizacji</h2>
    <div class="content">
      <div class="info-box warning">
        <p><strong>Zamówienie ${data.orderNumber}</strong> ma termin realizacji za <strong>${daysLeft} dni</strong>!</p>
      </div>
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Zamówienie:</span>
          <span class="info-value">${data.orderNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Klient:</span>
          <span class="info-value">${data.customerName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Termin:</span>
          <span class="info-value" style="color: #dc2626;">${data.deadline ? new Date(data.deadline).toLocaleDateString('pl-PL') : 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="status-badge status-${data.status}">${data.status}</span>
        </div>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/orders" class="btn">Przejdź do zamówienia</a>
    </div>
  `, 'Zbliżający się termin - CNC-Pilot')

  return {
    to: '',
    subject: `[CNC-Pilot] ⚠️ Termin za ${daysLeft} dni: ${data.orderNumber}`,
    html,
    text: `Zamówienie ${data.orderNumber} ma termin realizacji za ${daysLeft} dni (${data.deadline}).`
  }
}

export function generateLowStockAlertEmail(data: StockAlertData): EmailPayload {
  const html = baseTemplate(`
    <h2 class="title">🚨 Niski stan magazynowy</h2>
    <div class="content">
      <div class="info-box alert">
        <p>Stan magazynowy <strong>${data.itemName}</strong> spadł poniżej progu minimalnego!</p>
      </div>
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Pozycja:</span>
          <span class="info-value">${data.itemName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Aktualny stan:</span>
          <span class="info-value" style="color: #dc2626;">${data.currentQuantity} ${data.unit}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Próg minimalny:</span>
          <span class="info-value">${data.threshold} ${data.unit}</span>
        </div>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/inventory" class="btn">Przejdź do magazynu</a>
    </div>
  `, 'Niski stan magazynowy - CNC-Pilot')

  return {
    to: '',
    subject: `[CNC-Pilot] 🚨 Niski stan: ${data.itemName}`,
    html,
    text: `Niski stan magazynowy: ${data.itemName} - ${data.currentQuantity} ${data.unit} (próg: ${data.threshold} ${data.unit}).`
  }
}

export function generateTeamInviteEmail(data: TeamInviteData): EmailPayload {
  const roleLabels: Record<string, string> = {
    owner: 'Właściciel',
    admin: 'Administrator',
    manager: 'Kierownik',
    operator: 'Operator',
    viewer: 'Podgląd'
  }

  const html = baseTemplate(`
    <h2 class="title">Zaproszenie do zespołu</h2>
    <div class="content">
      <div class="info-box success">
        <p>Zostałeś dodany do zespołu <strong>${data.companyName}</strong> w systemie CNC-Pilot!</p>
      </div>
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Firma:</span>
          <span class="info-value">${data.companyName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Zaproszony przez:</span>
          <span class="info-value">${data.inviterName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Twoja rola:</span>
          <span class="info-value">${roleLabels[data.role] || data.role}</span>
        </div>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/login" class="btn">Zaloguj się</a>
    </div>
  `, 'Zaproszenie do zespołu - CNC-Pilot')

  return {
    to: '',
    subject: `[CNC-Pilot] Zaproszenie do ${data.companyName}`,
    html,
    text: `Zostałeś zaproszony do zespołu ${data.companyName} przez ${data.inviterName}. Twoja rola: ${data.role}.`
  }
}

export function generateWelcomeEmail(userName: string, companyName: string): EmailPayload {
  const html = baseTemplate(`
    <h2 class="title">Witamy w CNC-Pilot!</h2>
    <div class="content">
      <p>Cześć <strong>${userName}</strong>!</p>
      <p>Twoje konto w firmie <strong>${companyName}</strong> zostało utworzone.</p>
      <div class="info-box success">
        <p>CNC-Pilot pomoże Ci zarządzać:</p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>📦 Zamówieniami produkcyjnymi</li>
          <li>🏭 Stanami magazynowymi</li>
          <li>⏱️ Czasem pracy</li>
          <li>📊 Raportami i analityką</li>
        </ul>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}" class="btn">Rozpocznij pracę</a>
    </div>
  `, 'Witamy - CNC-Pilot')

  return {
    to: '',
    subject: `[CNC-Pilot] Witamy w systemie, ${userName}!`,
    html,
    text: `Witamy ${userName} w CNC-Pilot! Twoje konto w firmie ${companyName} jest gotowe.`
  }
}
