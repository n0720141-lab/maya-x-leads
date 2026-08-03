// WhatsApp Micro-Service — runs separately on port 3002
// This isolates Baileys memory usage from Next.js
// Next.js API routes call this service via HTTP

import http from 'http'
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const PORT = 3002
const SESSIONS_DIR = path.join(process.cwd(), '.wa-sessions')

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true })
}

// Track active connections per sessionKey
const connections = new Map()  // sessionKey -> { socket, phone, connectedAt }
const pendingQR = new Map()    // sessionKey -> qrCode base64

function getSessionKey(tenantId, channelId = null) {
  return channelId ? `${tenantId}_${channelId}` : tenantId
}

function getSessionPath(sessionKey) {
  return path.join(SESSIONS_DIR, `wa_${sessionKey}`)
}

async function connectWhatsApp(tenantId, phoneNumber = null, channelId = null) {
  const sessionKey = getSessionKey(tenantId, channelId)
  // Check if already connected
  const existing = connections.get(sessionKey)
  if (existing) {
    return {
      status: 'connected',
      phone: existing.phone,
      connectedAt: existing.connectedAt,
    }
  }

  const sessionPath = getSessionPath(sessionKey)

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version } = await fetchLatestBaileysVersion()

    const socket = makeWASocket({
      version,
      auth: { creds: state.creds, keys: state.keys },
      printQRToTerminal: false,
      connectTimeoutMs: 30000,
      defaultQueryTimeoutMs: 30000,
      keepAliveIntervalMs: 60000,
      maxMsgRetryCount: 1,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
    })

    let resolved = false
    const usePairingCode = !!phoneNumber  // If phone number provided, use pairing code mode

    return await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          try { socket.end() } catch {}
          resolve({ status: 'error', error: 'Connection timeout. Please try again.' })
        }
      }, 60000)  // 60s timeout for pairing code (user needs time to enter code)

process.on('uncaughtException', (err) => {
  console.error('[WhatsApp Service] Uncaught exception (recovered):', err.message)
})

