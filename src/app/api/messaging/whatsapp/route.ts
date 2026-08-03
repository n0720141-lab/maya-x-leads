import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { db } from '@/lib/db'

/**
 * POST /api/messaging/whatsapp
 * Body: { action: 'connect'|'status'|'send'|'disconnect', to?, message? }
 *
 * This route now PROXIES to the standalone WhatsApp service on port 3002.
 * The service runs Baileys separately to avoid memory issues with Next.js.
 */

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://127.0.0.1:3002'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.success) return auth.response
    const { tenantId } = auth

    const body = (await req.json()) as {
      action: 'connect' | 'status' | 'send' | 'disconnect'
      channelId?: string
      to?: string
      message?: string
      phoneNumber?: string  // For pairing code mode
    }

    // Update DB on disconnect
    if (body.action === 'disconnect') {
      try {
        const channel = body.channelId
          ? await db.channel.findFirst({ where: { id: body.channelId, tenantId } })
          : await db.channel.findFirst({ where: { tenantId, type: 'whatsapp' } })

        if (channel) {
          await db.channel.update({
            where: { id: channel.id },
            data: { status: 'disconnected', connectedOn: null },
          })
        }
      } catch {}

      // Call service to disconnect
      try {
        await fetch(WA_SERVICE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disconnect', tenantId, channelId: body.channelId }),
        })
      } catch {}
      return NextResponse.json({ success: true, message: 'WhatsApp disconnected.' })
    }

    // All other actions: proxy to WhatsApp service
    const serviceResponse = await fetch(WA_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: body.action,
        tenantId,
        channelId: body.channelId,
        to: body.to,
        message: body.message,
        phoneNumber: body.phoneNumber,  // Pass phone number for pairing code mode
      }),
      signal: AbortSignal.timeout(65000), // 65s timeout (pairing code may take time)
    })

    const result = await serviceResponse.json()

    // If connected, also save to DB for THIS specific channelId
    if (result.status === 'connected' && body.channelId) {
      try {
        const phone = result.phone || null
        const existingChannel = await db.channel.findFirst({
          where: { id: body.channelId, tenantId },
        })

        if (existingChannel) {
          await db.channel.update({
            where: { id: existingChannel.id },
            data: {
              status: 'connected',
              email: phone,
              connectedOn: new Date(),
              lastHealthCheck: new Date(),
            },
          })
        }
      } catch {}
    }

    // Merge DB info into status response
    if (body.action === 'status' && body.channelId) {
      const channel = await db.channel.findFirst({
        where: { id: body.channelId, tenantId },
      })

      result.channel = channel ? {
        id: channel.id,
        status: channel.status,
        phone: channel.email,
        connectedOn: channel.connectedOn,
      } : null
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('WhatsApp API error:', error)

    // Provide clear error if service is down
    const errMsg = error instanceof Error ? error.message : 'Internal server error.'
    if (errMsg.includes('fetch') || errMsg.includes('ECONNREFUSED') || errMsg.includes('aborted') || errMsg.includes('timeout')) {
      return NextResponse.json({
        status: 'error',
        error: 'WhatsApp service is starting up. Please wait 30 seconds and try again.',
      }, { status: 503 })
    }

    return NextResponse.json(
      { error: errMsg },
      { status: 500 },
    )
  }
}
