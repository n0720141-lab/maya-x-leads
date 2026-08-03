import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth-middleware'
import { db } from '@/lib/db'

/**
 * GET /api/messaging/settings
 * Super Admin: Get global messaging settings
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (!auth.success) return auth.response

  try {
    const configs = await db.globalConfig.findMany({
      where: { key: { startsWith: 'msg_' } },
    })

    const settings: Record<string, string> = {}
    for (const c of configs) {
      settings[c.key] = c.value
    }

    // Defaults
    const defaults: Record<string, string> = {
      msg_batch_size: '400',
      msg_batch_sleep_ms: '10000',
      msg_delay_min_ms: '3000',
      msg_delay_max_ms: '10000',
      msg_wa_typing: 'true',
      msg_wa_typing_speed_ms: '80',
      msg_send_node_base: 'http://127.0.0.1:3010',
      msg_send_node_hold_ms: '25000',
      msg_send_node_secret: '19851985',
      msg_skyline_host: '192.168.1.16',
      msg_skyline_port: '80',
      msg_skyline_user: 'root',
      msg_skyline_pass: '',
    }

    // Merge defaults with DB values
    const merged = { ...defaults, ...settings }

    return NextResponse.json({ settings: merged })
  } catch (error) {
    console.error('Get messaging settings error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

/**
 * PUT /api/messaging/settings
 * Super Admin: Update global messaging settings
 */
export async function PUT(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (!auth.success) return auth.response

  try {
    const body = await req.json() as Record<string, string>

    const allowedKeys = [
      'msg_batch_size',
      'msg_batch_sleep_ms',
      'msg_delay_min_ms',
      'msg_delay_max_ms',
      'msg_wa_typing',
      'msg_wa_typing_speed_ms',
      'msg_send_node_base',
      'msg_send_node_hold_ms',
      'msg_send_node_secret',
      'msg_skyline_host',
      'msg_skyline_port',
      'msg_skyline_user',
      'msg_skyline_pass',
    ]

    let updated = 0
    for (const [key, value] of Object.entries(body)) {
      if (!allowedKeys.includes(key)) continue
      if (value === undefined || value === null) continue

      await db.globalConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value, description: `Messaging setting: ${key}` },
      })
      updated++
    }

    return NextResponse.json({ success: true, updated })
  } catch (error) {
    console.error('Update messaging settings error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}