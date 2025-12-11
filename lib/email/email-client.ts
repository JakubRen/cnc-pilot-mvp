// Email Client using Nodemailer
import nodemailer from 'nodemailer'
import { logger } from '@/lib/logger'

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content?: string | Buffer
    path?: string
  }>
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: `"CNC-Pilot" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    })

    logger.info('Email sent', { messageId: info.messageId })
    return true
  } catch (error) {
    logger.error('Email send error', { error })
    return false
  }
}

// Email templates
export function orderNotificationEmail(data: {
  customerName: string
  orderNumber: string
  partName: string
  quantity: number
  deadline: string
  status: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e293b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-pending { background: #fbbf24; color: #78350f; }
    .badge-in-progress { background: #3b82f6; color: white; }
    .badge-completed { background: #10b981; color: white; }
    .details { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📦 Aktualizacja zamówienia</h1>
    </div>
    <div class="content">
      <p>Witaj ${data.customerName},</p>
      <p>Informujemy o zmianie statusu Twojego zamówienia:</p>

      <div class="details">
        <h3 style="margin-top: 0;">Zamówienie #${data.orderNumber}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>Część:</strong></td>
            <td style="padding: 8px 0;">${data.partName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Ilość:</strong></td>
            <td style="padding: 8px 0;">${data.quantity} szt.</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Termin:</strong></td>
            <td style="padding: 8px 0;">${data.deadline}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Status:</strong></td>
            <td style="padding: 8px 0;">
              <span class="badge badge-${data.status}">${data.status}</span>
            </td>
          </tr>
        </table>
      </div>

      <p style="margin-top: 30px;">
        Dziękujemy za zaufanie!<br/>
        <strong>Zespół CNC-Pilot</strong>
      </p>
    </div>
    <div class="footer">
      <p>Ta wiadomość została wysłana automatycznie. Nie odpowiadaj na ten email.</p>
    </div>
  </div>
</body>
</html>
`
}

export function reportEmail(data: {
  companyName: string
  reportType: string
  reportDate: string
  summary: string
  attachmentName?: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e293b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📊 Raport ${data.reportType}</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${data.reportDate}</p>
    </div>
    <div class="content">
      <p>Witaj ${data.companyName},</p>
      <p>Twój raport ${data.reportType} jest gotowy:</p>

      <div class="summary">
        <h3 style="margin-top: 0;">Podsumowanie</h3>
        <p>${data.summary}</p>
      </div>

      ${
        data.attachmentName
          ? `<p>📎 Pełny raport znajduje się w załączniku: <strong>${data.attachmentName}</strong></p>`
          : ''
      }

      <p style="margin-top: 30px;">
        Raport został wygenerowany automatycznie przez CNC-Pilot.
      </p>
    </div>
    <div class="footer">
      <p>Ta wiadomość została wysłana automatycznie. Nie odpowiadaj na ten email.</p>
    </div>
  </div>
</body>
</html>
`
}
