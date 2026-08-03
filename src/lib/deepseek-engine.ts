import { db } from '@/lib/db'
import { extractAndReply, callDeepSeek } from './deepseek'
import { processInboundAutoReply } from './messaging/auto-reply'

export interface DeepSeekEngineParams {
  tenantId: string
  phone?: string
  email?: string
  text: string
  channel: 'whatsapp' | 'sms' | 'email'
  port?: string
  apiKey?: string
}

/**
 * Main Smart AI Auto-Reply Handler
 * 1. Checks for Opt-Out / Stop / Not Interested signals first (No spam back!).
 * 2. Fetches DeepSeek API Key from BotConfig or GlobalConfig.
 * 3. Uses DeepSeek AI (`extractAndReply`) with full history and intent detection.
 * 4. Falls back to smart intent-aware rule engine if API Key is unavailable.
 */
export async function executeAutoReplyEngine(params: DeepSeekEngineParams) {
  const { tenantId, phone, email, text, channel, port } = params
  const rawText = (text || '').trim()
  const lowerText = rawText.toLowerCase()

  // 1. Immediate Opt-Out & Stop Check (DO NOT SEND ANY SPAM BACK)
  const isStopSignal =
    ['stop', 'unsubscribe', 'cancel', 'end', 'quit'].includes(lowerText.replace(/[^\w]/g, '')) ||
    lowerText.includes('not interested') ||
    lowerText.includes('no interest') ||
    lowerText.includes('dont need') ||
    lowerText.includes("don't need") ||
    lowerText.includes('wrong number') ||
    lowerText.includes('wrong person') ||
    lowerText.includes('remove me') ||
    lowerText.includes('leave me alone') ||
    lowerText.includes('not looking')

  if (isStopSignal) {
    if (phone) {
      await db.lead.updateMany({ where: { phone, tenantId }, data: { status: 'dnc' } }).catch(() => {})
    }
    if (email) {
      await db.lead.updateMany({ where: { email, tenantId }, data: { status: 'dnc' } }).catch(() => {})
    }
    return {
      success: true,
      autoReplied: false,
      replyText: null,
      reason: 'Lead opted out / Not interested'
    }
  }

  // 2. Fetch DeepSeek API Key from BotConfig or GlobalConfig
  let apiKey = params.apiKey
  let botConfig: any = null
  try {
    botConfig = await db.botConfig.findUnique({ where: { tenantId } })
    apiKey = apiKey || botConfig?.aiApiKey
  } catch {}

  if (!apiKey) {
    try {
      const globalKey = await db.globalConfig.findUnique({ where: { key: 'deepseek_api_key' } })
      apiKey = globalKey?.value
    } catch {}
  }
  if (!apiKey) {
    try {
      const openaiKey = await db.globalConfig.findUnique({ where: { key: 'openai_api_key' } })
      apiKey = openaiKey?.value
    } catch {}
  }

  // 3. Find Lead & Conversation History
  let lead = phone ? await db.lead.findFirst({ where: { phone, tenantId } }) : null
  if (!lead && email) {
    lead = await db.lead.findFirst({ where: { email, tenantId } })
  }

  let conv = lead ? await db.conversation.findFirst({ where: { leadId: lead.id } }) : null
  const history: { role: string; content: string }[] = []

  if (conv?.messages) {
    try {
      const parsedMsgs = JSON.parse(conv.messages) as Array<{ direction: string; text: string }>
      for (const m of parsedMsgs.slice(-10)) {
        history.push({
          role: m.direction === 'inbound' ? 'user' : 'assistant',
          content: m.text || ''
        })
      }
    } catch {}
  }

  const leadFirstName = (lead?.name || '').trim().split(/\s+/)[0] || ''
  const currentState = conv?.state || 'IDLE'

  // 4. Run DeepSeek AI Engine (`extractAndReply`)
  if (apiKey) {
    try {
      const aiResult = await extractAndReply({
        leadFirstName,
        state: currentState,
        history,
        msg: rawText,
        apiKey,
        knowledgeBase: botConfig?.instructions || botConfig?.knowledgeBase || undefined
      })

      if (aiResult) {
        // If AI determined lead is not interested, mark DNC and do not reply
        if (aiResult.interest === 'not_interested' || !aiResult.should_reply) {
          if (lead) {
            await db.lead.update({ where: { id: lead.id }, data: { status: 'dnc' } }).catch(() => {})
          }
          return {
            success: true,
            autoReplied: false,
            replyText: null,
            reason: 'AI detected negative buying intent'
          }
        }

        // Save extracted answers (vehicle, income) to lead record if found
        if (lead && (aiResult.answers?.vehicle || aiResult.answers?.income)) {
          try {
            const existingAnswers = JSON.parse(lead.answers || '{}')
            if (aiResult.answers.vehicle) existingAnswers.vehicle = aiResult.answers.vehicle
            if (aiResult.answers.income) existingAnswers.income = aiResult.answers.income
            
            const existingNotes = JSON.parse(lead.notes || '[]')
            if (Array.isArray(aiResult.notes)) {
              for (const n of aiResult.notes) {
                if (!existingNotes.includes(n)) existingNotes.push(n)
              }
            }

            await db.lead.update({
              where: { id: lead.id },
              data: {
                answers: JSON.stringify(existingAnswers),
                notes: JSON.stringify(existingNotes),
                status: 'replied'
              }
            })
          } catch {}
        }

        if (aiResult.reply) {
          return {
            success: true,
            autoReplied: true,
            replyText: aiResult.reply,
            nextState: aiResult.next_state || currentState,
            method: 'deepseek_ai'
          }
        }
      }
    } catch (err) {
      console.error('[executeAutoReplyEngine] DeepSeek AI call failed:', err)
    }
  }

  // 5. Fallback to Smart Intent-Aware Rule Engine if AI Key is missing or failed
  const ruleResult = await processInboundAutoReply({ tenantId, phone, email, text: rawText, channel, port })
  return {
    success: ruleResult?.success || false,
    autoReplied: !!ruleResult?.replyText,
    replyText: ruleResult?.replyText || null,
    nextState: ruleResult?.nextState || 'ASK_INCOME',
    method: 'smart_rules'
  }
}