process.on('unhandledRejection', (reason) => {
  console.error('[WhatsApp Service] Unhandled rejection (recovered):', reason)
})

      socket.ev.on('creds.update', async () => {
        try {
          if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true })
          }
          await saveCreds()
        } catch (e) {
          // Ignore async write race conditions during folder resets
        }
      })

      // ============ PAIRING CODE FLOW ============
      if (usePairingCode) {
        let cleanPhone = String(phoneNumber).replace(/[^\d]/g, '')
        if (cleanPhone.startsWith('03') && cleanPhone.length === 11) {
          cleanPhone = '92' + cleanPhone.slice(1)
        }

        // Request pairing code after a brief delay for socket setup
        setTimeout(async () => {
          if (resolved || socket.authState.creds.registered) return
          try {
            console.log(`[WhatsApp Service] Requesting pairing code for ${cleanPhone} (session: ${sessionKey})`)
            const pairingCode = await socket.requestPairingCode(cleanPhone)
            console.log(`[WhatsApp Service] Pairing code generated: ${pairingCode} (session: ${sessionKey})`)
            pendingQR.set(sessionKey, pairingCode)
            resolved = true
            clearTimeout(timeout)
            resolve({
              status: 'pairing_code_ready',
              pairingCode: pairingCode,
              phoneNumber: cleanPhone,
            })
          } catch (err) {
            console.error('[WhatsApp Service] Pairing code error:', err.message)
            if (!resolved) {
              resolved = true
              clearTimeout(timeout)
              resolve({
                status: 'error',
                error: `Pairing code error: ${err.message}. Please use QR Scan mode.`,
              })
            }
          }
        }, 3000)
      }

      socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr && !resolved && !usePairingCode) {
          try {
            const qrImage = await QRCode.toDataURL(qr, {
              width: 300,
              margin: 2,
              color: { dark: '#000000', light: '#ffffff' },
            })
            pendingQR.set(sessionKey, qrImage)
            resolved = true
            clearTimeout(timeout)
            resolve({ status: 'qr_ready', qrCode: qrImage })
          } catch (err) {
            pendingQR.set(sessionKey, qr)
            resolved = true
            clearTimeout(timeout)
            resolve({ status: 'qr_ready', qrCode: qr })
          }
        }

        if (connection === 'open') {
          const phone = socket.user?.id?.split(':')[0] || state.creds.me?.id?.split(':')[0] || phoneNumber || 'Linked Device'
          const connectedAt = new Date().toISOString()
          console.log(`[WhatsApp Service] Connected successfully for ${sessionKey}! Phone: ${phone}`)
          connections.set(sessionKey, { socket, phone, connectedAt })
          pendingQR.delete(sessionKey)

          // Attach live inbound message listener for WhatsApp replies
          socket.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
            if (type !== 'notify') return
            for (const m of msgs) {
              if (m.key.fromMe) continue
              const fromPhone = m.key.remoteJid?.split('@')[0]?.replace(/[^\d]/g, '')
              const text = m.message?.conversation || m.message?.extendedTextMessage?.text
              if (!fromPhone || !text) continue

              console.log(`[WhatsApp Inbound] Received live reply from ${fromPhone}: "${text}"`)
              try {
                let lead = await prisma.lead.findFirst({
                  where: {
                    OR: [
                      { phone: { contains: fromPhone.slice(-10) } },
                      { phone: fromPhone }
                    ]
                  }
                })

                if (!lead) {
                  console.log(`[WhatsApp Inbound Ignored] ${fromPhone} is not in imported lead list. Auto-creation disabled.`)
                  continue
                }

                let conv = await prisma.conversation.findFirst({ where: { leadId: lead.id } })
                if (!conv) {
                  conv = await prisma.conversation.create({
                    data: {
                      leadId: lead.id,
                      tenantId: lead.tenantId,
                      channel: 'whatsapp',
                      activeChannel: 'whatsapp',
                      state: 'IDLE',
                      messages: JSON.stringify([])
                    }
                  })
                }

                if (conv) {
                    // 1. Save inbound message
                    const existingMsgs = JSON.parse(conv.messages || '[]')
                    existingMsgs.push({
                      direction: 'inbound',
                      channel: 'whatsapp',
                      text,
                      timestamp: new Date().toISOString()
                    })
                    await prisma.conversation.update({
                      where: { id: conv.id },
                      data: {
                        messages: JSON.stringify(existingMsgs),
                        updatedAt: new Date()
                      }
                    })
                    console.log(`[WhatsApp Inbound] Saved reply from ${lead.name || fromPhone} to DB!`)

                    // 2. Generate and dispatch Instant AI Auto-Reply (100% Exact Old System intake-relay.js logic)
                    const currentState = conv.state || 'IDLE'
                    const fn = (lead.name && lead.name !== 'Lead') ? lead.name.split(/\s+/)[0] : ''
                    let aiReplyText = ''
                    let nextState = 'ASK_INCOME'

                    // Extract vehicle answer if previously recorded
                    let currentVehicle = ''
                    try {
                      const parsedAnswers = JSON.parse(lead.answers || '{}')
                      currentVehicle = parsedAnswers.vehicle || ''
                    } catch {}

                    if (currentState === 'IDLE' || currentState === 'ASK_VEHICLE') {
                      const vehicle = text.trim()
                      if (vehicle) {
                        currentVehicle = vehicle
                        try {
                          await prisma.lead.update({
                            where: { id: lead.id },
                            data: { answers: JSON.stringify({ vehicle: currentVehicle }) }
                          })
                        } catch {}
                      }

                      if (fn && currentVehicle) {
                        aiReplyText = `Nice choice ${fn} — for the best financing option on the ${currentVehicle}, what is your monthly income?`
                      } else if (fn && !currentVehicle) {
                        aiReplyText = `Got it ${fn}, for the best financing option what is your monthly income?`
                      } else if (!fn && currentVehicle) {
                        aiReplyText = `Nice choice — for the best financing option on the ${currentVehicle}, what is your monthly income?`
                      } else {
                        aiReplyText = `Nice choice, for the best financing option, what is your monthly income?`
                      }
                      nextState = 'ASK_INCOME'
                    } else if (currentState === 'ASK_INCOME') {
                      const income = text.trim()
                      if (income) {
                        try {
                          const existingAns = JSON.parse(lead.answers || '{}')
                          existingAns.income = income
                          await prisma.lead.update({
                            where: { id: lead.id },
                            data: { answers: JSON.stringify(existingAns) }
                          })
                        } catch {}
                      }

                      aiReplyText = fn
                        ? `Thank you ${fn} — You are Pre-Approved for up to $50,000!\n\nOur finance coordinator Ayesha will contact you shortly to go over your vehicle options and complete the approval.\n\nKindly save her contact and expect her call from:\n437-535-3576`
                        : `You are Pre-Approved for up to $50,000!\n\nOur finance coordinator Ayesha will contact you shortly to go over your vehicle options and complete the approval.\n\nKindly save her contact and expect her call from:\n437-535-3576`
                      nextState = 'QUALIFIED'
                    } else {
                      aiReplyText = fn
                        ? `Thank you ${fn} — our finance coordinator Ayesha will contact you soon.\n\nKindly save her contact & expect her call from:\n437-535-3576`
                        : `Thank you — our finance coordinator Ayesha will contact you soon.\n\nKindly save her contact & expect her call from:\n437-535-3576`
                      nextState = 'QUALIFIED'
                    }

                    // Human typing presence simulation (8s to 16s delay like a real person reading and typing)
                    try {
                      await socket.sendPresenceUpdate('composing', m.key.remoteJid)
                    } catch {}
                    const humanTypingDelay = 8000 + Math.floor(Math.random() * 8000)
                    await new Promise((r) => setTimeout(r, humanTypingDelay))
                    try {
                      await socket.sendPresenceUpdate('paused', m.key.remoteJid)
                    } catch {}

                    // Send AI reply over WhatsApp socket in real-time
                    await socket.sendMessage(m.key.remoteJid, { text: aiReplyText }).catch((err) => {
                      console.error('[WhatsApp AI Reply Error]:', err.message)
                    })

                    // Append AI reply to conversation history
                    existingMsgs.push({
                      direction: 'outbound',
                      channel: 'whatsapp',
                      text: aiReplyText,
                      timestamp: new Date().toISOString()
                    })

                    await prisma.conversation.update({
                      where: { id: conv.id },
                      data: {
                        state: nextState,
                        messages: JSON.stringify(existingMsgs),
                        updatedAt: new Date()
                      }
                    })

                    await prisma.lead.update({
                      where: { id: lead.id },
                      data: { status: 'replied' }
                    })

                    console.log(`[WhatsApp AI Auto-Reply Sent to ${fromPhone}]: "${aiReplyText}"`)
                  }
              } catch (err) {
                console.error('[WhatsApp Inbound/AI Error]:', err.message)
              }
            }
          })

          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            resolve({ status: 'connected', phone, connectedAt })
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error)?.output?.statusCode
          console.log(`[WhatsApp Service] Connection closed for ${sessionKey}, statusCode=${statusCode}`)
          connections.delete(sessionKey)

          if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
            console.log(`[WhatsApp Service] Session logged out for ${sessionKey}`)
            pendingQR.delete(sessionKey)
            try { fs.rmSync(sessionPath, { recursive: true, force: true }) } catch {}
            if (!resolved) {
              resolved = true
              clearTimeout(timeout)
              resolve({ status: 'disconnected', error: 'Session logged out.' })
            }
          } else {
            // Automatic reconnect for restartRequired (515), connectionLost, timedOut, etc.
            console.log(`[WhatsApp Service] Reconnecting session for ${sessionKey} (statusCode=${statusCode})...`)
            setTimeout(() => {
              connectWhatsApp(tenantId, null, channelId).catch((err) => {
                console.error(`[WhatsApp Service] Reconnect failed for ${sessionKey}:`, err.message)
              })
            }, 1500)
          }
        }
      })
    })
  } catch (error) {
    return { status: 'error', error: error.message || 'Failed to connect WhatsApp.' }
  }
}

