// ===================== WHATSAPP CONNECTION MANAGER (BAILEYS) =====================
// Real WhatsApp Web API — QR code scan, session persistence, message sending
// Uses @whiskeysockets/baileys (maintained fork)

import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'
import type { WASocket } from '@whiskeysockets/baileys'
import { db } from '@/lib/db'
import path from 'path'

// ==================== TYPES ====================

export interface WhatsAppConnection {
  tenantId: string
  status: 'idle' | 'connecting' | 'qr_ready' | 'connected' | 'disconnected' | 'error'
  qrCode?: string       // base64 PNG image
  phone?: string        // connected phone number
  connectedAt?: string
  error?: string
}

export interface SendWhatsAppResult {
  success: boolean
  messageId?: string
  error?: string
}

// ==================== IN-MEMORY STORE ====================

const connections: Map<string, {
  socket: WASocket
  phone?: string
  connectedAt?: string
}> = new Map()

// Pending QR codes (set before socket connects)
const pendingQR: Map<string, string> = new Map()

/**
 * Get session folder path for a tenant
 */
function getSessionPath(tenantId: string): string {
  return path.join(process.cwd(), '.wa-sessions', `wa_${tenantId}`)
}

/**
 * Initialize WhatsApp connection — generates QR code for scanning
 * 1. Load or create auth state from disk
 * 2. Connect to WhatsApp servers
 * 3. If new session: return QR code for user to scan
 * 4. If existing session: auto-connect
 */
export async function connectWhatsApp(tenantId: string): Promise<WhatsAppConnection> {
  // Check if already connected
  const existing = connections.get(tenantId)
  if (existing) {
    return {
      tenantId,
      status: 'connected',
      phone: existing.phone,
      connectedAt: existing.connectedAt,
    }
  }

  const sessionPath = getSessionPath(tenantId)

  try {
    // Load auth state (creates new if doesn't exist)
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

    // Fetch WhatsApp Web version
    const { version } = await fetchLatestBaileysVersion()

    // Create the WhatsApp socket — optimized for low memory environments
    const socket = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableStateKey(state) },
      printQRToTerminal: false,
      connectTimeoutMs: 30000,
      defaultQueryTimeoutMs: 30000,
      keepAliveIntervalMs: 60000,
      retryRequestDelayMs: 5000,
      maxMsgRetryCount: 1,
      // Lighter connection settings
      markOnlineOnConnect: false,
      syncFullHistory: false,
      browser: ['MayaX', 'Chrome', '1.0.0'],
    })

    // Track connection
    let resolved = false

    // Wait for QR code or connection
    const result = await new Promise<WhatsAppConnection>((resolve) => {
      // Timeout after 25 seconds (was 60 — too long caused memory pressure)
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          try { socket.end() } catch {}
          resolve({
            tenantId,
            status: 'error',
            error: 'Connection timeout. Please try again.',
          })
        }
      }, 25000)

      socket.ev.on('creds.update', saveCreds)

      socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        // QR CODE RECEIVED — user needs to scan
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
            resolve({
              tenantId,
              status: 'qr_ready',
              qrCode: qrImage,
            })
          } catch (err) {
            // If QR generation fails, provide raw QR string
            pendingQR.set(tenantId, qr)
            resolved = true
            clearTimeout(timeout)
            resolve({
              tenantId,
              status: 'qr_ready',
              qrCode: qr,
            })
          }
        }

        // CONNECTION SUCCESSFUL
        if (connection === 'open' && !resolved) {
          resolved = true
          clearTimeout(timeout)

          const connectedAt = new Date().toISOString()
          const phone = state.creds.me?.id?.split(':')[0] || undefined

          connections.set(tenantId, {
            socket,
            phone,
            connectedAt,
          })

          // Save to DB
          try {
            const existingChannel = await db.channel.findFirst({
              where: { tenantId, type: 'whatsapp' },
            })

            if (existingChannel) {
              await db.channel.update({
                where: { id: existingChannel.id },
                data: {
                  status: 'connected',
                  email: phone || null,
                  connectedOn: new Date(),
                  lastHealthCheck: new Date(),
                },
              })
            } else {
              await db.channel.create({
                data: {
                  tenantId,
                  type: 'whatsapp',
                  name: `WhatsApp - ${phone || 'Unknown'}`,
                  status: 'connected',
                  email: phone || null,
                  connectedOn: new Date(),
                  lastHealthCheck: new Date(),
                },
              })
            }
          } catch {}

          resolve({
            tenantId,
            status: 'connected',
            phone,
            connectedAt,
          })
        }

        // CONNECTION CLOSED / ERROR
        if (connection === 'close' && !resolved) {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
          let shouldRetry = false

          if (statusCode === DisconnectReason.loggedOut) {
            // Session was logged out — delete saved session
            resolved = true
            clearTimeout(timeout)
            resolve({
              tenantId,
              status: 'disconnected',
              error: 'WhatsApp session was logged out. Please scan QR code again.',
            })
          } else if (statusCode === DisconnectReason.connectionClosed) {
            shouldRetry = true
          } else if (statusCode === DisconnectReason.timedOut) {
            shouldRetry = true
          } else if (statusCode === DisconnectReason.connectionReplaced) {
            resolved = true
            clearTimeout(timeout)
            resolve({
              tenantId,
              status: 'disconnected',
              error: 'WhatsApp connection was replaced by another device.',
            })
          }

          if (shouldRetry) {
            // Retry connection
            resolved = true
            clearTimeout(timeout)
            connectWhatsApp(tenantId).then(resolve).catch(() => {
              resolve({
                tenantId,
                status: 'error',
                error: 'Connection failed. Please try again.',
              })
            })
          }
        }
      })
    })

    return result
  } catch (error) {
    return {
      tenantId,
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to initialize WhatsApp connection.',
    }
  }
}

