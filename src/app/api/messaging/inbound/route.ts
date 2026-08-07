import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { executeAutoReplyEngine } from '@/lib/deepseek-engine'
import { sendMessage } from '@/lib/messaging/sender'
import { generateHumanEmailPayload } from '@/lib/messaging/templates'

/**
 * POST /api/messaging/inbound
 * Generic inbound webhook endpoint for SMS and Email replies with instant multi-channel auto-reply dispatch
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { webhookKey, phone: rawPhone, email: rawEmail, content, fromPort, subject: rawSubject, messageId, references } = body

    const senderIdentifier = (rawEmail || rawPhone || '').toString().trim()
    const channel = body.channel || (senderIdentifier.includes('@') ? 'email' : 'sms')

    if (!senderIdentifier || senderIdentifier.length < 3 || !content) {
      return NextResponse.json({ error: 'Missing valid phone/email or content.' }, { status: 400 })
    }

    // Filter out marketing, promotional, and system notification emails
    const lowerSender = senderIdentifier.toLowerCase()
    const isMarketingOrSystem =
      lowerSender.includes('no-reply') ||
      lowerSender.includes('noreply') ||
      lowerSender.includes('mailer-daemon') ||
      lowerSender.includes('marketing') ||
      lowerSender.includes('newsletter') ||
      lowerSender.includes('sandcloud.com') ||
      lowerSender.includes('google.com') ||
      lowerSender.includes('linkedin.com') ||
      lowerSender.includes('facebookmail.com') ||
      lowerSender.includes('support@') ||
      lowerSender.includes('info@') ||
      lowerSender.includes('sales@') ||
      lowerSender.includes('notifications@') ||
      lowerSender.includes('promotions@')

    if (isMarketingOrSystem) {
      return NextResponse.json({ success: true, autoReplied: false, reason: 'Ignored marketing/system email' })
    }

    // Find active channel in DB
    let ch = await db.channel.findFirst({
      where: {
        OR: [
          { phone: senderIdentifier },
          { email: senderIdentifier },
          { type: channel, status: 'connected' }
        ],
      },
      include: { tenant: true },
    })

    if (!ch) {
      ch = await db.channel.findFirst({ where: { status: 'connected' }, include: { tenant: true } })
    }

    if (!ch) {
      return NextResponse.json({ error: 'No channel connected.' }, { status: 404 })
    }

    const tenantId = ch.tenantId

    // Find or create lead by phone or email match
    let lead = await db.lead.findFirst({
      where: {
        tenantId,
        OR: [
          { phone: senderIdentifier },
          { email: senderIdentifier },
        ]
      }
    })

    if (!lead) {
      lead = await db.lead.create({
        data: {
          tenantId,
          name: senderIdentifier.includes('@') ? senderIdentifier.split('@')[0] : 'Inbound Lead',
          phone: channel === 'sms' ? senderIdentifier : 'N/A',
          email: channel === 'email' ? senderIdentifier : undefined,
          status: 'replied',
          port: fromPort || undefined,
        }
      })
    } else {
      if (fromPort && lead.port !== fromPort) {
        await db.lead.update({ where: { id: lead.id }, data: { port: fromPort } })
      }
      await db.lead.update({ where: { id: lead.id }, data: { status: 'replied' } }).catch(() => {})
    }

    // Find or create conversation
    let conversation = await db.conversation.findFirst({ where: { leadId: lead.id } })
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          leadId: lead.id,
          tenantId,
          channel,
          activeChannel: channel,
          state: 'IDLE',
          messages: JSON.stringify([])
        }
      })
    }

    // Save inbound message
    const existingMsgs: Array<Record<string, unknown>> = JSON.parse(conversation.messages || '[]')
    existingMsgs.push({
      direction: 'inbound',
      channel,
      text: content,
      timestamp: new Date().toISOString()
    })

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        messages: JSON.stringify(existingMsgs),
        updatedAt: new Date()
      }
    })

    // Execute Unified DeepSeek / Old System Auto-Reply Engine
    const autoReplyRes = await executeAutoReplyEngine({
      tenantId,
      phone: lead.phone || undefined,
      email: lead.email || undefined,
      text: content,
      channel,
      port: fromPort || lead.port || undefined
    })

    if (autoReplyRes.success && autoReplyRes.replyText) {
      const replyText = autoReplyRes.replyText
      const replyChannel = channel

      // Append outbound auto-reply to conversation
      existingMsgs.push({
        direction: 'outbound',
        channel: replyChannel,
        text: replyText,
        timestamp: new Date().toISOString()
      })

      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          messages: JSON.stringify(existingMsgs),
          state: autoReplyRes.nextState || 'ASK_INCOME',
          updatedAt: new Date()
        }
      })

      // Dispatch auto-reply INSTANTLY to target channel
      if (replyChannel === 'email' && lead.email) {
        const defaultSubjectData = generateHumanEmailPayload(lead.name || '')
        const replySubject = rawSubject
          ? (rawSubject.toLowerCase().startsWith('re:') ? rawSubject : `Re: ${rawSubject}`)
          : `Re: ${defaultSubjectData.subject}`

        await sendMessage({
          channel: 'email',
          to: lead.email,
          message: replyText,
          emailPayload: {
            subject: replySubject,
            body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #111111; line-height: 1.6;">${replyText.replace(/\n/g, '<br/>')}</div>`,
            textBody: replyText,
            inReplyTo: messageId || undefined,
            references: references || messageId || undefined,
          },
          settings: { messageDelayMinMs: 0, messageDelayMaxMs: 0 }
        }).catch((err) => console.error('Email auto-reply dispatch error:', err))
      } else if (replyChannel === 'sms' && lead.phone) {
        await sendMessage({
          channel: 'sms',
          to: lead.phone,
          message: replyText,
          stickyPort: fromPort || lead.port || undefined,
          settings: { messageDelayMinMs: 0, messageDelayMaxMs: 0 }
        }).catch((err) => console.error('SMS auto-reply dispatch error:', err))
      }

      return NextResponse.json({
        success: true,
        autoReplied: true,
        reply: replyText,
        channel: replyChannel
      })
    }

    return NextResponse.json({ success: true, autoReplied: false })
  } catch (error) {
    console.error('Inbound route error:', error)
    return NextResponse.json({ error: 'Failed to process inbound message.' }, { status: 500 })
  }
}