'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CalendarClock,
  CheckCircle2,
  XCircle,
  TrendingDown,
  CalendarDays,
  MessageSquare,
  Phone,
  Mail,
  Check,
  RefreshCw,
  Ban,
  Trash2,
} from 'lucide-react'

type Channel = 'SMS' | 'WhatsApp' | 'Email'

const channelConfig: Record<Channel, { color: string; icon: typeof MessageSquare }> = {
  SMS: { color: 'bg-purple-500/15 text-purple-400', icon: MessageSquare },
  WhatsApp: { color: 'bg-green-500/15 text-green-400', icon: Phone },
  Email: { color: 'bg-orange-500/15 text-orange-400', icon: Mail },
}

interface Appointment {
  id: string | number
  name: string
  phone: string
  channel: Channel
  dateTime: string
  status: string
  notes: string
}

export default function Appointments() {
  const [qualifiedLeads, setQualifiedLeads] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get<{ leads: any[] }>('/leads?limit=100')
      if (data.leads && Array.isArray(data.leads)) {
        // Filter leads qualified by DeepSeek AI for $50k pre-approval & Coordinator Ayesha handoff
        const appts: Appointment[] = data.leads
          .filter((l) => l.status?.toLowerCase() === 'qualified' || l.status?.toLowerCase() === 'appointment' || l.activityType?.includes('Ayesha') || l.activityType?.includes('Pre-Approved'))
          .map((l) => ({
            id: l.id,
            name: l.name || 'Lead',
            phone: l.phone,
            channel: (l.channel || 'WhatsApp') as Channel,
            dateTime: l.time || 'Today',
            status: 'Confirmed',
            notes: l.activityType || 'Pre-Approved up to $50,000! Transferred to Coordinator Ayesha (437-535-3576).',
          }))

        setQualifiedLeads(appts)
      }
    } catch (err) {
      console.error('Failed to load appointments:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAppointments()
    const interval = setInterval(loadAppointments, 5000) // 5s live polling
    return () => clearInterval(interval)
  }, [loadAppointments])

  // Live Stats
  const statCards = [
    {
      label: 'AI Qualified Handoffs',
      value: qualifiedLeads.length.toString(),
      change: '100% Real DB',
      positive: true,
      icon: CalendarClock,
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
    },
    {
      label: 'Coordinator Ayesha Assigned',
      value: qualifiedLeads.length.toString(),
      change: '437-535-3576',
      positive: true,
      icon: CheckCircle2,
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
    },
    {
      label: '$50,000 Pre-Approvals',
      value: qualifiedLeads.length.toString(),
      change: 'Active Offers',
      positive: true,
      icon: TrendingDown,
      iconBg: 'bg-[#7C3AED]/20',
      iconColor: 'text-[#A78BFA]',
    },
  ]

  const handleDelete = async (id: string | number) => {
    try {
      await api.delete(`/leads?id=${id}`)
      await loadAppointments()
    } catch (err) {
      console.error('Failed to delete appointment:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-[#7C3AED]" />
            Appointments & AI Qualified Handoffs
          </h1>
          <p className="text-[#9CA3AF] mt-1 text-sm">
            Real-time qualified leads granted $50,000 pre-approval and transferred to Coordinator Ayesha (437-535-3576)
          </p>
        </div>
        <button
          onClick={loadAppointments}
          className="flex items-center gap-2 text-xs font-medium text-purple-300 hover:text-white bg-[#141825] border border-white/10 px-3 py-2 rounded-xl transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
          Refresh Handoffs
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#9CA3AF] font-medium">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-white">{loading ? '...' : stat.value}</p>
                  <p className="mt-1 text-xs font-medium text-emerald-400">{stat.change}</p>
                </div>
                <div className={`rounded-xl p-3 ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main Qualified Appointments Table ── */}
      <Card className="bg-[#141825] border border-white/[0.06] rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-[#9CA3AF] text-xs font-medium">Lead Name</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium">Phone</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium">Channel</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium">Qualified Time</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium">Status</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium">DeepSeek AI Qualification Notes</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qualifiedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-[#9CA3AF] text-xs">
                      <CalendarDays className="h-10 w-10 text-[#6B7280] opacity-40 mx-auto mb-2" />
                      <p className="font-semibold text-white text-sm">No Qualified Appointments Yet</p>
                      <p className="mt-1 text-xs text-[#6B7280]">
                        As soon as a lead completes vehicle & income questions and is granted the $50,000 Pre-Approval offer by DeepSeek AI, their record will appear here live!
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  qualifiedLeads.map((appt) => {
                    const channelCfg = channelConfig[appt.channel] || channelConfig.WhatsApp
                    const ChannelIcon = channelCfg.icon

                    return (
                      <TableRow
                        key={appt.id}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7C3AED]/20 text-xs font-bold text-purple-300 uppercase">
                              {appt.name ? appt.name.slice(0, 2) : 'LD'}
                            </div>
                            <span className="font-semibold text-white whitespace-nowrap text-xs">{appt.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#9CA3AF] whitespace-nowrap text-xs font-mono">{appt.phone}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${channelCfg.color} gap-1 border-0 text-[10px]`}
                          >
                            <ChannelIcon className="h-3 w-3" />
                            {appt.channel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[#9CA3AF] whitespace-nowrap text-xs font-mono">{appt.dateTime}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 gap-1.5 text-[10px]"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Pre-Approved
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-purple-200 leading-relaxed font-medium">
                            {appt.notes}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(appt.id)}
                            className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}