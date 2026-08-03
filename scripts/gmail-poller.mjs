import imaps from 'imap-simple'
import { simpleParser } from 'mailparser'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const POLL_INTERVAL_MS = 20000 // Smooth 20-second interval to avoid Google login rate-limiting

// Set of processed email UIDs to prevent duplicate auto-replies
const processedUids = new Set()
const activeConnections = new Map()

process.on('uncaughtException', (err) => {
  console.log('[Gmail Poller] Suppressed background network socket reset:', err.message)
})

process.on('unhandledRejection', (reason) => {
  console.log('[Gmail Poller] Suppressed background unhandled rejection:', reason?.message || reason)
})

console.log('[Gmail Poller] Starting persistent, rate-limit protected background Gmail poller...')

async function pollGmailInboxForChannel(channel) {
  try {
    if (!channel.credentials) return

    let creds = {}
    try {
      creds = JSON.parse(channel.credentials)
    } catch {
      return
    }

    const email = channel.email || creds.email || creds.user
    const password = creds.password || creds.pass

    if (!email || !password) return

    const config = {
      imap: {
        user: email,
        password: password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 15000
      }
    }

    let connection = activeConnections.get(email)
    if (!connection) {
      connection = await imaps.connect(config)
      if (connection && typeof connection.on === 'function') {
        connection.on('error', () => {
          activeConnections.delete(email)
        })
      }
      activeConnections.set(email, connection)
    }

    try {
      await connection.openBox('INBOX')
    } catch {
      try { connection.end() } catch {}
      connection = await imaps.connect(config)
      activeConnections.set(email, connection)
      await connection.openBox('INBOX')
    }

    // Search emails received in last 2 days
    const searchDate = new Date()
    searchDate.setDate(searchDate.getDate() - 2)
    const searchCriteria = [['SINCE', searchDate]]
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: true
    }

    const messages = await connection.search(searchCriteria, fetchOptions)

    if (messages.length > 0) {
      for (const item of messages) {
        const uidKey = `${email}:${item.attributes.uid}`
        if (processedUids.has(uidKey)) continue

        const all = item.parts.find(p => p.which === '')

        if (all && all.body) {
          const parsed = await simpleParser(all.body)
          const fromEmail = parsed.from?.value?.[0]?.address || ''
          const subject = parsed.subject || ''
          const messageId = parsed.messageId || ''
          const references = Array.isArray(parsed.references) ? parsed.references.join(' ') : (parsed.references || '')
          const textContent = (parsed.text || parsed.html || '').toString().trim()

          // Don't auto-reply to self or automated system notifications / newsletters
          const lowerFrom = fromEmail.toLowerCase()
          if (
            !fromEmail ||
            lowerFrom === email.toLowerCase() ||
            lowerFrom.includes('no-reply') ||
            lowerFrom.includes('noreply') ||
            lowerFrom.includes('mailer-daemon') ||
            lowerFrom.includes('google.com') ||
            lowerFrom.includes('linkedin.com') ||
            lowerFrom.includes('sandcloud.com') ||
            lowerFrom.includes('newsletter') ||
            lowerFrom.includes('marketing') ||
            lowerFrom.includes('support@') ||
            lowerFrom.includes('info@') ||
            lowerFrom.includes('sales@') ||
            lowerFrom.includes('notifications@') ||
            lowerFrom.includes('promotions@')
          ) {
            processedUids.add(uidKey)
            continue
          }

          console.log(`[Gmail Poller] Processing new email from ${fromEmail}: "${subject}" | MsgId: ${messageId}`)

          // Mark UID as processed before dispatching
          processedUids.add(uidKey)

          // Post to inbound route for instant Auto-Reply execution with exact threading headers
          try {
            const resp = await fetch('http://127.0.0.1:3000/api/messaging/inbound', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: fromEmail,
                content: textContent,
                subject: subject,
                messageId: messageId,
                references: references,
                channel: 'email'
              })
            })
            const resData = await resp.json()
            console.log(`[Gmail Poller] Inbound Auto-Reply thread result for ${fromEmail}:`, resData)
          } catch (err) {
            console.error(`[Gmail Poller] Error posting inbound email for ${fromEmail}:`, err.message)
          }
        }
      }
    }
  } catch (err) {
    const emailKey = channel.email || ''
    if (emailKey && activeConnections.has(emailKey)) {
      try { activeConnections.get(emailKey).end() } catch {}
      activeConnections.delete(emailKey)
    }
  }
}

async function startPollingLoop() {
  while (true) {
    try {
      const emailChannels = await prisma.channel.findMany({
        where: { type: 'email', status: 'connected' }
      })

      for (const ch of emailChannels) {
        await pollGmailInboxForChannel(ch)
      }
    } catch (e) {
      console.error('[Gmail Poller Loop Error]:', e.message)
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }
}

startPollingLoop()
