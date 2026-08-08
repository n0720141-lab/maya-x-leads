import { db } from '@/lib/db'
import { generateHumanEmailPayload } from './templates'
import { sendMessage } from './sender'

export interface InboundMessageParams {
  tenantId: string
  phone?: string
  email?: string
  text: string
  channel: 'whatsapp' | 'sms' | 'email'
  port?: string
}

export interface AutoReplyResult {
  success: boolean
  replyText: string
  nextState: string
  leadId: string
  conversationId: string
}

function leadFirstName(name?: string | null): string {
  const full = (name || '').trim()
  if (!full || full.toLowerCase() === 'lead') return ''
  return full.split(/\s+/)[0] || ''
}

function isStopOrNotInterested(text: string): boolean {
  const s = (text || '').toLowerCase().trim()
  if (!s) return false
  if (['stop', 'unsubscribe', 'cancel', 'end', 'quit'].includes(s.replace(/[^\w]/g, ''))) return true
  if (s.includes('not interested') || s.includes('no interest') || s.includes('wrong number') || s.includes('wrong person') || s.includes('remove me')) return true
  return false
}

/**
 * 100% Exact Old System (intake-relay.js) Auto-Reply Engine
 * Multi-channel: Dispatches Auto-Replies over WhatsApp, Email, or SIM Box SMS
 */