function getStatus(tenantId, channelId = null) {
  if (!tenantId) return { status: 'idle' }
  const sessionKey = getSessionKey(tenantId, channelId)

  // 1. Check if THIS EXACT sessionKey is connected in memory
  const conn = connections.get(sessionKey)
  if (conn) {
    return { status: 'connected', phone: conn.phone, connectedAt: conn.connectedAt }
  }

  // 2. Check if there is a pending pairing code or QR code waiting for THIS EXACT sessionKey
  const pending = pendingQR.get(sessionKey)
  if (pending) {
    if (typeof pending === 'string' && pending.startsWith('data:image')) {
      return { status: 'qr_ready', qrCode: pending }
    } else if (typeof pending === 'string') {
      return { status: 'pairing_code_ready', pairingCode: pending }
    }
  }

  // 3. Scan disk strictly for THIS EXACT sessionKey's folder
  try {
    const sessionPath = getSessionPath(sessionKey)
    const credsFile = path.join(sessionPath, 'creds.json')
    if (fs.existsSync(credsFile)) {
      const content = fs.readFileSync(credsFile, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed.registered === true && parsed.me?.id) {
        const phone = parsed.me.id.split(':')[0]
        connectWhatsApp(tenantId, null, channelId).catch(() => {})
        return { status: 'connected', phone }
      }
    }
  } catch {}

  return { status: 'idle' }
}

