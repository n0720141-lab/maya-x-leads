import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'
import { processBatch, multiChannelBlast, type BatchItem } from '@/lib/messaging'
import { normalizePhone } from '@/lib/messaging/skyline'

/**
 * POST /api/messaging/execute
 * Execute a campaign: send messages to leads
 * Supports: single channel, multi-channel blast, batch processing
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.success) return auth.response
    const { tenantId } = auth

    const body = await req.json() as {
      campaignId?: string
      leadIds?: string[]
      channel?: 'sms' | 'whatsapp' | 'email' | 'all'
      message: string
      emailSubject?: string
      emailBody?: string
      dryRun?: boolean
      // Multi-channel: send on all 3 first
      multiChannel?: boolean
    }

    if (!body.message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }

    // Get leads to send to
    let leads
    if (body.campaignId) {
      leads = await db.lead.findMany({
        where: { tenantId, status: { notIn: ['dnc', 'lost'] } },
      })
    } else if (body.leadIds?.length) {
      leads = await db.lead.findMany({
        where: { id: { in: body.leadIds }, tenantId },
      })
    } else {
      return NextResponse.json({ error: 'Provide campaignId or leadIds.' }, { status: 400 })
    }

    if (!leads.length) {
      return NextResponse.json({ error: 'No leads found.' }, { status: 400 })
    }

    // Get channel configs from DB
    const channels = await db.channel.findMany({ where: { tenantId, status: 'connected' } })
    const smsChannel = channels.find(c => c.type === 'sms')
    const waChannel = channels.find(c => c.type === 'whatsapp')
    const emailChannel = channels.find(c => c.type === 'email')

    // Parse configs
    let skylineConfig, emailConfig, whatsappSessionId
    if (smsChannel?.credentials) {
      const creds = JSON.parse(smsChannel.credentials) as Record<string, unknown>
      skylineConfig = {
        host: String(creds.host || '192.168.1.16'),
        httpPort: Number(creds.port || 80),
        httpUser: String(creds.user || 'root'),
        httpPass: String(creds.pass || ''),
      }
    }
    if (emailChannel?.credentials) {
      const creds = JSON.parse(emailChannel.credentials) as Record<string, unknown>
      emailConfig = {
        host: String(creds.host || ''),
        port: Number(creds.port || 587),
        user: String(creds.user || ''),
        pass: String(creds.pass || ''),
        fromName: String(creds.fromName || 'MayaX'),
      }
    }
    if (waChannel?.credentials) {
      const creds = JSON.parse(waChannel.credentials) as Record<string, unknown>
      whatsappSessionId = String(creds.sessionId || '')
    }

    // Get messaging settings from GlobalConfig
    const settingsRows = await db.globalConfig.findMany({
      where: { key: { startsWith: 'msg_' } },
    })
    const settings: Record<string, unknown> = {}
    for (const row of settingsRows) {
 const num = Number(row.value)
      settings[row.key.replace('msg_', '')] = isNaN(num) ? row.value : num
    }

    // Build batch items
    const determineChannel = (lead: typeof leads[0]): 'sms' | 'whatsapp' | 'email' => {
      if (body.channel === 'all' || body.multiChannel) {
        // Multi-channel handled differently below
        return 'sms'
      }
      if (body.channel === 'whatsapp' && waChannel) return 'whatsapp'
      if (body.channel === 'email' && emailChannel) return 'email'
      return 'sms'
    }

    if (body.multiChannel) {
      // MULTI-CHANNEL BLAST: send on all available channels
      const availableChannels: ('sms' | 'whatsapp' | 'email')[] = []
      if (smsChannel) availableChannels.push('sms')
      if (waChannel) availableChannels.push('whatsapp')
      if (emailChannel) availableChannels.push('email')

      if (!availableChannels.length) {
        return NextResponse.json({ error: 'No connected channels.' }, { status: 400 })
      }

      const results = { success: 0, failed: 0, errors: [] as string[] }

      for (const lead of leads) {
        const to = lead.phone
        const blastResult = await multiChannelBlast({
          to,
          message: body.message,
          channels: availableChannels,
          skylineConfig,
          whatsappSessionId,
          emailConfig,
          emailPayload: {
            subject: body.emailSubject,
            body: body.emailBody,
          },
          stickyPort: lead.port || undefined,
          settings: settings as Record<string, number | string | boolean>,
          dryRun: body.dryRun,
        })

        if (blastResult.anySuccess) {
          results.success++
          // Update lead status
          await db.lead.update({
            where: { id: lead.id },
            data: { status: 'contacted', channel: 'multi' },
          })
          // Save port from SMS result for sticky
          const smsResult = blastResult.results.find(r => r.channel === 'sms' && r.port)
          if (smsResult?.port) {
            await db.lead.update({
              where: { id: lead.id },
              data: { port: smsResult.port },
            })
          }
        } else {
          results.failed++
        }
      }

      return NextResponse.json({
        success: true,
        mode: 'multi_channel',
        channels: availableChannels,
        totalLeads: leads.length,
        successCount: results.success,
        failedCount: results.failed,
        errors: results.errors,
      })
    }

    // SINGLE CHANNEL — batch processing
    const items: BatchItem[] = leads.map(lead => ({
      id: lead.id,
      to: determineChannel(lead) === 'email' ? (lead.email || '') : normalizePhone(lead.phone),
      message: body.message,
      channel: determineChannel(lead),
      stickyPort: lead.port || undefined,
      emailSubject: body.emailSubject,
      emailBody: body.emailBody,
    })).filter(item => item.to)

    const batchResult = await processBatch(items, {
      skylineConfig,
      whatsappSessionId,
      emailConfig,
      settings: settings as Record<string, number | string | boolean>,
      dryRun: body.dryRun,
    })

    // Update lead statuses
    for (const lead of leads) {
      await db.lead.update({
        where: { id: lead.id },
        data: { status: 'contacted' },
      })
    }

    // Log usage
    await db.usageLog.create({
      data: {
        tenantId,
        type: 'message_sent',
        count: batchResult.success,
        date: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      mode: body.channel || 'sms',
      totalLeads: leads.length,
      sent: batchResult.success,
      failed: batchResult.failed,
      errors: batchResult.errors,
    })
  } catch (error) {
    console.error('Campaign execute error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}