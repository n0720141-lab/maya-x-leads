// ===================== MULTI-CHANNEL SENDER =====================
// Orchestrates SMS, WhatsApp, Email with:
// 1. Multi-channel initial blast (all 3 channels)
// 2. Active channel tracking (reply on one = stop others)
// 3. Channel switching (customer switches = system switches)
// 4. Random delays between messages (anti-ban)
// 5. Batch processing with sleep between batches

import { sendSkylineSms, holdPort, type SkylineConfig } from './skyline'
import { sendWhatsAppMessage, normalizeWhatsAppPhone } from './whatsapp'
import { sendEmail, type EmailConfig, type EmailPayload } from './email'

// ===================== CONFIG TYPES =====================

export interface MessagingSettings {
  // Batching
  batchSize: number           // e.g., 400 leads per batch
  batchSleepMs: number        // e.g., 10000 ms sleep between batches

  // Random delays (anti-ban)
  messageDelayMinMs: number   // e.g., 0 ms
  messageDelayMaxMs: number   // e.g., 10000 ms (10 sec)

  // WhatsApp specific
  whatsappTypingSimulation: boolean
  whatsappTypingSpeedMs: number  // ms per character

  // SIM Box
  sendNodeControlBase: string   // e.g., "http://127.0.0.1:3010"
  sendNodeHoldMs: number        // e.g., 25000 ms
  sendNodeSecret: string
}

export const DEFAULT_MESSAGING_SETTINGS: MessagingSettings = {
  batchSize: 400,
  batchSleepMs: 10000,
  messageDelayMinMs: 3000,
  messageDelayMaxMs: 10000,
  whatsappTypingSimulation: true,
  whatsappTypingSpeedMs: 80,
  sendNodeControlBase: 'http://127.0.0.1:3010',
  sendNodeHoldMs: 25000,
  sendNodeSecret: '19851985',
}

// ===================== RANDOM DELAY =====================

/**
 * Random delay between min and max ms
 */
export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  return new Promise(resolve => setTimeout(resolve, delay))
}

// ===================== SINGLE MESSAGE SEND =====================

export interface SendMessageOptions {
  channel: 'sms' | 'whatsapp' | 'email'
  to: string
  message: string
  // Channel configs
  skylineConfig?: SkylineConfig
  whatsappSessionId?: string
  emailConfig?: EmailConfig
  emailPayload?: Partial<EmailPayload>
  // Sticky port (for SMS)
  stickyPort?: string
  // Timing
  settings?: Partial<MessagingSettings>
  // Skip actual sending (dry run)
  dryRun?: boolean
}

export interface SendMessageResult {
  success: boolean
  channel: string
  messageId?: string
  error?: string
  port?: string
}

/**
 * Send a single message on one channel
 */
export async function sendMessage(opts: SendMessageOptions): Promise<SendMessageResult> {
  const settings = { ...DEFAULT_MESSAGING_SETTINGS, ...opts.settings }

  // Random delay before sending (anti-ban)
  await randomDelay(settings.messageDelayMinMs, settings.messageDelayMaxMs)

  if (opts.dryRun) {
    return { success: true, channel: opts.channel, messageId: `dry_${Date.now()}` }
  }

  switch (opts.channel) {
    case 'sms': {
      const targetSkylineConfig = opts.skylineConfig || {
        host: process.env.SKYLINE_HOST || "192.168.1.16",
        httpPort: parseInt(process.env.SKYLINE_HTTP_PORT || "80", 10),
        httpUser: process.env.SKYLINE_HTTP_USER || "root",
        httpPass: process.env.SKYLINE_HTTP_PASS || "Sign4321$",
        smppPort: parseInt(process.env.SKYLINE_SMPP_PORT || "20002", 10),
        smppUser: process.env.SKYLINE_SMPP_USER || "leadsminer_in",
        smppPass: process.env.SKYLINE_SMPP_PASS || "Sign4321",
      };
      // Hold port for sticky reply (only if send-node is configured)
      if (opts.stickyPort && settings.sendNodeControlBase) {
        await holdPort(
          settings.sendNodeControlBase,
          opts.stickyPort,
          settings.sendNodeSecret,
          settings.sendNodeHoldMs,
        )
      }
      // Build send-node config if configured
      const sendNodeConfig = settings.sendNodeControlBase
        ? { baseUrl: settings.sendNodeControlBase, secret: settings.sendNodeSecret }
        : undefined

      const result = await sendSkylineSms(
        targetSkylineConfig,
        opts.to,
        opts.message,
        opts.stickyPort,
        sendNodeConfig,
      )
      return {
        success: result.success,
        channel: 'sms',
        messageId: result.messageId,
        error: result.error,
        port: result.port,
      }
    }

    case 'whatsapp': {
      try {
        const waServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://127.0.0.1:3002'
        const resp = await fetch(waServiceUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send',
            tenantId: opts.whatsappSessionId || 'default',
            to: opts.to,
            message: opts.message,
          }),
        })

        const resData = await resp.json()
        return {
          success: resData.success ?? false,
          channel: 'whatsapp',
          messageId: resData.messageId,
          error: resData.error,
        }
      } catch (err) {
        console.error('WhatsApp dispatch HTTP error:', err)
        return {
          success: false,
          channel: 'whatsapp',
          error: err instanceof Error ? err.message : 'WhatsApp service error',
        }
      }
    }

    case 'email': {
      const { db } = await import('@/lib/db')
      let emailChannels = await db.channel.findMany({ where: { type: 'email', status: 'connected' } })
      
      let lastErr = 'Email config not provided'
      for (const emailCh of emailChannels) {
        if (!emailCh.credentials) continue
        try {
          const cfg = JSON.parse(emailCh.credentials)
          const result = await sendEmail(cfg, {
            to: opts.to,
            subject: opts.emailPayload?.subject || 'Message from MayaX',
            body: opts.emailPayload?.body || opts.message,
            textBody: opts.emailPayload?.textBody || opts.message,
            replyTo: opts.emailPayload?.replyTo,
          })

          if (result.success) {
            return {
              success: true,
              channel: 'email',
              messageId: result.messageId,
            }
          } else {
            lastErr = result.error || 'SMTP send failed'
            if (lastErr.includes('550') || lastErr.toLowerCase().includes('limit')) {
              await db.channel.update({
                where: { id: emailCh.id },
                data: { status: 'limit_reached' },
              }).catch(() => {})
            }
          }
        } catch (err) {
          lastErr = err instanceof Error ? err.message : 'SMTP error'
        }
      }

      if (lastErr.includes('550') || lastErr.toLowerCase().includes('limit')) {
        lastErr = '⚠️ Gmail Daily Sending Limit Reached (550 5.4.5)! Google has paused sending on your Gmail account for 24h. Please add a new Gmail account in Channels page.'
      }

      return { success: false, channel: 'email', error: lastErr }
    }

    default:
      return { success: false, channel: opts.channel, error: `Unknown channel: ${opts.channel}` }
  }
}