async function sendMessage(tenantId, to, message, channelId = null) {
  const sessionKey = getSessionKey(tenantId, channelId)
  let conn = connections.get(sessionKey)

  // Fallback to any active connection for this tenant if no specific channel requested
  if (!conn && tenantId && !channelId) {
    for (const [key, value] of connections.entries()) {
      if (key.startsWith(tenantId)) {
        conn = value
        break
      }
    }
  }

  // Auto-connect fallback if saved session exists on disk but not in memory
  if (!conn) {
    const sessionPath = getSessionPath(sessionKey)
    if (fs.existsSync(path.join(sessionPath, 'creds.json'))) {
      console.log(`[WhatsApp Service] Connection missing in memory for ${sessionKey}. Attempting auto-reconnect...`)
      await connectWhatsApp(tenantId, null, channelId).catch(() => {})
      conn = connections.get(sessionKey)
    }
  }

  if (!conn) {
    return { success: false, error: 'WhatsApp not connected. Please scan QR Code in Channels section first.' }
  }
  try {
    let raw = String(to || '').replace(/[^\d+]/g, '')
    if (raw.startsWith('+')) raw = raw.slice(1)
    if (raw.startsWith('03') && raw.length === 11) {
      raw = '92' + raw.slice(1)
    } else if (raw.length === 10) {
      raw = '1' + raw
    }
    const phone = raw.includes('@') ? raw : `${raw}@s.whatsapp.net`

    const result = await conn.socket.sendMessage(phone, { text: message })
    return { success: true, messageId: result.key.id || `wa_${Date.now()}` }
  } catch (error) {
    return { success: false, error: error.message || 'Send failed.' }
  }
}

function disconnect(tenantId, channelId = null) {
  const sessionKey = getSessionKey(tenantId, channelId)
  const conn = connections.get(sessionKey)
  if (conn) {
    try { conn.socket.end() } catch {}
    connections.delete(sessionKey)
  }
  pendingQR.delete(sessionKey)
  try { fs.rmSync(getSessionPath(sessionKey), { recursive: true, force: true }) } catch {}
  return { success: true }
}

