// ===================== SKYLINE SIM BOX SMS SENDER =====================
// Ported from client's existing "New SMS Sender" system (intake-relay.js)
// Sends SMS via Skyline GoIP HTTP API (primary) + SMPP (fallback)
// Supports sticky port (same SIM replies to same customer)
//
// Hardware: Skyline GoIP device on local network (32 boards × 4 SIM slots = 128 SIMs)
// API: goip_post_sms.html endpoint with JSON body

export interface SkylineConfig {
  host: string         // e.g., "192.168.1.16"
  httpPort: number     // e.g., 80
  httpUser: string     // e.g., "root"
  httpPass: string     // e.g., "Sign4321$"
  smppPort?: number    // e.g., 20002 (default)
  smppUser?: string    // e.g., "leadsminer_in"
  smppPass?: string    // e.g., "Sign4321"
}

export interface SendSmsResult {
  success: boolean
  messageId?: string
  error?: string
  port?: string
  method?: 'http' | 'smpp' | 'send_node'
}

export function getBaseUrl(config: SkylineConfig): string {
  const host = String(config.host || '').trim()
  if (host.startsWith('http://') || host.startsWith('https://')) {
    return host.replace(/\/+$/, '')
  }
  return `http://${host}:${config.httpPort || 80}`
}

// ==================== SMPP SESSION MANAGEMENT ====================
// Single SMPP session per config — reused for all sends
interface SmppSessionState {
  session: any
  bound: boolean
  connecting: boolean
}

const smppSessions = new Map<string, SmppSessionState>()

function getSmppKey(config: SkylineConfig): string {
  return `${config.host}:${config.smppPort || 20002}`
}

async function connectSmpp(config: SkylineConfig): Promise<any> {
  const smpp = (await import('smpp')).default || (await import('smpp'))
  return new Promise((resolve, reject) => {
    const key = getSmppKey(config)
    const state = smppSessions.get(key) || { session: null, bound: false, connecting: false }
    state.connecting = true
    smppSessions.set(key, state)

    const session = smpp.connect({
      url: `smpp://${config.host}:${config.smppPort || 20002}`,
      auto_enquire_link: true,
      debug: false,
    })

    session.on('error', () => {
      state.session = null
      state.bound = false
      state.connecting = false
    })

    session.on('close', () => {
      state.session = null
      state.bound = false
      state.connecting = false
    })

    session.on('connect', () => {
      const user = config.smppUser || 'leadsminer_in'
      const pass = config.smppPass || 'Sign4321'

      session.bind_transmitter(
        {
          system_id: user,
          password: pass,
          system_type: '',
          interface_version: 0x34,
        },
        (pdu: any) => {
          state.connecting = false
          if (pdu.command_status === 0) {
            state.session = session
            state.bound = true
            resolve(session)
          } else {
            state.session = null
            state.bound = false
            reject(new Error('SMPP bind failed: ' + pdu.command_status))
          }
        },
      )
    })
  })
}

async function getSmppSession(config: SkylineConfig): Promise<smpp.Session> {
  const key = getSmppKey(config)
  const state = smppSessions.get(key)
  if (state?.session && state.bound) return state.session
  if (state?.connecting) {
    await new Promise((r) => setTimeout(r, 500))
    if (state.session && state.bound) return state.session
  }
  return connectSmpp(config)
}

async function sendSmsSMPP(config: SkylineConfig, to: string, text: string): Promise<void> {
  const session = await getSmppSession(config)
  const dst = normalizePhone(to)
  const msg = String(text || '').trim()

  return new Promise((resolve, reject) => {
    ;(session as any).submit_sm(
      {
        destination_addr: dst,
        dest_addr_ton: 1,
        dest_addr_npi: 1,
        source_addr_ton: 1,
        source_addr_npi: 1,
        short_message: msg,
      },
      (pdu: any) => {
        if (pdu && pdu.command_status === 0) resolve()
        else reject(new Error('submit_sm failed: ' + (pdu ? pdu.command_status : 'no_pdu')))
      },
    )
  })
}

