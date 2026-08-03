import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'
import { sendMessage, DEFAULT_MESSAGING_SETTINGS } from '@/lib/messaging/sender'
import type { SkylineConfig, EmailConfig } from '@/lib/messaging'

/**
 * POST /api/messaging/process-queue
 * Process pending messages from the MessageQueue table
 * This is the core queue processor for high volume (25K-50K/day)
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  try {
    const batchSize = 100
    const pending = await db.messageQueue.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    })

    if (!pending.length) {
      return NextResponse.json({ processed: 0, message: 'No pending messages.' })
    }

    // Get global messaging settings
    const configs = await db.globalConfig.findMany({
      where: { key: { startsWith: 'msg_' } },
    })
    const settingsMap: Record<string, unknown> = {}
    for (const c of configs) {
      const num = Number(c.value)
      settingsMap[c.key.replace('msg_', '')] = isNaN(num) ? c.value : num
    }
    const settings = { ...DEFAULT_MESSAGING_SETTINGS, ...settingsMap }

    let success = 0
    let failed = 0

    for (const msg of pending) {
      try {
        // Get lead phone
        const lead = msg.leadId ? await db.lead.findUnique({ where: { id: msg.leadId } }) : null
        if (!lead) {
          await db.messageQueue.update({
            where: { id: msg.id },
            data: { status: 'failed', error: 'Lead not found' },
          })
          failed++
          continue
        }

        // Get channel config
        const channel = await db.channel.findFirst({
          where: { tenantId: msg.tenantId, type: msg.channel, status: 'connected' },
        })

        let skylineConfig: SkylineConfig | undefined
        let emailConfig: EmailConfig | undefined
        let waSessionId: string | undefined

        if (channel?.credentials) {
          const creds = JSON.parse(channel.credentials) as Record<string, unknown>
          if (msg.channel === 'sms') {
            skylineConfig = {
              host: String(creds.host || '192.168.1.16'),
              httpPort: Number(creds.port || 80),
              httpUser: String(creds.user || 'root'),
              httpPass: String(creds.pass || ''),
            }
          } else if (msg.channel === 'email') {
            emailConfig = {
              host: String(creds.host || ''),
              port: Number(creds.port || 587),
              user: String(creds.user || ''),
              pass: String(creds.pass || ''),
            }
          } else if (msg.channel === 'whatsapp') {
            waSessionId = String(creds.sessionId || '')
          }
        }

        // Mark processing
        await db.messageQueue.update({
          where: { id: msg.id },
          data: { status: 'processing' },
        })

        const to = msg.channel === 'email' ? (lead.email || '') : lead.phone
        const result = await sendMessage({
          channel: msg.channel as 'sms' | 'whatsapp' | 'email',
          to,
          message: msg.content,
          skylineConfig,
          whatsappSessionId: waSessionId,
          emailConfig,
          stickyPort: msg.stickyPort || undefined,
          settings,
        })

        if (result.success) {
          await db.messageQueue.update({
            where: { id: msg.id },
            data: { status: 'sent', sentAt: new Date() },
          })
          // Save sticky port from SMS result
          if (msg.channel === 'sms' && result.port) {
            await db.lead.update({
              where: { id: lead.id },
              data: { port: result.port },
            })
          }
          success++
        } else {
          await db.messageQueue.update({
            where: { id: msg.id },
            data: { status: 'failed', error: result.error, retryCount: { increment: 1 } },
          })
          failed++
        }
      } catch (error) {
        await db.messageQueue.update({
          where: { id: msg.id },
          data: { status: 'failed', error: error instanceof Error ? error.message : 'Unknown', retryCount: { increment: 1 } },
        })
        failed++
      }
    }

    const remaining = await db.messageQueue.count({ where: { status: 'pending' } })

    return NextResponse.json({
      processed: pending.length,
      success,
      failed,
      remaining,
    })
  } catch (error) {
    console.error('Queue process error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}