/**
 * Get current WhatsApp connection status
 */
export function getWhatsAppStatus(tenantId: string): WhatsAppConnection {
  const conn = connections.get(tenantId)
  if (conn) {
    return {
      tenantId,
      status: 'connected',
      phone: conn.phone,
      connectedAt: conn.connectedAt,
    }
  }

  // Check if there's a pending QR
  const qr = pendingQR.get(tenantId)
  if (qr) {
    return {
      tenantId,
      status: 'qr_ready',
      qrCode: qr,
    }
  }

  return { tenantId, status: 'idle' }
}

/**
 * Send WhatsApp message via connected session
 */
export async function sendWhatsAppMessage(
  tenantId: string,
  to: string,
  message: string,
): Promise<SendWhatsAppResult> {
  const conn = connections.get(tenantId)

  if (!conn) {
    return { success: false, error: 'WhatsApp not connected. Please scan QR code first.' }
  }

  try {
    const phone = normalizeWhatsAppPhone(to)
    if (!phone) {
      return { success: false, error: 'Invalid phone number format.' }
    }

    const result = await conn.socket.sendMessage(phone, {
      text: message,
    })

    return {
      success: true,
      messageId: result.key.id || `wa_${Date.now()}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'WhatsApp send failed.',
    }
  }
}

/**
 * Disconnect WhatsApp and clean up
 */
export async function disconnectWhatsApp(tenantId: string): Promise<boolean> {
  const conn = connections.get(tenantId)
  if (conn) {
    try {
      conn.socket.end()
    } catch {}
    connections.delete(tenantId)
  }
  pendingQR.delete(tenantId)
  return true
}

/**
 * Normalize phone number for WhatsApp
 * Converts: +1234567890 → 1234567890@s.whatsapp.net
 */
export function normalizeWhatsAppPhone(phone: string): string {
  let d = String(phone || '').replace(/[^\d+]/g, '')

  // Remove leading +
  if (d.startsWith('+')) d = d.slice(1)

  if (d.startsWith('03') && d.length === 11) {
    d = '92' + d.slice(1)
  } else if (d.length === 10) {
    d = '1' + d
  }

  if (!d || d.length < 10) return ''

  // If already has @s.whatsapp.net, return as-is
  if (d.includes('@')) return d

  return `${d}@s.whatsapp.net`
}

/**
 * Make Baileys cache state compatible with useMultiFileAuthState
 * Baileys expects keys in a specific format
 */
function makeCacheableStateKey(state: any) {
  // Return the keys object from the auth state
  // This handles both old and new Baileys versions
  if (state.keys) return state.keys
  return state
}