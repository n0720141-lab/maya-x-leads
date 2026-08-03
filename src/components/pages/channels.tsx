'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import {
  MessageSquare,
  Phone,
  Mail,
  Settings,
  Zap,
  Plus,
  Send,
  DollarSign,
  Hash,
  User,
  Server,
  Clock,
  TrendingUp,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Shield,
  Radio,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'

// ==================== STATIC CHANNELS (SMS + WhatsApp) ====================
const staticChannels = [
  {
    id: 'sms',
    name: 'SMS',
    icon: MessageSquare,
    status: 'Disconnected' as const,
    enabled: true,
    color: '#7C3AED',
    config: {
      Provider: 'Skyline SIM Box',
      'Phone Number': '+1 (555) 123-4567',
      'Messages Sent': '0',
      'Cost this month': '$0 (SIM)',
    },
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: Phone,
    status: 'Disconnected' as const,
    enabled: true,
    color: '#10B981',
    config: {
      'Business Account': 'Tenant WhatsApp',
      'Number': 'Scan QR or Enter Pairing Code',
      'Messages Sent': '0',
      'Cost this month': '$0 (Free)',
    },
  },
]

const comingSoonChannels = [
  { name: 'Telegram', icon: Send, description: 'Reach leads via Telegram bots' },
  { name: 'Facebook Messenger', icon: MessageSquare, description: 'Connect with Facebook users' },
  { name: 'Google Business Messages', icon: MessageSquare, description: 'SMS via Google Maps' },
]

const usageData = [
  { day: 'Mon', SMS: 320, WhatsApp: 210, Email: 95 },
  { day: 'Tue', SMS: 380, WhatsApp: 245, Email: 110 },
  { day: 'Wed', SMS: 295, WhatsApp: 190, Email: 88 },
  { day: 'Thu', SMS: 410, WhatsApp: 275, Email: 120 },
  { day: 'Fri', SMS: 350, WhatsApp: 230, Email: 105 },
  { day: 'Sat', SMS: 180, WhatsApp: 145, Email: 60 },
  { day: 'Sun', SMS: 120, WhatsApp: 95, Email: 42 },
]

const chartConfig = {
  SMS: { label: 'SMS', color: '#7C3AED' },
  WhatsApp: { label: 'WhatsApp', color: '#10B981' },
  Email: { label: 'Email', color: '#F59E0B' },
}

