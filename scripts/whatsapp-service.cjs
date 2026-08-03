// WhatsApp Micro-Service — runs separately on port 3002
// This isolates Baileys memory usage from Next.js
// Next.js API routes call this service via HTTP

import http from 'http'
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'

const PORT = 3002
const SESSIONS_DIR = path.join(process.cwd(), '.wa-sessions')

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true })
}

// Track active connections per tenant
const connections = new Map()  // tenantId -> { socket, phone, connectedAt }
const pendingQR = new Map()    // tenantId -> qrCode base64

function getSessionPath(tenantId) {
  return path.join(SESSIONS_DIR, `wa_${tenantId}`)
}

async function connectWhatsApp(tenantId, phoneNumber = null) {
  // Check if already connected
  const existing = connections.get(tenantId)
  if (existing) {
    return {
      status: 'connected',
      phone: existing.phone,
      connectedAt: existing.connectedAt,
    }
  }

  const sessionPath = getSessionPath(tenantId)

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
      browser: ['MayaX', 'Chrome', '1.0.0'],
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

      socket.ev.on('creds.update', saveCreds)

      // ============ PAIRING CODE FLOW ============
      // When user provides phone number, request a pairing code from WhatsApp
      // The code appears in MayaX dashboard, user enters it in their WhatsApp phone app
      if (usePairingCode) {
        // Wait for socket to connect first, then request pairing code
        socket.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect } = update

          // Request pairing code once socket is connecting
          if (connection === 'connecting' && !resolved) {
            try {
              // Format phone: remove + and non-digits
              const cleanPhone = String(phoneNumber).replace(/[^\d]/g, '')
              console.log(`[WhatsApp Service] Requesting pairing code for ${cleanPhone}`)
              const pairingCode = await socket.requestPairingCode(cleanPhone)
              console.log(`[WhatsApp Service] Pairing code generated: ${pairingCode}`)
              pendingQR.set(tenantId, pairingCode)  // Store code under same key
              resolved = true
              clearTimeout(timeout)
              resolve({
                status: 'pairing_code_ready',
                pairingCode: pairingCode,
                phoneNumber: cleanPhone,
              })
            } catch (err) {
              console.error('[WhatsApp Service] Pairing code error:', err.message)
              // Fall back to QR mode
              resolved = true
              clearTimeout(timeout)
              resolve({
                status: 'error',
                error: 'Failed to generate pairing code. Please try QR scan instead.',
              })
            }
          }

          // Connection successful (after user enters code in WhatsApp)
          if (connection === 'open' && !resolved) {
            resolved = true
            clearTimeout(timeout)
            const phone = state.creds.me?.id?.split(':')[0] || phoneNumber
            const connectedAt = new Date().toISOString()
            connections.set(tenantId, { socket, phone, connectedAt })
            pendingQR.delete(tenantId)
            resolve({ status: 'connected', phone, connectedAt })
          }

          if (connection === 'close' && !resolved) {
            const statusCode = (lastDisconnect?.error)?.output?.statusCode
            if (statusCode === DisconnectReason.loggedOut) {
              resolved = true
              clearTimeout(timeout)
              resolve({ status: 'disconnected', error: 'Session logged out.' })
            }
          }
        })
      } else {
        // ============ QR CODE FLOW (fallback) ============
        socket.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect, qr } = update

          if (qr && !resolved) {
            try {
              const qrImage = await QRCode.toDataURL(qr, {
                width: 300,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' },
              })
              pendingQR.set(tenantId, qrImage)
              resolved = true
              clearTimeout(timeout)
              resolve({ status: 'qr_ready', qrCode: qrImage })
            } catch (err) {
              pendingQR.set(tenantId, qr)
              resolved = true
              clearTimeout(timeout)
              resolve({ status: 'qr_ready', qrCode: qr })
            }
          }

          if (connection === 'open' && !resolved) {
            resolved = true
            clearTimeout(timeout)
            const phone = state.creds.me?.id?.split(':')[0] || undefined
            const connectedAt = new Date().toISOString()
            connections.set(tenantId, { socket, phone, connectedAt })
            pendingQR.delete(tenantId)
            resolve({ status: 'connected', phone, connectedAt })
          }

          if (connection === 'close' && !resolved) {
            const statusCode = (lastDisconnect?.error)?.output?.statusCode
            if (statusCode === DisconnectReason.loggedOut) {
              resolved = true
              clearTimeout(timeout)
              resolve({ status: 'disconnected', error: 'Session logged out.' })
            }
          }
        })
      }
    })
  } catch (error) {
    return { status: 'error', error: error.message || 'Failed to connect WhatsApp.' }
  }
}

function getStatus(tenantId) {
  const conn = connections.get(tenantId)
  if (conn) {
    return { status: 'connected', phone: conn.phone, connectedAt: conn.connectedAt }
  }
  const pending = pendingQR.get(tenantId)
  if (pending) {
    // Check if it's a pairing code (string) or QR image (data:image/png;base64,...)
    if (typeof pending === 'string' && pending.startsWith('data:image')) {
      return { status: 'qr_ready', qrCode: pending }
    } else if (typeof pending === 'string') {
      // It's a pairing code
      return { status: 'pairing_code_ready', pairingCode: pending }
    }
  }
  return { status: 'idle' }
}

async function sendMessage(tenantId, to, message) {
  const conn = connections.get(tenantId)
  if (!conn) {
    return { success: false, error: 'WhatsApp not connected.' }
  }
  try {
    let phone = String(to || '').replace(/[^\d+]/g, '')
    if (phone.startsWith('+')) phone = phone.slice(1)
    if (!phone.includes('@')) phone = `${phone}@s.whatsapp.net`

    const result = await conn.socket.sendMessage(phone, { text: message })
    return { success: true, messageId: result.key.id || `wa_${Date.now()}` }
  } catch (error) {
    return { success: false, error: error.message || 'Send failed.' }
  }
}

function disconnect(tenantId) {
  const conn = connections.get(tenantId)
  if (conn) {
    try { conn.socket.end() } catch {}
    connections.delete(tenantId)
  }
  pendingQR.delete(tenantId)
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

  const { action, tenantId, to, message, phoneNumber } = data

  if (!tenantId) {
    res.writeHead(400)
    res.end(JSON.stringify({ error: 'tenantId is required' }))
    return
  }

  console.log(`[${new Date().toISOString()}] ${action} for tenant ${tenantId}${phoneNumber ? ` (phone: ${phoneNumber})` : ''}`)

  try {
    let result
    switch (action) {
      case 'connect':
        result = await connectWhatsApp(tenantId, phoneNumber || null)
        break
      case 'status':
        result = getStatus(tenantId)
        break
      case 'send':
        result = await sendMessage(tenantId, to, message)
        break
      case 'disconnect':
        result = disconnect(tenantId)
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[WhatsApp Service] Listening on http://127.0.0.1:${PORT}`)
  console.log(`[WhatsApp Service] Sessions dir: ${SESSIONS_DIR}`)
})