// ==================== SKYLINE HTTP API (PRIMARY) ====================
// Ported exactly from intake-relay.js — uses goip_post_sms.html endpoint
async function sendSmsHttpPort(
  config: SkylineConfig,
  to: string,
  text: string,
  fromPort: string,
): Promise<{ ok: boolean; tid: number; raw?: string }> {
  const baseUrl = getBaseUrl(config)
  const url =
    `${baseUrl}/goip_post_sms.html` +
    `?username=${encodeURIComponent(config.httpUser)}` +
    `&password=${encodeURIComponent(config.httpPass)}` +
    `&version=1.1`

  const tid = Date.now()
  const body = {
    type: 'send-sms',
    task_num: 1,
    tasks: [
      {
        tid,
        from: String(fromPort || '').trim(),
        to: normalizePhone(to),
        sms: String(text || '').trim(),
        chs: 'utf8',
        coding: 0,
      },
    ],
  }

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })

  const t = await r.text().catch(() => '')
  if (!r.ok) throw new Error('HTTP send failed ' + r.status + ' ' + t.slice(0, 180))

  return { ok: true, tid, raw: t }
}

// ==================== SEND-NODE CONTROL (OPTIONAL) ====================
// If user is running the old send-node (port 3010), use it for port-hold + force-switch
// Otherwise skip — direct HTTP send to Skyline works fine
async function sendViaSendNode(
  sendNodeBase: string,
  secret: string,
  to: string,
  text: string,
  fromPort: string,
  holdMs: number = 25000,
): Promise<{ ok: boolean; error?: string }> {
  const url =
    `${sendNodeBase}/send` +
    `?key=${encodeURIComponent(secret)}` +
    `&port=${encodeURIComponent(fromPort)}` +
    `&to=${encodeURIComponent(normalizePhone(to))}` +
    `&text=${encodeURIComponent(String(text || ''))}` +
    `&ms=${encodeURIComponent(String(holdMs))}`

  const r = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(15000) })
  const t = await r.text().catch(() => '')
  if (!r.ok) throw new Error('send-node /send HTTP ' + r.status + ' ' + t.slice(0, 160))

  let j: any = null
  try { j = JSON.parse(t) } catch {}
  if (!j || !j.ok) throw new Error('send-node /send failed: ' + (j?.error || t.slice(0, 160)))

  return { ok: true }
}

// ==================== MAIN SEND FUNCTION ====================
/**
 * Send SMS via Skyline SIM Box
 *
 * Logic (ported from intake-relay.js):
 * 1. If stickyPort provided → try HTTP send to that exact port
 * 2. If that fails → fallback to SMPP send
 * 3. If no stickyPort → use SMPP directly
 *
 * Returns success with method used (http/smpp) and port
 */
export async function sendSkylineSms(
  config: SkylineConfig,
  to: string,
  message: string,
  stickyPort?: string,
  sendNodeConfig?: { baseUrl: string; secret: string },
): Promise<SendSmsResult> {
  const phone = normalizePhone(to)
  if (!phone) {
    return { success: false, error: 'Invalid phone number' }
  }

  const msg = String(message || '').trim()
  if (!msg) {
    return { success: false, error: 'Empty message' }
  }

  // Path 1: Sticky port → try send-node first (if configured), then HTTP direct
  if (stickyPort) {
    const port = String(stickyPort).trim()

    // Try send-node first (it handles board-hold + force-switch)
    if (sendNodeConfig) {
      try {
        await sendViaSendNode(sendNodeConfig.baseUrl, sendNodeConfig.secret, phone, msg, port)
        return {
          success: true,
          messageId: `sn_${Date.now()}`,
          port,
          method: 'send_node',
        }
      } catch (e) {
        console.warn(`[Skyline] send-node failed, trying direct HTTP:`, (e as Error).message)
        // Fall through to direct HTTP
      }
    }

    // Direct HTTP send to Skyline (force exact port)
    try {
      const result = await sendSmsHttpPort(config, phone, msg, port)
      return {
        success: true,
        messageId: `http_${result.tid}`,
        port,
        method: 'http',
      }
    } catch (e) {
      console.warn(`[Skyline] HTTP send to port ${port} failed, trying SMPP fallback:`, (e as Error).message)
      // Fall through to SMPP
    }
  }

  // Path 2: SMPP send (fallback or no sticky port)
  try {
    await sendSmsSMPP(config, phone, msg)
    return {
      success: true,
      messageId: `smpp_${Date.now()}`,
      port: stickyPort || undefined,
      method: 'smpp',
    }
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message || 'SMS send failed (HTTP + SMPP both failed)',
      port: stickyPort,
    }
  }
}