// ==================== STATUS BADGE ====================
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Connected: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    connected: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    Pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    Disconnected: 'bg-red-500/15 text-red-400 border-red-500/20',
    disconnected: 'bg-red-500/15 text-red-400 border-red-500/20',
    logging_in: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    connecting: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    qr_ready: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    pairing_code_ready: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    idle: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
    error: 'bg-red-500/15 text-red-400 border-red-500/20',
  }
  const dotColors: Record<string, string> = {
    Connected: 'bg-emerald-400',
    connected: 'bg-emerald-400',
    Pending: 'bg-amber-400',
    pending: 'bg-amber-400',
    Disconnected: 'bg-red-400',
    disconnected: 'bg-red-400',
    logging_in: 'bg-blue-400 animate-pulse',
    connecting: 'bg-blue-400 animate-pulse',
    qr_ready: 'bg-emerald-400 animate-pulse',
    pairing_code_ready: 'bg-emerald-400 animate-pulse',
    idle: 'bg-gray-400',
    error: 'bg-red-400',
  }
  const labels: Record<string, string> = {
    pairing_code_ready: 'Code Ready',
    qr_ready: 'QR Ready',
    connecting: 'Connecting',
    idle: 'Not Connected',
    error: 'Error',
  }
  const label = labels[status] || (status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '))
  return (
    <Badge variant="outline" className={`${styles[status] || ''} gap-1.5`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColors[status] || 'bg-gray-400'}`} />
      {label}
    </Badge>
  )
}

// ==================== WHATSAPP PAIRING CODE CONNECT CARD ====================
function WhatsAppConnectCard({
  channelId,
  channelName,
  onDelete,
}: {
  channelId?: string
  channelName?: string
  onDelete?: () => void
}) {
  const [status, setStatus] = useState<string>('idle')
  const [pairingCode, setPairingCode] = useState<string>('')
  const [qrCode, setQrCode] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [connectedPhone, setConnectedPhone] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState('')
  const [showQR, setShowQR] = useState(false)  // toggle between phone pairing and QR

  // Check existing WhatsApp connection on mount
  useEffect(() => {
    checkWhatsAppStatus()
  }, [channelId])

  const checkWhatsAppStatus = async () => {
    try {
      const data = await api.post<{
        status: string
        phone?: string
        pairingCode?: string
        qrCode?: string
        channel?: { status: string; phone: string | null; connectedOn: string | null } | null
      }>('/messaging/whatsapp', { action: 'status', channelId })

      if (data.status === 'connected' || data.channel?.status === 'connected') {
        setStatus('connected')
        if (data.phone) setConnectedPhone(data.phone)
        if (data.channel?.phone) setConnectedPhone(data.channel.phone)
      } else if (data.status === 'pairing_code_ready' && data.pairingCode) {
        setStatus('pairing_code_ready')
        setPairingCode(data.pairingCode)
        startPolling()
      } else if (data.status === 'qr_ready' && data.qrCode) {
        setStatus('qr_ready')
        setQrCode(data.qrCode)
        startPolling()
      }
    } catch {
      // Not connected yet
    }
  }

  // Pairing code mode — user enters phone number, gets a code
  const handleConnectWithPhone = async () => {
    if (!phoneNumber.trim()) {
      setErrorMsg('Please enter your WhatsApp phone number')
      setStatus('error')
      return
    }

    setStatus('connecting')
    setErrorMsg('')
    setPairingCode('')
    setQrCode('')

    try {
      const data = await api.post<{
        status: string
        pairingCode?: string
        qrCode?: string
        phone?: string
        connectedAt?: string
        error?: string
      }>('/messaging/whatsapp', {
        action: 'connect',
        channelId,
        phoneNumber: phoneNumber.trim(),
      })

      if (data.status === 'pairing_code_ready' && data.pairingCode) {
        setStatus('pairing_code_ready')
        setPairingCode(data.pairingCode)
        startPolling()
      } else if (data.status === 'qr_ready' && data.qrCode) {
        setStatus('qr_ready')
        setQrCode(data.qrCode)
        startPolling()
      } else if (data.status === 'connected') {
        setStatus('connected')
        if (data.phone) setConnectedPhone(data.phone)
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Failed to connect WhatsApp.')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Connection request failed.')
    }
  }

  // QR mode (fallback)
  const handleConnectWithQR = async () => {
    setStatus('connecting')
    setErrorMsg('')
    setPairingCode('')
    setQrCode('')

    try {
      const data = await api.post<{
        status: string
        pairingCode?: string
        qrCode?: string
        phone?: string
        error?: string
      }>('/messaging/whatsapp', { action: 'connect', channelId })

      if (data.status === 'qr_ready' && data.qrCode) {
        setStatus('qr_ready')
        setQrCode(data.qrCode)
        startPolling()
      } else if (data.status === 'connected') {
        setStatus('connected')
        if (data.phone) setConnectedPhone(data.phone)
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Failed to connect WhatsApp.')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Connection request failed.')
    }
  }

  const startPolling = () => {
    const poll = async () => {
      try {
        const data = await api.post<{
          status: string
          phone?: string
          pairingCode?: string
        }>('/messaging/whatsapp', { action: 'status', channelId })

        if (data.status === 'connected') {
          setStatus('connected')
          if (data.phone) setConnectedPhone(data.phone)
          setPairingCode('')
          setQrCode('')
          return // Stop polling
        }
      } catch {}

      // Continue polling — check current status via state setter
      setStatus((current) => {
        if (current === 'pairing_code_ready' || current === 'qr_ready') {
          setTimeout(poll, 3000)
        }
        return current
      })
    }

    setTimeout(poll, 4000)
  }

  const handleDisconnect = async () => {
    try {
      await api.post('/messaging/whatsapp', { action: 'disconnect', channelId })
      setStatus('idle')
      setConnectedPhone('')
      setPairingCode('')
      setQrCode('')
    } catch {
      // Ignore
    }
  }

  const handleCancel = () => {
    handleDisconnect()
  }

  // Format pairing code with dashes for readability (e.g., ABC-DEF-GH)
  const formatPairingCode = (code: string) => {
    const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    if (clean.length === 8) {
      return `${clean.slice(0, 4)}-${clean.slice(4)}`
    }
    return clean
  }

  return (
    <Card className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#10B98115' }}
            >
              <Phone className="h-5 w-5" style={{ color: '#10B981' }} />
            </div>
            <div>
              <CardTitle className="text-white text-base flex items-center gap-2">
                {channelName || 'WhatsApp'}
                <Radio className="h-3.5 w-3.5 text-[#6B7280]" />
              </CardTitle>
              <div className="mt-1">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-[#6B7280] hover:text-red-400 p-1 transition-colors"
              title="Delete Channel"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* CONNECTED STATE */}
        {status === 'connected' && (
          <div className="space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-emerald-300 text-sm font-medium">WhatsApp Connected!</p>
                <p className="text-emerald-400/70 text-xs mt-0.5">
                  {connectedPhone || 'Device linked'}
                </p>
                <p className="text-[#6B7280] text-xs mt-1">
                  Messages will be sent through your linked WhatsApp device.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              onClick={handleDisconnect}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Disconnect WhatsApp
            </Button>
          </div>
        )}

        {/* PAIRING CODE READY - Show 8-digit code */}
        {status === 'pairing_code_ready' && pairingCode && (
          <div className="space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-emerald-300 text-xs font-medium">Enter this code in WhatsApp</p>
              </div>
              <p className="text-[#9CA3AF] text-xs leading-relaxed mb-3">
                On your phone, open WhatsApp → Settings → Linked Devices → Link a Device →
                tap &quot;Link with phone number instead&quot; → Enter the code below.
              </p>

              {/* Big code display */}
              <div className="bg-white rounded-lg p-4 text-center shadow-lg">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Your Pairing Code</p>
                <p className="text-3xl font-bold tracking-[0.3em] text-gray-900 font-mono">
                  {formatPairingCode(pairingCode)}
                </p>
                <p className="text-[10px] text-gray-400 mt-2">Code expires in ~60 seconds</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
              <p className="text-[#9CA3AF] text-xs">Waiting for you to enter the code...</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full bg-white/[0.03] border-white/[0.06] text-[#9CA3AF] hover:text-white hover:bg-white/[0.06]"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* QR CODE READY - Show QR for scanning (fallback mode) */}
        {status === 'qr_ready' && qrCode && (
          <div className="space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-emerald-300 text-xs font-medium">Scan QR Code with WhatsApp</p>
              </div>
              <p className="text-[#9CA3AF] text-xs leading-relaxed">
                Open WhatsApp on your phone → Settings → Linked Devices → Link a Device → Scan this QR code
              </p>
            </div>

            {/* QR Code Image */}
            <div className="flex justify-center">
              <div className="bg-white rounded-xl p-3 shadow-lg shadow-black/20">
                <img
                  src={qrCode}
                  alt="WhatsApp QR Code"
                  className="w-56 h-56 object-contain"
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
              <p className="text-[#9CA3AF] text-xs">Waiting for scan... (auto-detects)</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full bg-white/[0.03] border-white/[0.06] text-[#9CA3AF] hover:text-white hover:bg-white/[0.06]"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* CONNECTING STATE */}
        {status === 'connecting' && (
          <div className="space-y-3">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Phone className="h-8 w-8 text-blue-400 animate-pulse" />
                  <Loader2 className="h-4 w-4 text-blue-300 animate-spin absolute -bottom-1 -right-1" />
                </div>
                <div>
                  <p className="text-blue-300 text-sm font-medium">Connecting to WhatsApp...</p>
                  <p className="text-blue-400/60 text-xs mt-0.5">
                    {showQR ? 'Generating QR code' : 'Requesting pairing code'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div className="space-y-3">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-red-300 text-xs font-medium">Connection Failed</p>
                  <p className="text-[#9CA3AF] text-xs mt-0.5">{errorMsg}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IDLE / ERROR STATE - Show phone input + QR toggle */}
        {(status === 'idle' || status === 'error') && (
          <div className="space-y-3">
            {status === 'idle' && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <p className="text-emerald-300 text-xs font-medium">Link Your WhatsApp Device</p>
                </div>
                <p className="text-[#9CA3AF] text-xs leading-relaxed">
                  Enter your WhatsApp phone number below. We&apos;ll give you an 8-digit code to
                  enter in your WhatsApp phone app (Settings → Linked Devices → Link a Device → Link with phone number instead).
                </p>
              </div>
            )}

            {/* Phone number input (pairing code mode) */}
            {!showQR && (
              <>
                <div className="space-y-2">
                  <Label className="text-[#9CA3AF] text-xs">WhatsApp Phone Number</Label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 019-2831"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConnectWithPhone()}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="bg-white/[0.03] border-white/[0.06] text-white text-sm h-10"
                  />
                  <p className="text-[10px] text-[#6B7280]">
                    Include country code
                  </p>
                </div>

                <Button
                  onClick={handleConnectWithPhone}
                  disabled={!phoneNumber.trim()}
                  className="w-full h-10 bg-[#10B981] text-white font-medium hover:bg-[#059669] shadow-lg shadow-[#10B981]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-sm disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Get Pairing Code
                </Button>

                <button
                  onClick={() => setShowQR(true)}
                  className="w-full text-center text-[11px] text-[#6B7280] hover:text-[#9CA3AF] transition-colors py-1"
                >
                  Or use QR code instead →
                </button>
              </>
            )}

            {/* QR mode toggle */}
            {showQR && (
              <>
                <Button
                  onClick={handleConnectWithQR}
                  className="w-full h-10 bg-[#10B981] text-white font-medium hover:bg-[#059669] shadow-lg shadow-[#10B981]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-sm"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Connect WhatsApp (QR Scan)
                </Button>

                <button
                  onClick={() => setShowQR(false)}
                  className="w-full text-center text-[11px] text-[#6B7280] hover:text-[#9CA3AF] transition-colors py-1"
                >
                  ← Use phone number instead
                </button>
              </>
            )}

            <div className="flex items-start gap-2 px-1">
              <Shield className="h-3 w-3 text-[#4B5563] mt-0.5 shrink-0" />
              <p className="text-[#4B5563] text-[10px] leading-relaxed">
                Your WhatsApp session is saved securely. It stays linked until you disconnect.
                No passwords stored — uses WhatsApp&apos;s official device linking.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== GMAIL LOGIN CARD ====================
function GmailLoginCard({
  channelId,
  channelName,
  onDelete,
}: {
  channelId?: string
  channelName?: string
  onDelete?: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<string>('idle')
  const [errorType, setErrorType] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState('')
  const [connectedEmail, setConnectedEmail] = useState('')

  // Check existing Gmail connection on mount
  useEffect(() => {
    checkGmailStatus()
  }, [channelId])

  const checkGmailStatus = async () => {
    try {
      const data = await api.post<{
        sessionActive: boolean
        channel: { status: string; email: string | null; connectedOn: string | null } | null
      }>('/messaging/gmail-login', { action: 'status', channelId })

      if (data.sessionActive || data.channel?.status === 'connected') {
        setStatus('connected')
        if (data.channel?.email) setConnectedEmail(data.channel.email)
      }
    } catch {
      // Ignore - channel not connected yet
    }
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return

    setStatus('connecting')
    setErrorMsg('')
    setErrorType('')

    try {
      const data = await api.post<{
        success: boolean
        email?: string
        error?: string
        errorType?: string
        step?: string
      }>('/messaging/gmail-login', {
        action: 'login',
        channelId,
        email: email.trim(),
        password,
      })

      if (data.success) {
        setStatus('connected')
        setConnectedEmail(email.trim())
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Connection failed')
        setErrorType(data.errorType || 'UNKNOWN')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Connection request failed')
    }
  }

  const handleDisconnect = async () => {
    try {
      await api.post('/messaging/gmail-login', { action: 'disconnect', channelId })
      setStatus('idle')
      setConnectedEmail('')
    } catch {
      // Ignore
    }
  }

  return (
    <Card className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#F59E0B15' }}
            >
              <Mail className="h-5 w-5" style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <CardTitle className="text-white text-base flex items-center gap-2">
                {channelName || 'Gmail / Email'}
                <Send className="h-3.5 w-3.5 text-[#6B7280]" />
              </CardTitle>
              <div className="mt-1">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-[#6B7280] hover:text-red-400 p-1 transition-colors"
              title="Delete Channel"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* CONNECTED STATE */}
        {status === 'connected' && (
          <div className="space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-emerald-300 text-sm font-medium">Gmail Connected!</p>
                <p className="text-emerald-400/70 text-xs mt-0.5">
                  SMTP active: {connectedEmail}
                </p>
                <p className="text-[#6B7280] text-xs mt-1">
                  Emails will be sent through this account via SMTP.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              onClick={handleDisconnect}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Disconnect Gmail
            </Button>
          </div>
        )}

        {/* CONNECT FORM (idle or error state) */}
        {(status === 'idle' || status === 'error') && (
          <div className="space-y-3">
            {/* How it works info */}
            {status === 'idle' && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <p className="text-blue-300 text-xs font-medium">Connect via App Password (SMTP)</p>
                </div>
                <p className="text-[#9CA3AF] text-xs leading-relaxed">
                  Enter your Gmail and an App Password. App Passwords are 16-character codes
                  generated from your Google Account. They work even with 2-Step Verification ON.
                </p>
                <div className="mt-2 bg-[#0D1117] rounded-md p-2 text-[#6B7280] text-[10px] leading-relaxed">
                  <p className="font-medium text-[#9CA3AF] mb-0.5">How to get App Password:</p>
                  <p>1. Go to myaccount.google.com → Security</p>
                  <p>2. Enable 2-Step Verification (if not already)</p>
                  <p>3. Search &quot;App passwords&quot; in security settings</p>
                  <p>4. Select &quot;Mail&quot; → Generate → Copy the 16-char code</p>
                </div>
              </div>
            )}

            {/* Error display */}
            {status === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-red-300 text-xs font-medium">Connection Failed</p>
                    <p className="text-[#9CA3AF] text-xs mt-0.5">{errorMsg}</p>
                    {(errorType === 'WRONG_CREDENTIALS' || errorType === 'APP_PASSWORD_REQUIRED') && (
                      <p className="text-amber-400/70 text-xs mt-1">
                        Make sure you are using an App Password, not your regular Google password.
                        Go to Google Account → Security → App Passwords to generate one.
                      </p>
                    )}
                    {errorType === 'NETWORK_ERROR' && (
                      <p className="text-amber-400/70 text-xs mt-1">
                        Check your internet connection. Gmail SMTP may be blocked on some networks.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1.5">
              <Label className="text-[#9CA3AF] text-xs">Gmail Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <Input
                  type="email"
                  placeholder="your-email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-[#0D1117] border-white/[0.08] text-white placeholder:text-[#4B5563] h-9 text-sm focus:border-[#F59E0B]/50"
                />
              </div>
            </div>

            {/* App Password Input */}
            <div className="space-y-1.5">
              <Label className="text-[#9CA3AF] text-xs">App Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 bg-[#0D1117] border-white/[0.08] text-white placeholder:text-[#4B5563] h-9 text-sm focus:border-[#F59E0B]/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Connect Button */}
            <Button
              onClick={handleLogin}
              disabled={!email.trim() || !password.trim()}
              className="w-full h-9 bg-[#F59E0B] text-black font-medium hover:bg-[#D97706] shadow-lg shadow-[#F59E0B]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <Send className="h-4 w-4 mr-2" />
              Connect Gmail
            </Button>

            {/* Security note */}
            <div className="flex items-start gap-2 px-1">
              <Shield className="h-3 w-3 text-[#4B5563] mt-0.5 shrink-0" />
              <p className="text-[#4B5563] text-[10px] leading-relaxed">
                Your App Password is stored securely. It is never shared — only used to send emails
                through your Gmail account via encrypted SMTP connection.
              </p>
            </div>
          </div>
        )}

        {/* CONNECTING STATE */}
        {status === 'connecting' && (
          <div className="space-y-3">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Mail className="h-8 w-8 text-blue-400 animate-pulse" />
                  <Loader2 className="h-4 w-4 text-blue-300 animate-spin absolute -bottom-1 -right-1" />
                </div>
                <div>
                  <p className="text-blue-300 text-sm font-medium">Testing SMTP Connection...</p>
                  <p className="text-blue-400/60 text-xs mt-0.5">
                    Connecting to Gmail as {email}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin shrink-0" />
                  <span className="text-xs text-blue-300">Connecting to smtp.gmail.com:587</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 rounded-full border border-[#4B5563] shrink-0" />
                  <span className="text-xs text-[#4B5563]">Verifying credentials</span>
                </div>
              </div>
            </div>
            <p className="text-[#4B5563] text-xs text-center">
              This takes 3-5 seconds...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== SIM BOX CONFIG CARD ====================
function SimBoxConfigCard({
  channelId,
  channelName,
  onDelete,
}: {
  channelId?: string
  channelName?: string
  onDelete?: () => void
}) {
  const [host, setHost] = useState('')
  const [httpPort, setHttpPort] = useState('80')
  const [httpUser, setHttpUser] = useState('')
  const [httpPass, setHttpPass] = useState('')
  const [smppPort, setSmppPort] = useState('20002')

  const [status, setStatus] = useState<string>('idle')
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    checkStatus()
  }, [channelId])

  const checkStatus = async () => {
    try {
      const data = await api.post<{
        status: string
        config?: any
      }>('/messaging/sms', { action: 'status', channelId })

      if (data.status === 'connected') {
        setStatus('connected')
      }
      if (data.config) {
        if (data.config.host) setHost(data.config.host)
        if (data.config.httpPort) setHttpPort(String(data.config.httpPort))
        if (data.config.httpUser) setHttpUser(data.config.httpUser)
        if (data.config.httpPass) setHttpPass(data.config.httpPass)
      }
    } catch {}
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setMsg('')
    try {
      const data = await api.post<{
        success: boolean
        message?: string
        error?: string
      }>('/messaging/sms', {
        action: 'test',
        channelId,
        host: host.trim(),
        httpPort: parseInt(httpPort, 10) || 80,
        httpUser: httpUser.trim(),
        httpPass,
        smppPort: parseInt(smppPort, 10) || 20002,
      })

      if (data.success) {
        setStatus('connected')
        setMsg(data.message || 'Skyline Gateway Connected Successfully!')
      } else {
        setStatus('error')
        setMsg(data.error || 'Connection test failed.')
      }
    } catch (err) {
      setStatus('error')
      setMsg(err instanceof Error ? err.message : 'Connection test request failed.')
    } finally {
      setTesting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await api.post('/messaging/sms', { action: 'disconnect', channelId })
      setStatus('idle')
      setMsg('')
    } catch {}
  }

  return (
    <Card className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#7C3AED15' }}
            >
              <MessageSquare className="h-5 w-5" style={{ color: '#A78BFA' }} />
            </div>
            <div>
              <CardTitle className="text-white text-base flex items-center gap-2">
                {channelName || 'SMS SIM Box'}
                <Radio className="h-3.5 w-3.5 text-[#6B7280]" />
              </CardTitle>
              <div className="mt-1">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-[#6B7280] hover:text-red-400 p-1 transition-colors"
              title="Delete Channel"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'connected' ? (
          <div className="space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <p className="text-emerald-300 text-xs font-semibold">Skyline Gateway Active!</p>
              </div>
              <p className="text-[#9CA3AF] text-xs">
                Host: <span className="text-white font-mono">{host}:{httpPort}</span> | SMPP Port: <span className="text-white font-mono">{smppPort}</span>
              </p>
              <p className="text-[#6B7280] text-[11px] mt-1">
                32 SIM card ports ready for sticky-rotation bulk SMS outreach.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="w-full bg-[#0D1117] border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Disconnect SIM Box
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[#9CA3AF] text-[11px]">Gateway IP Address</Label>
                  <Input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="192.168.1.16"
                    className="bg-white/[0.03] border-white/[0.06] text-white text-xs h-8 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[#9CA3AF] text-[11px]">HTTP Port</Label>
                  <Input
                    type="text"
                    value={httpPort}
                    onChange={(e) => setHttpPort(e.target.value)}
                    placeholder="80"
                    className="bg-white/[0.03] border-white/[0.06] text-white text-xs h-8 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[#9CA3AF] text-[11px]">HTTP User</Label>
                  <Input
                    type="text"
                    value={httpUser}
                    onChange={(e) => setHttpUser(e.target.value)}
                    placeholder="root"
                    className="bg-white/[0.03] border-white/[0.06] text-white text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[#9CA3AF] text-[11px]">HTTP Pass</Label>
                  <Input
                    type="password"
                    value={httpPass}
                    onChange={(e) => setHttpPass(e.target.value)}
                    placeholder="Sign4321$"
                    className="bg-white/[0.03] border-white/[0.06] text-white text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {msg && (
              <p className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                {msg}
              </p>
            )}

            <Button
              size="sm"
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-md shadow-[#7C3AED]/20 text-xs"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Zap className="h-3.5 w-3.5 mr-1" />
              )}
              Test SIM Box Connection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const getChannelIcon = (type?: string) => {
  switch ((type || '').toLowerCase()) {
    case 'sms': return MessageSquare
    case 'whatsapp': return Phone
    case 'email': return Mail
    default: return Radio
  }
}

const getChannelColor = (type?: string) => {
  switch ((type || '').toLowerCase()) {
    case 'sms': return '#3B82F6'
    case 'whatsapp': return '#10B981'
    case 'email': return '#EA4335'
    default: return '#7C3AED'
  }
}

// ==================== MAIN CHANNELS PAGE ====================
export default function Channels() {
  const [enabledStates, setEnabledStates] = useState<Record<string, boolean>>({})
  const [realChannels, setRealChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'all' | 'whatsapp' | 'email' | 'sms'>('all')

  // Add Channel Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [newChannelType, setNewChannelType] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp')
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelPhone, setNewChannelPhone] = useState('')
  const [newChannelEmail, setNewChannelEmail] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const loadChannels = useCallback(async () => {
    try {
      const data = await api.get<{ channels: any[] }>('/channels')
      if (data.channels && Array.isArray(data.channels)) {
        setRealChannels(data.channels)
        setEnabledStates(Object.fromEntries(data.channels.map((c) => [c.id, c.enabled ?? true])))
      }
    } catch (err) {
      console.error('Failed to load channels:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  const toggleChannel = async (id: string) => {
    const newState = !enabledStates[id]
    setEnabledStates((prev) => ({ ...prev, [id]: newState }))
    try {
      await api.put(`/channels/${id}`, { enabled: newState })
    } catch (err) {
      console.error('Failed to toggle channel:', err)
      setEnabledStates((prev) => ({ ...prev, [id]: !newState }))
    }
  }

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return
    setIsCreating(true)
    try {
      await api.post('/channels', {
        type: newChannelType,
        name: newChannelName.trim(),
        phone: newChannelPhone.trim() || undefined,
        email: newChannelEmail.trim() || undefined,
      })
      await loadChannels()
      setShowAddModal(false)
      setNewChannelName('')
      setNewChannelPhone('')
      setNewChannelEmail('')
    } catch (err) {
      console.error('Failed to create channel:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteChannel = async (id: string) => {
    try {
      await api.delete(`/channels/${id}`)
      setRealChannels((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.error('Failed to delete channel:', err)
    }
  }

  const activeChannels = realChannels

  const whatsappChannels = activeChannels.filter((c) => (c.type || '').toLowerCase() === 'whatsapp' || c.id === 'whatsapp')
  const emailChannels = activeChannels.filter((c) => (c.type || '').toLowerCase() === 'email' || c.id === 'email')
  const smsChannels = activeChannels.filter((c) => (c.type || '').toLowerCase() === 'sms' || c.id === 'sms')

  const filteredChannels =
    activeTab === 'whatsapp'
      ? whatsappChannels
      : activeTab === 'email'
      ? emailChannels
      : activeTab === 'sms'
      ? smsChannels
      : activeChannels

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radio className="h-6 w-6 text-[#7C3AED]" />
            Channels
          </h1>
          <p className="text-[#9CA3AF] mt-1">
            Manage multiple WhatsApp numbers, Gmail/SMTP accounts, and SMS SIM boxes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setNewChannelType('whatsapp')
              setNewChannelName(`WhatsApp Line ${whatsappChannels.length + 1}`)
              setShowAddModal(true)
            }}
            className="bg-emerald-500 text-white hover:bg-emerald-600 text-xs shadow-md shadow-emerald-500/10"
          >
            <Phone className="h-3.5 w-3.5 mr-1" />
            + WhatsApp
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setNewChannelType('email')
              setNewChannelName(`Gmail API / SMTP ${emailChannels.length + 1}`)
              setShowAddModal(true)
            }}
            className="bg-amber-500 text-white hover:bg-amber-600 text-xs shadow-md shadow-amber-500/10"
          >
            <Mail className="h-3.5 w-3.5 mr-1" />
            + Email
          </Button>



          <Button
            size="sm"
            onClick={() => {
              setNewChannelType('sms')
              setNewChannelName(`SIM Box Line ${smsChannels.length + 1}`)
              setShowAddModal(true)
            }}
            className="bg-[#7C3AED] text-white hover:bg-[#6D28D9] text-xs shadow-md shadow-[#7C3AED]/10"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            + SIM Box
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20'
              : 'bg-[#141825] text-[#9CA3AF] hover:text-white border border-white/[0.06]'
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          All Channels ({activeChannels.length})
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
            activeTab === 'whatsapp'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-[#141825] text-[#9CA3AF] hover:text-white border border-white/[0.06]'
          }`}
        >
          <Phone className="h-3.5 w-3.5" />
          WhatsApp ({whatsappChannels.length})
        </button>



        <button
          onClick={() => setActiveTab('sms')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
            activeTab === 'sms'
              ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20'
              : 'bg-[#141825] text-[#9CA3AF] hover:text-white border border-white/[0.06]'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          SMS SIM Box ({smsChannels.length})
        </button>
      </div>

      {/* Channel Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {filteredChannels.map((channel) => {
          const type = (channel.type || channel.id || '').toLowerCase()

          // If WhatsApp channel, render interactive WhatsApp card!
          if (type === 'whatsapp') {
            return (
              <WhatsAppConnectCard
                key={channel.id}
                channelId={channel.id}
                channelName={channel.name}
                onDelete={channel.id !== 'whatsapp' ? () => handleDeleteChannel(channel.id) : undefined}
              />
            )
          }

          // If Email channel, render interactive Gmail login card!
          if (type === 'email') {
            return (
              <GmailLoginCard
                key={channel.id}
                channelId={channel.id}
                channelName={channel.name}
                onDelete={channel.id !== 'email' ? () => handleDeleteChannel(channel.id) : undefined}
              />
            )
          }

          // If SMS / SIM Box channel, render interactive SimBoxConfigCard!
          if (type === 'sms') {
            return (
              <SimBoxConfigCard
                key={channel.id}
                channelId={channel.id}
                channelName={channel.name}
                onDelete={channel.id !== 'sms' ? () => handleDeleteChannel(channel.id) : undefined}
              />
            )
          }

          // Standard SMS / SIM Box card
          const Icon = channel.icon || getChannelIcon(channel.type)
          const channelColor = channel.color || getChannelColor(channel.type)
          const isEnabled = enabledStates[channel.id]

          return (
            <Card
              key={channel.id}
              className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${channelColor}15` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: channelColor }} />
                    </div>
                    <div>
                      <CardTitle className="text-white text-base">{channel.name}</CardTitle>
                      <div className="mt-1">
                        <StatusBadge status={channel.status} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`toggle-${channel.id}`}
                      checked={isEnabled}
                      onCheckedChange={() => toggleChannel(channel.id)}
                    />
                    {channel.id !== 'sms' && (
                      <button
                        onClick={() => handleDeleteChannel(channel.id)}
                        className="text-[#6B7280] hover:text-red-400 p-1 transition-colors"
                        title="Delete Channel"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2.5">
                  {Object.entries(channel.config || {}).map(([key, value]) => {
                    const DetailIcon = getDetailIcon(key)
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-[#9CA3AF] text-sm flex items-center gap-1.5">
                          <DetailIcon className="h-3.5 w-3.5 text-[#6B7280]" />
                          {key}
                        </span>
                        <span className="text-white text-sm font-medium">{value}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="border-t border-white/[0.06]" />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-[#0D1117] border-white/[0.06] hover:bg-white/[0.05] text-[#9CA3AF] hover:text-white"
                  >
                    <Settings className="h-3.5 w-3.5 mr-1" />
                    Configure
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                  >
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Tab-specific Quick Add Card */}
        {activeTab === 'whatsapp' && (
          <div
            onClick={() => {
              setNewChannelType('whatsapp')
              setNewChannelName(`WhatsApp Line ${whatsappChannels.length + 1}`)
              setShowAddModal(true)
            }}
            className="bg-[#0D1117] border border-dashed border-emerald-500/30 hover:border-emerald-500/60 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all hover:-translate-y-0.5 min-h-[220px]"
          >
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Plus className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">+ Add New WhatsApp Number</p>
              <p className="text-[#6B7280] text-xs mt-1">Link an additional WhatsApp phone number via QR code or Pairing code</p>
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div
            onClick={() => {
              setNewChannelType('email')
              setNewChannelName(`Gmail SMTP ${emailChannels.length + 1}`)
              setShowAddModal(true)
            }}
            className="bg-[#0D1117] border border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all hover:-translate-y-0.5 min-h-[220px]"
          >
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Plus className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">+ Connect New Gmail / Email Account</p>
              <p className="text-[#6B7280] text-xs mt-1">Add sales or support email address for lead outreach</p>
            </div>
          </div>
        )}

        {activeTab === 'sms' && (
          <div
            onClick={() => {
              setNewChannelType('sms')
              setNewChannelName(`SIM Box Line ${smsChannels.length + 1}`)
              setShowAddModal(true)
            }}
            className="bg-[#0D1117] border border-dashed border-[#7C3AED]/30 hover:border-[#7C3AED]/60 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all hover:-translate-y-0.5 min-h-[220px]"
          >
            <div className="h-12 w-12 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
              <Plus className="h-6 w-6 text-[#A78BFA]" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">+ Add New SIM Box Channel</p>
              <p className="text-[#6B7280] text-xs mt-1">Connect another GOIP / Skyline SIM box port</p>
            </div>
          </div>
        )}
      </div>

      {/* ADD CHANNEL MODAL DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141825] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#7C3AED]" />
                Add New Communication Channel
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#9CA3AF] hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-[#9CA3AF]">Select Channel Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewChannelType('whatsapp')}
                    className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                      newChannelType === 'whatsapp'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                        : 'bg-white/[0.03] border-white/[0.06] text-[#9CA3AF]'
                    }`}
                  >
                    <Phone className="h-4 w-4" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChannelType('email')}
                    className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                      newChannelType === 'email'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                        : 'bg-white/[0.03] border-white/[0.06] text-[#9CA3AF]'
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                    Gmail / Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChannelType('sms')}
                    className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                      newChannelType === 'sms'
                        ? 'bg-[#7C3AED]/15 border-[#7C3AED] text-[#A78BFA]'
                        : 'bg-white/[0.03] border-white/[0.06] text-[#9CA3AF]'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    SMS SIM Box
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-[#9CA3AF]">Channel Name / Label</Label>
                <Input
                  type="text"
                  placeholder={
                    newChannelType === 'whatsapp'
                      ? 'e.g. Sales WhatsApp #2'
                      : newChannelType === 'email'
                      ? 'e.g. Support Gmail'
                      : 'e.g. Skyline GOIP Port 2'
                  }
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.06] text-white text-sm h-10"
                />
              </div>

              {newChannelType === 'whatsapp' && (
                <div className="space-y-2">
                  <Label className="text-xs text-[#9CA3AF]">Phone Number (Optional)</Label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 019-2831"
                    value={newChannelPhone}
                    onChange={(e) => setNewChannelPhone(e.target.value)}
                    className="bg-white/[0.03] border-white/[0.06] text-white text-sm h-10"
                  />
                </div>
              )}

              {newChannelType === 'email' && (
                <div className="space-y-2">
                  <Label className="text-xs text-[#9CA3AF]">Email Address (Optional)</Label>
                  <Input
                    type="email"
                    placeholder="sales@carline.com"
                    value={newChannelEmail}
                    onChange={(e) => setNewChannelEmail(e.target.value)}
                    className="bg-white/[0.03] border-white/[0.06] text-white text-sm h-10"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-white/[0.03] border-white/[0.06] text-[#9CA3AF] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim() || isCreating}
                className="flex-1 bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Channel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getDetailIcon(key: string) {
  if (key.toLowerCase().includes('provider') || key.toLowerCase().includes('smtp')) return Server
  if (key.toLowerCase().includes('number') || key.toLowerCase().includes('phone')) return Hash
  if (key.toLowerCase().includes('account') || key.toLowerCase().includes('address') || key.toLowerCase().includes('from')) return User
  if (key.toLowerCase().includes('sent') || key.toLowerCase().includes('email')) return Send
  if (key.toLowerCase().includes('cost')) return DollarSign
  return Clock
}