// ============== HTTP SERVER ==============
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405)
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  // Parse body
  let body = ''
  await new Promise((resolve) => {
    req.on('data', (chunk) => { body += chunk })
    req.on('end', resolve)
  })

  let data
  try {
    data = JSON.parse(body)
  } catch {
    res.writeHead(400)
    res.end(JSON.stringify({ error: 'Invalid JSON' }))
    return
  }

  const { action, tenantId, channelId, to, message, phoneNumber } = data

  if (!tenantId) {
    res.writeHead(400)
    res.end(JSON.stringify({ error: 'tenantId is required' }))
    return
  }

  console.log(`[${new Date().toISOString()}] ${action} for tenant ${tenantId}${channelId ? ` (channel: ${channelId})` : ''}${phoneNumber ? ` (phone: ${phoneNumber})` : ''}`)

  try {
    let result
    switch (action) {
      case 'connect':
        result = await connectWhatsApp(tenantId, phoneNumber || null, channelId || null)
        break
      case 'status':
        result = getStatus(tenantId, channelId || null)
        break
      case 'send':
        result = await sendMessage(tenantId, to, message, channelId || null)
        break
      case 'disconnect':
        result = disconnect(tenantId, channelId || null)
        break
      default:
        result = { error: 'Unknown action' }
    }
    res.writeHead(200)
    res.end(JSON.stringify(result))
  } catch (error) {
    console.error('Service error:', error)
    res.writeHead(500)
    res.end(JSON.stringify({ error: error.message }))
  }
})

// ============== AUTO-RECONNECT SAVED SESSIONS ==============
async function autoReconnectSessions() {
  try {
    const entries = fs.readdirSync(SESSIONS_DIR)
    for (const entry of entries) {
      if (!entry.startsWith('wa_')) continue
      const sessionPath = path.join(SESSIONS_DIR, entry)
      const credsFile = path.join(sessionPath, 'creds.json')
      if (!fs.existsSync(credsFile)) continue

      try {
        const creds = JSON.parse(fs.readFileSync(credsFile, 'utf-8'))
        if (creds.registered === true) {
          // Extract tenantId and channelId from session key (format: wa_tenantId or wa_tenantId_channelId)
          const sessionKey = entry.replace(/^wa_/, '')
          const parts = sessionKey.split('_')
          // For compound IDs like "cmrxgvnn7000lxfi0bc27n6tf_cmrz9gorq000bxfi0bc27n6tf"
          // We need to figure out what's tenantId and what's channelId
          // Simple approach: try connecting with full sessionKey as tenantId first
          const phone = creds.me?.id?.split(':')[0] || 'unknown'
          console.log(`[WhatsApp Service] Auto-reconnecting session: ${sessionKey} (phone: ${phone})`)
          
          // Connect using full tenantId (the key without 'wa_' prefix)
          connectWhatsApp(parts[0], null, parts.length > 1 ? parts.slice(1).join('_') : null)
            .then(result => {
              console.log(`[WhatsApp Service] Auto-reconnect result for ${sessionKey}:`, result.status)
            })
            .catch(err => {
              console.error(`[WhatsApp Service] Auto-reconnect failed for ${sessionKey}:`, err.message)
            })
          
          // Small delay between reconnects to avoid flooding
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (e) {
        console.error(`[WhatsApp Service] Error reading session ${entry}:`, e.message)
      }
    }
  } catch (e) {
    console.error('[WhatsApp Service] Auto-reconnect scan error:', e.message)
  }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[WhatsApp Service] Listening on http://127.0.0.1:${PORT}`)
  console.log(`[WhatsApp Service] Sessions dir: ${SESSIONS_DIR}`)
  
  // Auto-reconnect saved sessions after 2 seconds (let server start first)
  setTimeout(() => {
    console.log('[WhatsApp Service] Scanning for saved sessions to auto-reconnect...')
    autoReconnectSessions()
  }, 2000)
})
