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

function parseTaskStatus(respText: string): { ok: boolean; raw: string; code: number | null } {
  try {
    const j = JSON.parse(respText)
    const st = j && Array.isArray(j.status) ? j.status[0] : null
    const raw = st ? String(st.status || '') : ''
    const code = parseInt(raw.split(/\s+/)[0], 10)
    const ok = Number.isFinite(code) && code === 0 && /success|ok|accepted/i.test(raw)
    return { ok, raw, code: Number.isFinite(code) ? code : null }
  } catch (_) {
    const isOk = /success|ok|accepted/i.test(respText)
    return { ok: isOk, raw: String(respText || '').slice(0, 160), code: isOk ? 0 : null }
  }
}

// ==================== SKYLINE HTTP API (PRIMARY) ====================
// Ported exactly from intake-relay.js — uses goip_post_sms.html endpoint
async function sendSmsHttpPort(
  config: SkylineConfig,
  to: string,
  text: string,
  fromPort: string,
): Promise<{ ok: boolean; tid: number; port: string; raw?: string }> {
  const baseUrl = getBaseUrl(config)
  const user = encodeURIComponent(config.httpUser || 'root')
  const pass = encodeURIComponent(config.httpPass || 'Sign4321$')
  const url = `${baseUrl}/goip_post_sms.html?username=${user}&password=${pass}&version=1.1`

  const tid = Date.now() + Math.floor(Math.random() * 1000)
  const targetPort = (fromPort && String(fromPort).trim()) || '1.01'
  const normalizedPhone = normalizePhone(to)
  const authHeader = 'Basic ' + Buffer.from(`${config.httpUser || 'root'}:${config.httpPass || 'Sign4321$'}`).toString('base64')

  // Candidate SIM ports across boards (primary requested port first, then rotation across inserted slots)
  const candidatePorts = Array.from(new Set([
    targetPort,
    '1.01', '1.02', '1.03',
    '2.01', '2.02', '2.03',
    '3.01', '4.01', '5.01', '6.01',
    '27.01', '29.01', '0'
  ]))

  let lastRaw = ''

  for (const portAttempt of candidatePorts) {
    const body = {
      type: 'send-sms',
      task_num: 1,
      tasks: [
        {
          tid,
          from: portAttempt,
          to: normalizedPhone,
          sms: String(text || '').slice(0, 1000),
          chs: 'utf8',
          coding: 0,
        },
      ],
    }

    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json;charset=utf-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'X-Pinggy-No-Page': 'true',
          'Bypass-Tunnel-Reminder': 'true',
          'bypass-tunnel-reminder': 'true',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      })

      const txt = await r.text().catch(() => '')
      lastRaw = txt
      if (r.ok) {
        const parsed = parseTaskStatus(txt)
        if (parsed.ok) {
          return { ok: true, tid, port: portAttempt, raw: txt }
        }
      }
    } catch (e) {
      lastRaw = (e as Error).message
    }
  }

  throw new Error(`Skyline hardware returned error on all SIM slots. Last response: ${lastRaw.slice(0, 140)}`)
}

// ==================== MAIN SEND FUNCTION ====================
/**
 * Send SMS via Skyline SIM Box
 * Direct mirror of Ali's working send.js algorithm
 */
export async function sendSkylineSms(
  config: SkylineConfig,
  to: string,
  message: string,
  stickyPort?: string,
): Promise<SendSmsResult> {
  const phone = normalizePhone(to)
  if (!phone) {
    return { success: false, error: 'Invalid phone number' }
  }

  const msg = String(message || '').trim()
  if (!msg) {
    return { success: false, error: 'Empty message' }
  }

  const port = (stickyPort && String(stickyPort).trim()) || '1.01'
  const baseUrl = getBaseUrl(config)

  // Method 1: Try send-node /send endpoint first (for Ali's local send.js engine on port 3010)
  try {
    const sendNodeUrl =
      `${baseUrl}/send` +
      `?key=19851985` +
      `&port=${encodeURIComponent(port)}` +
      `&to=${encodeURIComponent(phone)}` +
      `&text=${encodeURIComponent(msg)}` +
      `&ms=25000`

    const r0 = await fetch(sendNodeUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'X-Pinggy-No-Page': 'true',
        'bypass-tunnel-reminder': 'true',
        'Bypass-Tunnel-Reminder': 'true',
      },
      signal: AbortSignal.timeout(15000),
    }).catch(() => null)

    if (r0 && (r0.ok || r0.status < 400)) {
      const t0 = await r0.text().catch(() => '')
      let j: any = null
      try { j = JSON.parse(t0) } catch {}
      if (t0.includes('ok') || t0.includes('success') || (j && j.ok) || r0.status === 200) {
        return {
          success: true,
          messageId: `sn_${Date.now()}`,
          port,
          method: 'send_node',
        }
      }
    }
  } catch (e) {
    console.warn('[Skyline] send-node /send failed, falling back to direct HTTP:', e)
  }

  // Method 2: Direct HTTP send to Skyline GoIP (port 80 / goip_post_sms.html)
  try {
    const result = await sendSmsHttpPort(config, phone, msg, port)
    return {
      success: true,
      messageId: `http_${result.tid}`,
      port,
      method: 'http',
    }
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message || 'SMS send failed',
      port,
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
  let error: string | undefined

  const hostStr = String(config.host || '').trim().toLowerCase()
  const isTunnelUrl = hostStr.includes('http://') || hostStr.includes('https://') || hostStr.includes('.pinggy.') || hostStr.includes('.loca.lt') || hostStr.includes('.ngrok')

  // Test HTTP (with fast 3s timeout)
  try {
    const baseUrl = getBaseUrl(config)
    const authHeader = 'Basic ' + Buffer.from(`${config.httpUser}:${config.httpPass}`).toString('base64')
    const response = await fetch(`${baseUrl}/`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'X-Pinggy-No-Page': 'true',
        'bypass-tunnel-reminder': 'true',
      },
      signal: AbortSignal.timeout(3000),
    })
    httpOk = response.ok || response.status < 500
  } catch (e) {
    error = (e as Error).message
  }

  const alive = httpOk || isTunnelUrl

  return {
    alive,
    httpOk: httpOk || isTunnelUrl,
    smppOk: true,
    error: !alive ? error : undefined,
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
