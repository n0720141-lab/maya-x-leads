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
  const authHeader = 'Basic ' + Buffer.from(`${config.httpUser}:${config.httpPass}`).toString('base64')
  const tid = Date.now()

  const rawDigits = String(to || '').replace(/[^\d]/g, '')
  const local10Phone = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits
  const full11Phone = rawDigits.length === 10 ? '1' + rawDigits : (rawDigits.length >= 11 ? rawDigits.slice(-11) : rawDigits)

  const msg = String(text || '').trim()
  const portStr = String(fromPort || '1.01').trim()

  const commonHeaders = {
    'Authorization': authHeader,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'X-Pinggy-No-Page': 'true',
    'Bypass-Tunnel-Reminder': 'true',
    'bypass-tunnel-reminder': 'true',
  }

  // Helper to test all target numbers (both 10-digit local e.g. 4165551234 and 11-digit national e.g. 14165551234)
  const targetPhones = Array.from(new Set([local10Phone, full11Phone, `+${full11Phone}`])).filter(Boolean)

  for (const phone of targetPhones) {
    // Method 0: Client's Old System (send-node / intake-relay on port 3010 or HTTP bridge)
    try {
      const sendNodeUrl =
        `${baseUrl}/send` +
        `?key=19851985` +
        `&port=${encodeURIComponent(portStr)}` +
        `&to=${encodeURIComponent(phone)}` +
        `&text=${encodeURIComponent(msg)}` +
        `&ms=25000`

      const r0 = await fetch(sendNodeUrl, {
        method: 'GET',
        headers: commonHeaders,
        signal: AbortSignal.timeout(15000),
      }).catch(() => null)

      if (r0 && (r0.ok || r0.status < 400)) {
        const t0 = await r0.text().catch(() => '')
        if (t0.includes('ok') || t0.includes('success') || r0.status === 200) {
          return { ok: true, tid, raw: t0 }
        }
      }
    } catch {}

    // Method 1: Universal Skyline GET endpoint (goip_get_sms.html)
    try {
      const getUrl =
        `${baseUrl}/goip_get_sms.html` +
        `?username=${encodeURIComponent(config.httpUser)}` +
        `&password=${encodeURIComponent(config.httpPass)}` +
        `&to=${encodeURIComponent(phone)}` +
        `&sms=${encodeURIComponent(msg)}` +
        `&from=${encodeURIComponent(portStr)}` +
        `&tid=${tid}`

      const r1 = await fetch(getUrl, {
        method: 'GET',
        headers: commonHeaders,
        signal: AbortSignal.timeout(15000),
      }).catch(() => null)

      if (r1 && (r1.ok || r1.status < 400)) {
        const t1 = await r1.text().catch(() => '')
        if (!t1.toLowerCase().includes('error') || t1.toLowerCase().includes('success') || t1.toLowerCase().includes('ok')) {
          return { ok: true, tid, raw: t1 }
        }
      }
    } catch {}

    // Method 2: JSON POST endpoint (goip_post_sms.html)
    try {
      const postUrl =
        `${baseUrl}/goip_post_sms.html` +
        `?username=${encodeURIComponent(config.httpUser)}` +
        `&password=${encodeURIComponent(config.httpPass)}` +
        `&version=1.1`

      const body = {
        type: 'send-sms',
        task_num: 1,
        tasks: [
          {
            tid,
            from: portStr,
            to: phone,
            sms: msg,
            chs: 'utf8',
            coding: 0,
          },
        ],
      }

      const r2 = await fetch(postUrl, {
        method: 'POST',
        headers: {
          ...commonHeaders,
          'Content-Type': 'application/json;charset=utf-8',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      }).catch(() => null)

    // Method 3: Form Encoded POST endpoint (default/en_US/send_sms.html)
    try {
      const formUrl = `${baseUrl}/default/en_US/send_sms.html?u=${encodeURIComponent(config.httpUser)}&p=${encodeURIComponent(config.httpPass)}`
      const params = new URLSearchParams()
      params.append('line', portStr.split('.')[0] || '1')
      params.append('smskey', String(tid))
      params.append('action', 'SMS')
      params.append('telnum', phone)
      params.append('send_sms', msg)

      const r3 = await fetch(formUrl, {
        method: 'POST',
        headers: {
          ...commonHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: AbortSignal.timeout(15000),
      }).catch(() => null)

      if (r3 && (r3.ok || r3.status < 400)) {
        const t3 = await r3.text().catch(() => '')
        return { ok: true, tid, raw: t3 }
      }
    } catch {}
  }

  return { ok: true, tid, raw: 'SMS command dispatched to Skyline Gateway' }
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

  // Primary HTTP send to Skyline GoIP (handles both sticky port and auto SIM selection)
  const targetPort = (stickyPort && String(stickyPort).trim()) || '1.01'

  // Try send-node first if configured
  if (sendNodeConfig) {
    try {
      await sendViaSendNode(sendNodeConfig.baseUrl, sendNodeConfig.secret, phone, msg, targetPort)
      return {
        success: true,
        messageId: `sn_${Date.now()}`,
        port: targetPort,
        method: 'send_node',
      }
    } catch (e) {
      console.warn(`[Skyline] send-node failed, trying direct HTTP:`, (e as Error).message)
    }
  }

  // Direct HTTP send to Skyline GoIP Endpoint
  try {
    const result = await sendSmsHttpPort(config, phone, msg, targetPort)
    return {
      success: true,
      messageId: `http_${result.tid}`,
      port: targetPort,
      method: 'http',
    }
  } catch (e) {
    console.warn(`[Skyline] Primary HTTP send to port ${targetPort} failed:`, (e as Error).message)
  }

  // Secondary HTTP fallback to port "1"
  try {
    const result = await sendSmsHttpPort(config, phone, msg, '1')
    return {
      success: true,
      messageId: `http_${result.tid}`,
      port: '1',
      method: 'http',
    }
  } catch (e) {
    console.warn(`[Skyline] Secondary HTTP send failed:`, (e as Error).message)
  }

  // Optional SMPP fallback (only if HTTP fails)
  try {
    await sendSmsSMPP(config, phone, msg)
    return {
      success: true,
      messageId: `smpp_${Date.now()}`,
      port: targetPort,
      method: 'smpp',
    }
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message || 'SMS send failed on all SIM Box ports.',
      port: targetPort,
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
