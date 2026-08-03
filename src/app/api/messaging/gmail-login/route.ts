import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { db } from '@/lib/db'

/**
 * POST /api/messaging/gmail-login
 * Body: { action: 'login'|'send'|'status'|'disconnect', email?, password?, to?, subject?, body? }
 *
 * Uses SMTP App Password approach (nodemailer) — no browser needed.
 * Actions:
 * - login: Test SMTP connection with email + App Password, save to DB
 * - send: Send email via SMTP (active transporter or saved credentials)
 * - status: Check if Gmail is connected
 * - disconnect: Close SMTP connection, update DB
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.success) return auth.response
    const { tenantId } = auth

    const body = (await req.json()) as {
      action: 'login' | 'send' | 'status' | 'disconnect'
      channelId?: string
      email?: string
      password?: string
      to?: string
      subject?: string
      body?: string
    }

    const sessionKey = body.channelId ? `${tenantId}_${body.channelId}` : tenantId

    switch (body.action) {
      // ============ CONNECT GMAIL (SMTP TEST) ============
      case 'login': {
        if (!body.email || !body.password) {
          return NextResponse.json(
            { error: 'Email and App Password are required.' },
            { status: 400 },
          )
        }

        const { loginToGmail } = await import('@/lib/messaging/gmail-login')

        const result = await loginToGmail(
          body.email,
          body.password,
          sessionKey,
        )

        if (result.success) {
          // Save/update the email channel in DB
          const existingChannel = body.channelId
            ? await db.channel.findFirst({ where: { id: body.channelId, tenantId } })
            : await db.channel.findFirst({ where: { tenantId, type: 'email' } })

          const credentials = JSON.stringify({
            email: body.email,
            password: body.password,
            connectedAt: new Date().toISOString(),
            method: 'smtp_app_password',
          })

          if (existingChannel) {
            await db.channel.update({
              where: { id: existingChannel.id },
              data: {
                status: 'connected',
                credentials,
                email: body.email,
                connectedOn: new Date(),
                lastHealthCheck: new Date(),
              },
            })
          } else {
            await db.channel.create({
              data: {
                tenantId,
                type: 'email',
                name: `Gmail - ${body.email}`,
                status: 'connected',
                credentials,
                email: body.email,
                connectedOn: new Date(),
                lastHealthCheck: new Date(),
              },
            })
          }
        }

        return NextResponse.json(result)
      }

      // ============ SEND EMAIL ============
      case 'send': {
        if (!body.to || !body.subject || !body.body) {
          return NextResponse.json(
            { error: 'to, subject, and body are required.' },
            { status: 400 },
          )
        }

        const gmailModule = await import('@/lib/messaging/gmail-login')

        // Try active SMTP transporter first
        const sessionStatus = gmailModule.getGmailSessionStatus(sessionKey)

        if (sessionStatus.active) {
          const result = await gmailModule.sendEmailViaGmailSession(
            sessionKey,
            body.to,
            body.subject,
            body.body,
          )
          return NextResponse.json({ channel: 'email', ...result })
        }

        // Fallback: try SMTP with saved credentials from DB
        const emailChannel = body.channelId
          ? await db.channel.findFirst({ where: { id: body.channelId, tenantId } })
          : await db.channel.findFirst({ where: { tenantId, type: 'email' } })

        if (emailChannel?.credentials) {
          try {
            const creds = JSON.parse(emailChannel.credentials)
            if (creds.email && creds.password) {
              const result = await gmailModule.sendEmailViaSMTP(
                creds.email,
                creds.password,
                body.to,
                body.subject,
                body.body,
              )
              return NextResponse.json({ channel: 'email', ...result })
            }
          } catch {}
        }

        return NextResponse.json({
          channel: 'email',
          success: false,
          error: 'No active Gmail connection. Please connect your Gmail account first.',
        })
      }

      // ============ CHECK STATUS ============
      case 'status': {
        let sessionActive = false
        try {
          const gmailModule = await import('@/lib/messaging/gmail-login')
          sessionActive = gmailModule.getGmailSessionStatus(sessionKey).active
        } catch {}

        const emailChannel = body.channelId
          ? await db.channel.findFirst({ where: { id: body.channelId, tenantId } })
          : await db.channel.findFirst({ where: { tenantId, type: 'email' } })

        return NextResponse.json({
          sessionActive: emailChannel ? emailChannel.status === 'connected' : sessionActive,
          channel: emailChannel
            ? {
                id: emailChannel.id,
                status: emailChannel.status,
                email: emailChannel.email,
                connectedOn: emailChannel.connectedOn,
                lastHealthCheck: emailChannel.lastHealthCheck,
              }
            : null,
        })
      }

      // ============ DISCONNECT ============
      case 'disconnect': {
        try {
          const gmailModule = await import('@/lib/messaging/gmail-login')
          await gmailModule.closeGmailSession(sessionKey)
        } catch {}

        const emailChannel = body.channelId
          ? await db.channel.findFirst({ where: { id: body.channelId, tenantId } })
          : await db.channel.findFirst({ where: { tenantId, type: 'email' } })

        if (emailChannel) {
          await db.channel.update({
            where: { id: emailChannel.id },
            data: { status: 'disconnected', connectedOn: null },
          })
        }

        return NextResponse.json({ success: true, message: 'Gmail disconnected.' })
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action. Use: login, send, status, disconnect' },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('Gmail login error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error.' },
      { status: 500 },
    )
  }
}