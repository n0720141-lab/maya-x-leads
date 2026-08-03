// ===================== GMAIL LOGIN VIA SMTP (APP PASSWORD) =====================
// Clean approach: Enter Gmail + App Password → Test SMTP connection → Connected!
// No browser needed. Uses nodemailer with Google App Password.
// Industry standard — used by Mailchimp, SendGrid, etc.

import nodemailer from 'nodemailer'

export interface GmailLoginResult {
  success: boolean
  email?: string
  error?: string
  errorType?: 'WRONG_CREDENTIALS' | 'APP_PASSWORD_REQUIRED' | 'NETWORK_ERROR' | 'UNKNOWN'
  step?: string
}

// Track active SMTP transporters per tenant (for sending)
const activeTransporters: Map<string, nodemailer.Transporter> = new Map()

/**
 * Login to Gmail by testing SMTP connection with App Password
 * Flow: Create SMTP transporter → Verify connection → Save credentials
 * Returns immediately — no browser, no waiting for pages to load
 */
export async function loginToGmail(
  email: string,
  password: string,
  sessionKey: string,
): Promise<GmailLoginResult> {
  // Validate email format
  if (!email.includes('@')) {
    return {
      success: false,
      error: 'Please enter a valid email address.',
      errorType: 'WRONG_CREDENTIALS',
      step: 'validate',
    }
  }

  let transporter: nodemailer.Transporter | null = null

  try {
    // Step 1: Create SMTP transporter
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // TLS
      auth: {
        user: email,
        pass: password,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })

    // Step 2: Test the connection (this is the real login test)
    await transporter.verify()

    // Step 3: Connection successful! Store the transporter for sending
    // Step 3: Connection successful! Store the transporter for sending
    const mapKey = `gmail:${sessionKey}`
    const existing = activeTransporters.get(mapKey)
    if (existing) {
      try {
        const closeResult = existing.close()
        if (closeResult && typeof (closeResult as Promise<void>).catch === 'function') {
          ;(closeResult as Promise<void>).catch(() => {})
        }
      } catch {
        // Ignore
      }
    }
    activeTransporters.set(mapKey, transporter)

    return {
      success: true,
      email,
      step: 'connected',
    }
  } catch (error: unknown) {
    // Close transporter if connection failed (close() returns void, not a Promise)
    if (transporter) {
      try {
        const closeResult = transporter.close()
        if (closeResult && typeof (closeResult as Promise<void>).catch === 'function') {
          ;(closeResult as Promise<void>).catch(() => {})
        }
      } catch {
        // Ignore close errors
      }
    }

    const msg = error instanceof Error ? error.message : String(error)

    // Detect specific error types for user-friendly messages
    if (
      msg.includes('Invalid login') ||
      msg.includes('Username and Password not accepted') ||
      msg.includes('Authentication failed') ||
      msg.includes('535')
    ) {
      return {
        success: false,
        error: 'Invalid email or password. If you have 2-Step Verification enabled, you must use an App Password (not your regular password).',
        errorType: 'WRONG_CREDENTIALS',
        step: 'auth',
      }
    }

    if (
      msg.includes('Please log in via your web browser') ||
      msg.includes('Application-specific password required') ||
      msg.includes('Less secure app') ||
      msg.includes('EOE')
    ) {
      return {
        success: false,
        error: 'Google requires an App Password. Go to your Google Account → Security → 2-Step Verification → App Passwords → Generate a new one. Use that 16-character code as your password here.',
        errorType: 'APP_PASSWORD_REQUIRED',
        step: 'auth',
      }
    }

    if (
      msg.includes('ENOTFOUND') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('ETIMEDOUT') ||
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('ECONNRESET')
    ) {
      return {
        success: false,
        error: 'Could not connect to Gmail servers. Please check your internet connection and try again.',
        errorType: 'NETWORK_ERROR',
        step: 'connect',
      }
    }

    return {
      success: false,
      error: msg || 'Gmail connection failed. Please check your credentials and try again.',
      errorType: 'UNKNOWN',
      step: 'error',
    }
  }
}

/**
 * Send email using the active SMTP transporter
 * This uses the saved App Password credentials
 */
export async function sendEmailViaGmailSession(
  sessionKey: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const mapKey = `gmail:${sessionKey}`
  const transporter = activeTransporters.get(mapKey)

  if (!transporter) {
    return { success: false, error: 'No active Gmail connection. Please connect your Gmail account first.' }
  }

  try {
    const info = await transporter.sendMail({
      from: transporter.options.auth?.user || '',
      to,
      subject,
      html: body,
    })

    return {
      success: true,
      messageId: info.messageId,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Send email via SMTP with explicit credentials (fallback)
 */
export async function sendEmailViaSMTP(
  email: string,
  password: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: email, pass: password },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })

    const info = await transporter.sendMail({
      from: `"MayaX" <${email}>`,
      to,
      subject,
      html: body,
    })

    try {
      const closeResult = transporter.close()
      if (closeResult && typeof (closeResult as Promise<void>).catch === 'function') {
        ;(closeResult as Promise<void>).catch(() => {})
      }
    } catch {
      // Ignore
    }

    return {
      success: true,
      messageId: info.messageId,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SMTP send failed',
    }
  }
}

/**
 * Get the active Gmail connection status
 */
export function getGmailSessionStatus(sessionKey: string): { active: boolean } {
  const mapKey = `gmail:${sessionKey}`
  return { active: activeTransporters.has(mapKey) }
}

/**
 * Close a Gmail SMTP connection
 */
export async function closeGmailSession(sessionKey: string): Promise<void> {
  const mapKey = `gmail:${sessionKey}`
  const transporter = activeTransporters.get(mapKey)
  if (transporter) {
    try {
      const closeResult = transporter.close()
      if (closeResult && typeof (closeResult as Promise<void>).catch === 'function') {
        ;(closeResult as Promise<void>).catch(() => {})
      }
    } catch {
      // Ignore
    }
    activeTransporters.delete(mapKey)
  }
}