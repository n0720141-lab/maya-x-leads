// ===================== DEEPSEEK AI INTEGRATION =====================
// Ported and enhanced from client's old system (intake-relay.js)
// Uses same DeepSeek API key (sk-f5f4724e... from deepseek.key file)
// Two main functions:
//   1. callDeepSeek — generic chat completion
//   2. extractAndReply — analyze inbound SMS, extract answers, decide next reply
//   3. finalReconcile — verify collected answers before pushing to CRM

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface DeepSeekResponse {
  success: boolean
  reply: string | null
  error?: string
  usage?: { promptTokens: number; completionTokens: number }
}

export interface ExtractResult {
  interest: 'interested' | 'not_interested' | 'neutral'
  answered_vehicle: boolean
  answered_income: boolean
  next_state: 'IDLE' | 'ASK_VEHICLE' | 'ASK_INCOME' | 'DONE' | null
  should_reply: boolean
  answers: { vehicle: string | null; income: string | null }
  notes: string[]
  reply: string | null
}

// ==================== SYSTEM PROMPT BUILDER ====================
export function buildSystemPrompt(
  botConfig: Record<string, unknown>,
  questions: Record<string, unknown>[],
): string {
  const qList = questions
    .sort((a, b) => (a.order as number) - (b.order as number))
    .map((q, i) => `  ${i + 1}. ${q.text}${q.required ? ' (required)' : ''}${q.options ? ` Options: ${q.options}` : ''}`)
    .join('\n')

  return `You are ${botConfig.botName || 'Maya'}, an AI ${botConfig.role || 'Online Sales Assistant'}.

PERSONALITY & TONE:
- Personality: ${botConfig.personality || 'Friendly & Professional'}
- Tone: ${botConfig.tone || 'Conversational'}
- Language: ${botConfig.language || 'en'}
- Timezone: ${botConfig.timezone || 'America/Toronto'}

${botConfig.openingMessage ? `OPENING MESSAGE: ${botConfig.openingMessage}\n` : ''}${botConfig.instructions ? `INSTRUCTIONS:\n${botConfig.instructions}\n` : ''}${botConfig.knowledgeBase ? `KNOWLEDGE BASE:\n${botConfig.knowledgeBase}\n` : ''}${qList ? `QUALIFICATION QUESTIONS TO ASK (in order):\n${qList}\n\nRULES FOR QUESTIONS:\n- Ask questions one at a time, naturally in conversation flow.\n- If a question is required, gently persist if the lead avoids it.\n- Stop asking questions once all required ones are answered.\n- Adapt your approach based on the lead's responses.` : ''}

GENERAL RULES:
- Be concise but warm. Keep messages under 160 characters when possible.
- Never reveal you are an AI unless asked directly.
- If the lead asks something outside your knowledge, politely redirect to a human agent.
- Always maintain a professional yet approachable demeanor.
- Remember context from earlier in the conversation.`
}

// ==================== GENERIC CHAT COMPLETION ====================
export async function callDeepSeek(
  messages: ChatMessage[],
  apiKey: string,
): Promise<DeepSeekResponse> {
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.7,
        max_tokens: 500,
        messages,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      return { success: false, reply: null, error: `DeepSeek API error ${res.status}: ${errBody}` }
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content || null
    const usage = data.usage
      ? { promptTokens: data.usage.prompt_tokens || 0, completionTokens: data.usage.completion_tokens || 0 }
      : undefined

    return { success: true, reply, usage }
  } catch (error) {
    return {
      success: false,
      reply: null,
      error: error instanceof Error ? error.message : 'Unknown error calling DeepSeek.',
    }
  }
}

// ==================== EXTRACT AND REPLY (PORTED FROM OLD SYSTEM) ====================
/**
 * Analyze inbound SMS message and decide next action.
 * Returns strict JSON with:
 *  - interest: is the lead interested?
 *  - answers: extracted vehicle/income (if any)
 *  - notes: helpful details (trade-in, down payment, etc.)
 *  - reply: next message to send (or null if no reply)
 *  - next_state: which question to ask next
 *
 * Ported from intake-relay.js — same prompt + JSON schema
 */
export async function extractAndReply(params: {
  leadFirstName?: string
  state: string
  history: { role: string; content: string }[]
  msg: string
  apiKey: string
  knowledgeBase?: string
}): Promise<ExtractResult | null> {
  const { leadFirstName, state, history, msg, apiKey, knowledgeBase } = params

  if (!apiKey) return null

  const prompt = [
    'You are assisting an SMS auto-finance intake bot.',
    'Main goal: decide whether this inbound is from a real buyer / finance lead, extract the best answers, and decide the ONE next reply.',
    '',
    'Return ONLY strict JSON with this schema:',
    '{',
    '  "interest": "interested|not_interested|neutral",',
    '  "answered_vehicle": boolean,',
    '  "answered_income": boolean,',
    '  "next_state": "IDLE|ASK_VEHICLE|ASK_INCOME|DONE|null",',
    '  "should_reply": boolean,',
    '  "answers": { "vehicle": string|null, "income": string|null },',
    '  "notes": string[],',
    '  "reply": string|null',
    '}',
    '',
    'Rules:',
    '- Use common sense. Decide whether the user is buyer-leaning or not.',
    '- In this business, questions about vehicles, SUV, truck, van, financing, approval, bad credit, rates, payments, down payment, trade-in, inventory, availability, location, address, documents, license, bankruptcy, proposal, newcomers, students are POSITIVE buyer intent unless clearly negated.',
    '- Treat these as automatic positive intent examples: yes, yeah, yup, ok, okay, sure, location, address, trade, rate, rates, bad credit, approval, approved, finance, financing, car, suv, truck, van — when used in a buyer context.',
    '- If the inbound is only a year, make, model, or year+make+model by itself, treat it as automatic positive intent and as a vehicle answer.',
    '- Negative / stop-reply examples: wrong person, wrong number, not my name, who are you, how did you get my number, why are you texting so late, sarcasm, insults, hostile replies with no buying signal, I already have a vehicle with no buying signal, leave me alone, not interested, stop.',
    '- If a message contains BOTH concern and buying intent, treat it as interested, answer the concern briefly, then redirect to the current intake question.',
    '- Notes must capture helpful details (trade-in details, down payment, budget, credit situation, timing, questions asked).',
    '- Notes should be short phrases, no more than 10 notes.',
    '- If user is not interested / wrong number / stop -> interest=not_interested, should_reply=false, reply=null.',
    '- Ask at most ONE next-step reply per inbound. Never send multiple questions from one inbound.',
    '- If user asks a question, reply politely in the SAME ongoing tone (not a new intro), then redirect back to the CURRENT question or the one remaining main question.',
    '- Use the lead first name naturally if available, but do NOT over-greet every message.',
    '',
    'Current state/question:',
    state,
    '',
    'Lead first name (may be blank):',
    leadFirstName || '',
    '',
    'Recent history (most recent last):',
    JSON.stringify(history || []).slice(0, 4000),
    '',
    'New inbound message:',
    msg || '',
  ].join('\n')

  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: (knowledgeBase || '').slice(0, 12000) || 'You are a helpful SMS assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.35,
        max_tokens: 450,
      }),
    })

    if (!resp.ok) {
      const t = await resp.text().catch(() => '')
      console.error('[DeepSeek] extractAndReply HTTP error:', resp.status, t.slice(0, 200))
      return null
    }

    const data = await resp.json().catch(() => null)
    const raw = data?.choices?.[0]?.message?.content ? String(data.choices[0].message.content) : ''
    const trimmed = raw.trim()

    // Strip code fences if present
    const clean = trimmed
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    try {
      const parsed = JSON.parse(clean)
      return {
        interest: parsed.interest || 'neutral',
        answered_vehicle: !!parsed.answered_vehicle,
        answered_income: !!parsed.answered_income,
        next_state: parsed.next_state || null,
        should_reply: parsed.should_reply !== false,
        answers: {
          vehicle: parsed.answers?.vehicle || null,
          income: parsed.answers?.income || null,
        },
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        reply: parsed.reply || null,
      }
    } catch (e) {
      console.error('[DeepSeek] JSON parse fail:', (e as Error).message, '| raw:', clean.slice(0, 200))
      return null
    }
  } catch (error) {
    console.error('[DeepSeek] extractAndReply error:', error)
    return null
  }
}

// ==================== FINAL RECONCILE (VERIFY ANSWERS BEFORE CRM PUSH) ====================
/**
 * Before pushing lead data to CRM webhook, verify all collected answers
 * with DeepSeek to catch any AI extraction errors.
 *
 * Ported from intake-relay.js — finalReconcileSession
 */
export async function finalReconcile(params: {
  leadFirstName?: string
  history: { role: string; content: string }[]
  currentAnswers: { vehicle?: string; income?: string }
  currentNotes: string[]
  apiKey: string
  knowledgeBase?: string
}): Promise<{
  vehicle: string
  income: string
  notes: string[]
}> {
  const { leadFirstName, history, currentAnswers, currentNotes, apiKey, knowledgeBase } = params

  if (!apiKey) {
    return {
      vehicle: currentAnswers.vehicle || '',
      income: currentAnswers.income || '',
      notes: currentNotes,
    }
  }

  const prompt = [
    'You are verifying lead data before pushing to CRM.',
    'Look at the full conversation and verify/complete the answers.',
    '',
    'Return ONLY strict JSON:',
    '{',
    '  "vehicle": string,',
    '  "income": string,',
    '  "notes": string[]',
    '}',
    '',
    'Lead first name:',
    leadFirstName || '',
    '',
    'Current collected answers:',
    JSON.stringify(currentAnswers),
    '',
    'Current notes:',
    JSON.stringify(currentNotes),
    '',
    'Full conversation history:',
    JSON.stringify(history || []).slice(0, 6000),
  ].join('\n')

  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: (knowledgeBase || '').slice(0, 12000) || 'You verify lead data.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    })

    if (!resp.ok) {
      return {
        vehicle: currentAnswers.vehicle || '',
        income: currentAnswers.income || '',
        notes: currentNotes,
      }
    }

    const data = await resp.json().catch(() => null)
    const raw = data?.choices?.[0]?.message?.content ? String(data.choices[0].message.content) : ''
    const clean = raw.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    try {
      const parsed = JSON.parse(clean)
      return {
        vehicle: parsed.vehicle || currentAnswers.vehicle || '',
        income: parsed.income || currentAnswers.income || '',
        notes: Array.isArray(parsed.notes) ? parsed.notes : currentNotes,
      }
    } catch {
      return {
        vehicle: currentAnswers.vehicle || '',
        income: currentAnswers.income || '',
        notes: currentNotes,
      }
    }
  } catch {
    return {
      vehicle: currentAnswers.vehicle || '',
      income: currentAnswers.income || '',
      notes: currentNotes,
    }
  }
}

// ==================== CHAT HISTORY BUILDER ====================
export function buildChatHistory(
  dbMessages: { direction: string; content: string }[],
  systemPrompt: string,
): ChatMessage[] {
  const history: ChatMessage[] = [{ role: 'system', content: systemPrompt }]
  const recent = dbMessages.slice(-20)
  for (const msg of recent) {
    const role = msg.direction === 'inbound' ? 'user' : 'assistant'
    history.push({ role, content: msg.content })
  }
  return history
}