// ===================== MULTI-CHANNEL INITIAL BLAST =====================

export interface MultiChannelBlastOptions {
  to: string
  message: string
  channels: ('sms' | 'whatsapp' | 'email')[]
  skylineConfig?: SkylineConfig
  whatsappSessionId?: string
  emailConfig?: EmailConfig
  emailPayload?: Partial<EmailPayload>
  stickyPort?: string
  settings?: Partial<MessagingSettings>
  dryRun?: boolean
}

export interface MultiChannelBlastResult {
  results: SendMessageResult[]
  anySuccess: boolean
}

/**
 * Send initial message on ALL specified channels
 * Used for first contact — blast on SMS + WhatsApp + Email
 */
export async function multiChannelBlast(opts: MultiChannelBlastOptions): Promise<MultiChannelBlastResult> {
  const results: SendMessageResult[] = []

  for (const channel of opts.channels) {
    const result = await sendMessage({
      channel,
      to: opts.to,
      message: opts.message,
      skylineConfig: opts.skylineConfig,
      whatsappSessionId: opts.whatsappSessionId,
      emailConfig: opts.emailConfig,
      emailPayload: opts.emailPayload,
      stickyPort: channel === 'sms' ? opts.stickyPort : undefined,
      settings: opts.settings,
      dryRun: opts.dryRun,
    })
    results.push(result)

    // Small delay between channel sends
    await randomDelay(1000, 3000)
  }

  return {
    results,
    anySuccess: results.some(r => r.success),
  }
}

// ===================== BATCH PROCESSOR =====================

export interface BatchItem {
  id: string
  to: string
  message: string
  channel: 'sms' | 'whatsapp' | 'email'
  stickyPort?: string
  // For email
  emailSubject?: string
  emailBody?: string
}

export interface BatchProgress {
  batch: number
  totalBatches: number
  itemInBatch: number
  totalItemsInBatch: number
  totalProcessed: number
  totalItems: number
  successCount: number
  failCount: number
}

export type BatchProgressCallback = (progress: BatchProgress) => void

/**
 * Process messages in batches with sleep between batches
 * Handles 25K-50K leads/day volume
 */
export async function processBatch(
  items: BatchItem[],
  opts: {
    skylineConfig?: SkylineConfig
    whatsappSessionId?: string
    emailConfig?: EmailConfig
    settings?: Partial<MessagingSettings>
    dryRun?: boolean
    onProgress?: BatchProgressCallback
  },
): Promise<{ success: number; failed: number; errors: string[] }> {
  const settings = { ...DEFAULT_MESSAGING_SETTINGS, ...opts.settings }
  const batchSize = settings.batchSize
  const totalItems = items.length
  const totalBatches = Math.ceil(totalItems / batchSize)

  let successCount = 0
  let failCount = 0
  const errors: string[] = []
  let totalProcessed = 0

  for (let batch = 0; batch < totalBatches; batch++) {
    const start = batch * batchSize
    const end = Math.min(start + batchSize, totalItems)
    const batchItems = items.slice(start, end)

    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i]
      totalProcessed++

      const result = await sendMessage({
        channel: item.channel,
        to: item.to,
        message: item.message,
        skylineConfig: opts.skylineConfig,
        whatsappSessionId: opts.whatsappSessionId,
        emailConfig: opts.emailConfig,
        emailPayload: item.emailSubject ? {
          subject: item.emailSubject,
          body: item.emailBody || item.message,
        } : undefined,
        stickyPort: item.stickyPort,
        settings: opts.settings,
        dryRun: opts.dryRun,
      })

      if (result.success) {
        successCount++
      } else {
        failCount++
        if (result.error) errors.push(`${item.to}: ${result.error}`)
      }

      // Report progress
      opts.onProgress?.({
        batch: batch + 1,
        totalBatches,
        itemInBatch: i + 1,
        totalItemsInBatch: batchItems.length,
        totalProcessed,
        totalItems,
        successCount,
        failCount,
      })
    }

    // Sleep between batches (except after last batch)
    if (batch < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, settings.batchSleepMs))
    }
  }

  return { success: successCount, failed: failCount, errors }
}