export async function processInboundAutoReply(params: InboundMessageParams): Promise<AutoReplyResult | null> {
  const { tenantId, phone, email, text, channel, port } = params

  if (isStopOrNotInterested(text)) {
    if (phone) {
      await db.lead.updateMany({
        where: { phone, tenantId },
        data: { status: 'dnc' }
      }).catch(() => {})
    }
    return null
  }

  // 1. Find or create lead
  let lead = null
  if (phone) {
    lead = await db.lead.findFirst({ where: { phone, tenantId } })
  } else if (email) {
    lead = await db.lead.findFirst({ where: { email, tenantId } })
  }

  if (!lead) {
    return null
  } else {
    const updateData: Record<string, unknown> = { status: 'replied' }
    if (port && lead.port !== port) updateData.port = port
    await db.lead.update({ where: { id: lead.id }, data: updateData }).catch(() => {})
  }

  // 2. Find or create conversation
  let conv = await db.conversation.findFirst({ where: { leadId: lead.id } })
  if (!conv) {
    conv = await db.conversation.create({
      data: {
        leadId: lead.id,
        tenantId,
        channel,
        activeChannel: channel,
        state: 'IDLE',
        messages: JSON.stringify([])
      }
    })
  } else if (conv.activeChannel !== channel) {
    await db.conversation.update({
      where: { id: conv.id },
      data: { activeChannel: channel, channel }
    }).catch(() => {})
  }

  // 3. Append inbound message to conversation history
  const existingMsgs: Array<Record<string, unknown>> = JSON.parse(conv.messages || '[]')
  existingMsgs.push({
    direction: 'inbound',
    channel,
    text,
    timestamp: new Date().toISOString()
  })

  // 4. Generate Step-by-Step Intent-Aware Auto-Reply
  const currentState = conv.state || 'ASK_VEHICLE'
  const fn = leadFirstName(lead.name)
  const lowerMsg = text.toLowerCase().trim()
  let aiReplyText = ''
  let nextState = currentState

  let currentVehicle = ''
  let currentIncome = ''
  try {
    const parsedAns = JSON.parse(lead.answers || '{}')
    currentVehicle = parsedAns.vehicle || ''
    currentIncome = parsedAns.income || ''
  } catch {}

  // Detect vehicle in message
  if (isVehicleLike(text) && !isQuestionLike(text)) {
    currentVehicle = text.trim()
  }

  // Detect income in message
  if (isIncomeLike(text)) {
    const incomeMatch = text.match(/\$?\d{3,6}/)
    currentIncome = incomeMatch ? incomeMatch[0] : text.trim()
  }

  // Save updated answers to lead
  try {
    const updatedAns: Record<string, string> = {}
    if (currentVehicle) updatedAns.vehicle = currentVehicle
    if (currentIncome) updatedAns.income = currentIncome
    await db.lead.update({
      where: { id: lead.id },
      data: { answers: JSON.stringify(updatedAns), status: 'replied' }
    })
  } catch {}

  // Intent A: Location / Address inquiry
  if (lowerMsg.includes('location') || lowerMsg.includes('address') || lowerMsg.includes('where are you') || lowerMsg.includes('where is your office')) {
    aiReplyText = fn
      ? `Hi ${fn}, our main showroom is at 4500 Oak Street with nationwide delivery across Canada. What vehicle or monthly budget are you looking for?`
      : `Our main showroom is located at 4500 Oak Street with nationwide delivery. What vehicle or monthly budget are you looking for?`
    nextState = currentVehicle ? 'ASK_INCOME' : 'ASK_VEHICLE'
  }
  // Intent B: Credit / Bankruptcy / Approval inquiry
  else if (lowerMsg.includes('bad credit') || lowerMsg.includes('bankruptcy') || lowerMsg.includes('credit score') || lowerMsg.includes('rate') || lowerMsg.includes('new to canada')) {
    aiReplyText = fn
      ? `No problem at all ${fn} — we work with RBC, TD, SDA, and AI Auto to get approvals for all credit types! What is your estimated gross monthly income?`
      : `No problem at all — we work with top lenders to get approvals for all credit types! What is your estimated gross monthly income?`
    nextState = 'ASK_INCOME'
  }
  // STEP 2: Lead provided Income AND we already have Vehicle -> FINAL PRE-APPROVAL HANDOFF!
  else if (currentIncome && (currentState === 'ASK_INCOME' || isIncomeLike(text))) {
    aiReplyText = fn
      ? `Thank you ${fn} — You are Pre-Approved for up to $50,000!\n\nOur finance coordinator Ayesha will contact you shortly to go over your vehicle options and complete the approval.\n\nKindly save her contact and expect her call from:\n437-535-3576`
      : `You are Pre-Approved for up to $50,000!\n\nOur finance coordinator Ayesha will contact you shortly to go over your vehicle options and complete the approval.\n\nKindly save her contact and expect her call from:\n437-535-3576`
    nextState = 'QUALIFIED'
  }
  // STEP 1: Lead provided Vehicle (e.g., "20 civic") -> ASK FOR INCOME NEXT!
  else if (currentVehicle || isVehicleLike(text)) {
    const vName = currentVehicle || text.trim()
    aiReplyText = fn
      ? `Nice choice ${fn}! To get you approved for the ${vName}, what is your estimated gross monthly income (or weekly pay)?`
      : `Nice choice! To get you approved for the ${vName}, what is your estimated gross monthly income (or weekly pay)?`
    nextState = 'ASK_INCOME'
  }
  // Fallback: Ask for vehicle or income
  else {
    aiReplyText = fn
      ? `Got it ${fn}! What vehicle are you looking to finance, and what is your estimated monthly income?`
      : `Got it! What vehicle are you looking to finance, and what is your estimated monthly income?`
    nextState = 'ASK_INCOME'
  }

  // 5. Append outbound AI reply to conversation history
  existingMsgs.push({
    direction: 'outbound',
    channel,
    text: aiReplyText,
    timestamp: new Date().toISOString()
  })

  await db.conversation.update({
    where: { id: conv.id },
    data: {
      state: nextState,
      messages: JSON.stringify(existingMsgs),
      updatedAt: new Date()
    }
  })

  // 6. Dispatch Auto-Reply over active channel (WhatsApp, Email, or SIM Box SMS)
  if (channel === 'whatsapp' && phone) {
    try {
      await fetch('http://127.0.0.1:3002', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          tenantId,
          to: phone,
          message: aiReplyText
        })
      })
    } catch (err) {
      console.error('[AutoReply WhatsApp Error]:', err)
    }
  } else if (channel === 'email' && email) {
    const payload = generateHumanEmailPayload(fn || 'there')
    await sendMessage({
      channel: 'email',
      to: email,
      message: aiReplyText,
      emailPayload: {
        subject: `Re: ${payload.subject}`,
        body: aiReplyText.replace(/\n/g, '<br>'),
        textBody: aiReplyText
      },
      settings: { messageDelayMinMs: 0, messageDelayMaxMs: 0 }
    }).catch((err) => console.error('[AutoReply Email Error]:', err))
  } else if (channel === 'sms' && phone) {
    await sendMessage({
      channel: 'sms',
      to: phone,
      message: aiReplyText,
      stickyPort: port || lead.port || undefined,
      settings: { messageDelayMinMs: 0, messageDelayMaxMs: 0 }
    }).catch((err) => console.error('[AutoReply SMS Error]:', err))
  }

  return {
    success: true,
    replyText: aiReplyText,
    nextState,
    leadId: lead.id,
    conversationId: conv.id
  }
}