// ==================== INBOUND PARSING ====================
/**
 * Extract real user message and SIM port from Skyline inbound blob
 * Skyline sends multi-line content like:
 *   "1\nReceiver: 1.04\nSMSC: +1234567890\n..."
 * We need to extract the actual user message and the receiver port
 */
export function parseSkylineInbound(input: unknown): {
  phone?: string
  message: string
  port?: string
} {
  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>
    const rawPhone = String(obj.src_num || obj.phone || obj.from || '').trim()
    const rawPort = String(obj.port || obj.receiver || obj.from_port || '').trim()
    const rawMsg = String(obj.msg || obj.sms || obj.text || obj.content || '').trim()

    return {
      phone: rawPhone ? normalizePhone(rawPhone) : undefined,
      message: rawMsg,
      port: rawPort || undefined,
    }
  }

  const rawContent = String(input || '')
  const lines = rawContent.split('\n').map((l) => l.trim()).filter(Boolean)
  let port: string | undefined
  let phone: string | undefined
  const messageLines: string[] = []

  for (const line of lines) {
    // Extract port from "Receiver: 1.04" format
    const portMatch = line.match(/(?:Receiver|Port):\s*([\d.]+)/i)
    if (portMatch) {
      port = portMatch[1]
      continue
    }

    const phoneMatch = line.match(/(?:From|Sender|src_num):\s*([\d+-]+)/i)
    if (phoneMatch) {
      phone = normalizePhone(phoneMatch[1])
      continue
    }

    // Skip metadata lines
    if (/^(SMSC|Receiver|Port|SIM|Modem|From|To|Date|Time):/i.test(line)) continue
    if (/^\d{4}-\d{2}-\d{2}/.test(line)) continue // date
    if (/^\d{2}:\d{2}:\d{2}/.test(line)) continue // time

    messageLines.push(line)
  }

  return {
    phone,
    message: messageLines.join(' ').trim() || rawContent.trim(),
    port,
  }
}

// ==================== PHONE NORMALIZATION ====================
/**
 * Normalize phone number to US/Canada format (11 digits starting with 1)
 * Examples:
 *   "+1 (555) 123-4567" → "15551234567"
 *   "5551234567"        → "15551234567"
 *   "2345678901"        → "12345678901"
 */
export function normalizePhone(phone: string): string {
  let d = String(phone || '').replace(/[^\d]/g, '')
  if (!d) return ''
  if (d.length === 10) d = '1' + d
  if (d.length > 11) d = '1' + d.slice(-10)
  return d
}

// ==================== CONNECTION TEST ====================
/**
 * Test Skyline connection by hitting the management page
 */
export async function testSkylineConnection(config: SkylineConfig): Promise<{
  alive: boolean
  error?: string
  httpOk?: boolean
  smppOk?: boolean
}> {
  let httpOk = false
  let smppOk = false
  let error: string | undefined

  // Test HTTP
  try {
    const baseUrl = getBaseUrl(config)
    const authHeader = 'Basic ' + Buffer.from(`${config.httpUser}:${config.httpPass}`).toString('base64')
    const response = await fetch(`${baseUrl}/`, {
      method: 'GET',
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(10000),
    })
    httpOk = response.ok || response.status < 500
  } catch (e) {
    error = (e as Error).message
  }

  // Test SMPP (optional)
  try {
    const session = await getSmppSession(config)
    smppOk = !!session
    // Don't close — keep session alive for future sends
  } catch (e) {
    // SMPP failed, but HTTP might still work
    if (!error) error = (e as Error).message
  }

  return {
    alive: httpOk || smppOk,
    httpOk,
    smppOk,
    error: !httpOk && !smppOk ? error : undefined,
  }
}

// ==================== PORT MANAGEMENT ====================
/**
 * Hold a specific port on send-node (pause other sends to that port)
 * Only works if send-node is running
 */
export async function holdPort(
  sendNodeBase: string,
  port: string,
  secret: string,
  holdMs: number = 25000,
): Promise<void> {
  try {
    const url = `${sendNodeBase}/hold?key=${encodeURIComponent(secret)}&port=${encodeURIComponent(port)}&ms=${holdMs}`
    await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) })
  } catch (error) {
    console.error('[Skyline] Port hold error:', error)
  }
}

// ==================== DNC (DO NOT CALL) HELPERS ====================
/**
 * Check if a phone number is in the DNC list
 */
export function isDncNumber(phone: string, dncList: string[]): boolean {
  const normalized = normalizePhone(phone)
  return dncList.includes(normalized)
}
