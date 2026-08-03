// ===================== EMAIL SENDER (SMTP) =====================
// Ultra-clean Direct DMARC Aligned Email Sender.

import nodemailer from 'nodemailer'

export interface EmailConfig {
  host: string       // e.g., "smtp.gmail.com"
  port: number       // e.g., 587
  user: string       // email address
  pass: string       // app password or regular password
  fromName?: string  // display name
  fromEmail?: string // reply-to (if different from user)
  secure?: boolean   // TLS
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface EmailPayload {
  to: string
  subject: string
  body: string       // text body
  textBody?: string  // plain text fallback
  replyTo?: string
  inReplyTo?: string
  references?: string
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

/**
 * Send a single email via SMTP (nodemailer)
 */
export async function sendEmail(
  config: EmailConfig,
  payload: EmailPayload,
): Promise<SendEmailResult> {
  try {
    if (!payload.to || !payload.subject || !payload.body) {
      return { success: false, error: 'Missing required fields: to, subject, body' }
    }

    const smtpUser = config.user || (config as Record<string, string>).email
    const smtpPass = config.pass || (config as Record<string, string>).password

    if (!smtpUser || !smtpPass) {
      return { success: false, error: 'Missing SMTP credentials (user/email and pass/password)' }
    }

    const transporter = nodemailer.createTransport({
      host: config.host || 'smtp.gmail.com',
      port: config.port || 587,
      secure: config.secure ?? (config.port === 465),
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })

    const cleanText = (payload.textBody || stripHtml(payload.body)).replace(/<br\s*\/?>/gi, '\n')

    // Clean, natural plain-text & HTML payload without custom bulk mailer headers
    // Allowing Gmail SMTP and Nodemailer to auto-generate verified DKIM & Message-ID headers
    const info = await transporter.sendMail({
      from: config.fromName ? `"${config.fromName}" <${smtpUser}>` : smtpUser,
      to: payload.to,
      subject: payload.subject,
      text: cleanText,
    })

    try { transporter.close() } catch {}

    return {
      success: true,
      messageId: info.messageId || `email_${Date.now()}`,
    }
  } catch (error) {
    console.error('SMTP Send Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Email send error',
    }
  }
}

/**
 * Send email using Gmail SMTP session
 */
export async function sendEmailViaGmail(
  tenantId: string,
  payload: EmailPayload,
): Promise<SendEmailResult> {
  try {
    const { sendEmailViaGmailSession, getGmailSessionStatus } = await import('./gmail-login')

    const status = getGmailSessionStatus(tenantId)
    if (!status.active) {
      return { success: false, error: 'No active Gmail connection. Please connect your Gmail account first via Channels page.' }
    }

    const result = await sendEmailViaGmailSession(
      tenantId,
      payload.to,
      payload.subject,
      payload.body,
    )

    return result
  } catch (err) {
    console.error('Gmail Session dispatch error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send via Gmail session',
    }
  }
}