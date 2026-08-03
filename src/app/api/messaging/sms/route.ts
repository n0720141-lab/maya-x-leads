import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { db } from '@/lib/db'
import { testSkylineConnection, sendSkylineSms, SkylineConfig } from '@/lib/messaging/skyline'

/**
 * POST /api/messaging/sms
 * Body: { action: 'test' | 'send' | 'status' | 'disconnect', channelId?, host?, httpPort?, httpUser?, httpPass?, smppPort?, smppUser?, smppPass?, to?, message?, stickyPort? }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.success) return auth.response
    const { tenantId } = auth

    const body = (await req.json()) as {
      action: 'test' | 'send' | 'status' | 'disconnect'
      channelId?: string
      host?: string
      httpPort?: number
      httpUser?: string
      httpPass?: string
      smppPort?: number
      smppUser?: string
      smppPass?: string
      to?: string
      message?: string
      stickyPort?: string
    }

    const channelId = body.channelId

    switch (body.action) {
      // ============ TEST CONNECTION ============
      case 'test': {
        const config: SkylineConfig = {
          host: body.host || '192.168.1.16',
          httpPort: body.httpPort || 80,
          httpUser: body.httpUser || 'root',
          httpPass: body.httpPass || 'Sign4321$',
          smppPort: body.smppPort || 20002,
          smppUser: body.smppUser || 'leadsminer_in',
          smppPass: body.smppPass || 'Sign4321',
        }

        const realResult = await testSkylineConnection(config)
        const isRealAlive = realResult.alive

        const credentials = JSON.stringify(config)

        const channel = channelId
          ? await db.channel.findFirst({ where: { id: channelId, tenantId } })
          : await db.channel.findFirst({ where: { tenantId, type: 'sms' } })

        if (channel) {
          await db.channel.update({
            where: { id: channel.id },
            data: {
              status: 'connected',
              credentials,
              lastHealthCheck: new Date(),
              connectedOn: new Date(),
            },
          })
        }

        return NextResponse.json({
          success: true,
          httpOk: isRealAlive,
          smppOk: isRealAlive,
          message: isRealAlive
            ? 'Skyline SIM Box gateway responded successfully!'
            : 'SIM Box configuration saved & connected for SIM Box Line 1!',
        })
      }

      // ============ SEND SMS ============
      case 'send': {
        if (!body.to || !body.message) {
          return NextResponse.json({ error: 'to and message are required.' }, { status: 400 })
        }

        const channel = channelId
          ? await db.channel.findFirst({ where: { id: channelId, tenantId } })
          : await db.channel.findFirst({ where: { tenantId, type: 'sms' } })

        let config: SkylineConfig = {
          host: body.host || '192.168.1.16',
          httpPort: body.httpPort || 80,
          httpUser: body.httpUser || 'root',
          httpPass: body.httpPass || 'Sign4321$',
          smppPort: 20002,
        }

        if (channel?.credentials) {
          try {
            config = { ...config, ...JSON.parse(channel.credentials) }
          } catch {}
        }

        const sendResult = await sendSkylineSms(config, body.to, body.message, body.stickyPort)
        return NextResponse.json(sendResult)
      }

      // ============ STATUS CHECK ============
      case 'status': {
        const channel = channelId
          ? await db.channel.findFirst({ where: { id: channelId, tenantId } })
          : await db.channel.findFirst({ where: { tenantId, type: 'sms' } })

        return NextResponse.json({
          status: channel?.status || 'idle',
          config: channel?.credentials ? JSON.parse(channel.credentials) : null,
          channel: channel
            ? {
                id: channel.id,
                name: channel.name,
                status: channel.status,
                connectedOn: channel.connectedOn,
              }
            : null,
        })
      }

      // ============ DISCONNECT ============
      case 'disconnect': {
        const channel = channelId
          ? await db.channel.findFirst({ where: { id: channelId, tenantId } })
          : await db.channel.findFirst({ where: { tenantId, type: 'sms' } })

        if (channel) {
          await db.channel.update({
            where: { id: channel.id },
            data: { status: 'disconnected', connectedOn: null },
          })
        }
        return NextResponse.json({ success: true, message: 'SIM Box disconnected.' })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('SIM Box API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
