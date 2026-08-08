import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { executeAutoReplyEngine } from '@/lib/deepseek-engine'
import { sendMessage } from '@/lib/messaging/sender'
import { generateHumanEmailPayload } from '@/lib/messaging/templates'

/**
 * POST /api/messaging/inbound
 * Generic inbound webhook endpoint for SMS and Email replies with instant multi-channel auto-reply dispatch
 */
async function handleInboundPayload(payload: {
  rawPhone?: string
  rawEmail?: string
  content?: string
  fromPort?: string
  rawSubject?: string
  messageId?: string
  references?: string
  channel?: string
}) {
  const senderIdentifier = (payload.rawEmail || payload.rawPhone || '').toString().trim()
  const channel = payload.channel || (senderIdentifier.includes('@') ? 'email' : 'sms')

  if (!senderIdentifier || senderIdentifier.length < 3 || !payload.content) {
    return NextResponse.json({ error: 'Missing valid phone/email or content.' }, { status: 400 })
  }

  // Filter out marketing and system emails
  const lowerSender = senderIdentifier.toLowerCase()
  const isMarketingOrSystem =
    lowerSender.includes('no-reply') ||
    lowerSender.includes('noreply') ||
    lowerSender.includes('mailer-daemon') ||
    lowerSender.includes('marketing') ||
    lowerSender.includes('newsletter') ||
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

  // Find or auto-create lead
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
        name: `Lead ${senderIdentifier.slice(-4)}`,
        phone: senderIdentifier.includes('@') ? 'N/A' : senderIdentifier,
        email: senderIdentifier.includes('@') ? senderIdentifier : 'N/A',
        status: 'replied',
        port: payload.fromPort || '1.01',
      }
    })
  } else {
    if (payload.fromPort && lead.port !== payload.fromPort) {
      await db.lead.update({ where: { id: lead.id }, data: { port: payload.fromPort } })
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
    text: payload.content,
    timestamp: new Date().toISOString()
  })

  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      messages: JSON.stringify(existingMsgs),
      updatedAt: new Date()
    }
  })

  // Execute DeepSeek AI Auto-Reply Engine
  const autoReplyRes = await executeAutoReplyEngine({
    tenantId,
    phone: lead.phone || undefined,
    email: lead.email || undefined,
    text: payload.content,
    channel,
    port: payload.fromPort || lead.port || undefined
  })

  if (autoReplyRes.success && autoReplyRes.replyText) {
    const replyText = autoReplyRes.replyText
    const replyChannel = channel // Exact channel match: SMS inbound -> SMS reply! Email inbound -> Email reply!

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

    // Dispatch auto-reply INSTANTLY
    if (replyChannel === 'email' && lead.email) {
      const defaultSubjectData = generateHumanEmailPayload(lead.name || '')
      const replySubject = payload.rawSubject
        ? (payload.rawSubject.toLowerCase().startsWith('re:') ? payload.rawSubject : `Re: ${payload.rawSubject}`)
        : `Re: ${defaultSubjectData.subject}`

      await sendMessage({
        channel: 'email',
        to: lead.email,
        message: replyText,
        emailPayload: {
          subject: replySubject,
          body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #111111; line-height: 1.6;">${replyText.replace(/\n/g, '<br/>')}</div>`,
          textBody: replyText,
          inReplyTo: payload.messageId || undefined,
          references: payload.references || payload.messageId || undefined,
        },
        settings: { messageDelayMinMs: 1000, messageDelayMaxMs: 3000 }
      }).catch((err) => console.error('Email auto-reply error:', err))
    } else if (replyChannel === 'sms' && lead.phone) {
      await sendMessage({
        channel: 'sms',
        to: lead.phone,
        message: replyText,
        stickyPort: payload.fromPort || lead.port || '1.01',
        settings: { messageDelayMinMs: 1000, messageDelayMaxMs: 3000 }
      }).catch((err) => console.error('SMS auto-reply error:', err))
    }

    return NextResponse.json({
      success: true,
      autoReplied: true,
      reply: replyText,
      channel: replyChannel
    })
  }

  return NextResponse.json({ success: true, autoReplied: false })
}

/**
 * POST /api/messaging/inbound
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    return handleInboundPayload({
      rawPhone: body.phone || body.src_num || body.from,
      rawEmail: body.email,
      content: body.content || body.msg || body.sms || body.text,
      fromPort: body.fromPort || body.port || body.receiver,
      rawSubject: body.subject,
      messageId: body.messageId,
      references: body.references,
      channel: body.channel,
    })
  } catch (error) {
    console.error('Inbound POST route error:', error)
    return NextResponse.json({ error: 'Failed to process inbound message.' }, { status: 500 })
  }
}

/**
 * GET /api/messaging/inbound (Skyline GoIP Webhook Support)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    return handleInboundPayload({
      rawPhone: searchParams.get('src_num') || searchParams.get('phone') || searchParams.get('from') || undefined,
      rawEmail: searchParams.get('email') || undefined,
      content: searchParams.get('msg') || searchParams.get('sms') || searchParams.get('text') || searchParams.get('content') || undefined,
      fromPort: searchParams.get('receiver') || searchParams.get('port') || searchParams.get('fromPort') || undefined,
      rawSubject: searchParams.get('subject') || undefined,
      channel: searchParams.get('channel') || 'sms',
    })
  } catch (error) {
    console.error('Inbound GET route error:', error)
    return NextResponse.json({ error: 'Failed to process inbound GET message.' }, { status: 500 })
  }
}