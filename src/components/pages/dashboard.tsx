'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Send,
  MessageSquare,
  MessageCircle,
  CheckCircle,
  Calendar,
  Activity,
  Brain,
  RefreshCw,
  Phone,
  Mail,
  UserPlus,
  Radio,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DashboardData {
  leadsByStatus: Array<{ status: string; count: number }>
  totalConversations: number
  totalCampaigns: number
  activeChannels: number
  dailyChart: Record<string, number>
  channelPerformance: Array<{ channel: string; count: number }>
}

interface RecentLead {
  id: string
  name: string
  phone: string
  email?: string
  channel: string
  status: string
  time: string
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([])
  const [loading, setLoading] = useState(true)

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const [dashRes, leadsRes] = await Promise.all([
        api.get<DashboardData>('/dashboard'),
        api.get<{ leads: RecentLead[] }>('/leads?limit=5'),
      ])

      setData(dashRes)
      if (leadsRes.leads) {
        setRecentLeads(leadsRes.leads)
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    const interval = setInterval(loadDashboard, 5000) // 5s live polling
    return () => clearInterval(interval)
  }, [])

  const totalLeads = data?.leadsByStatus.reduce((acc, curr) => acc + curr.count, 0) || 0
  const qualifiedLeads = data?.leadsByStatus.find((s) => s.status.toLowerCase() === 'qualified' || s.status.toLowerCase() === 'appointment')?.count || 0

  const metricCards = [
    {
      label: 'Total Leads Uploaded',
      value: totalLeads.toLocaleString(),
      change: '100% Real DB',
      positive: true,
      icon: Users,
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
    },
    {
      label: 'Connected Channels',
      value: (data?.activeChannels || 0).toLocaleString(),
      change: 'Active Hardware',
      positive: true,
      icon: Radio,
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Active Conversations',
      value: (data?.totalConversations || 0).toLocaleString(),
      change: 'Real-Time Sync',
      positive: true,
      icon: MessageCircle,
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-400',
    },
    {
      label: 'AI Qualified Handoffs',
      value: qualifiedLeads.toLocaleString(),
      change: '$50k Pre-Approved',
      positive: true,
      icon: CheckCircle,
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
    },
  ]

  // Dynamic Pie Chart Data for Channels
  const channelPieData = (data?.channelPerformance || []).map((cp) => {
    const ch = cp.channel.toLowerCase()
    return {
      name: ch === 'whatsapp' ? 'WhatsApp' : ch === 'email' ? 'Email' : 'SMS SIM Box',
      value: cp.count,
      color: ch === 'whatsapp' ? '#22C55E' : ch === 'email' ? '#F59E0B' : '#8B5CF6',
    }
  })

  if (channelPieData.length === 0) {
    channelPieData.push({ name: 'No Data Yet', value: 1, color: '#374151' })
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-[#7C3AED]" />
            Dashboard & Live System Status
          </h1>
          <p className="text-[#9CA3AF] mt-1 text-sm">
            Real-time live database analytics for multi-channel outreach & DeepSeek AI qualification
          </p>
        </div>
        <button
          onClick={loadDashboard}
          className="flex items-center gap-2 text-xs font-medium text-purple-300 hover:text-white bg-[#141825] border border-white/10 px-3 py-2 rounded-xl transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
          Refresh Live Data
        </button>
      </div>

      {/* ── Live Metric Cards Row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <Card
            key={card.label}
            className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#9CA3AF] font-medium">{card.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{loading ? '...' : card.value}</p>
                  <p className="text-xs font-medium text-emerald-400 mt-1">{card.change}</p>
                </div>
                <div className={`p-3 rounded-xl ${card.iconBg}`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main Middle Row: Channel Distribution + System Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel Breakdown */}
        <Card className="bg-[#141825] border border-white/[0.06] rounded-xl lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-[#7C3AED]" />
              Leads Channel Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {channelPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D1117', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              {channelPieData.map((cp) => (
                <div key={cp.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cp.color }} />
                  <span className="text-[#9CA3AF] font-medium">{cp.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Recent Leads Feed */}
        <Card className="bg-[#141825] border border-white/[0.06] rounded-xl lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-400" />
              Live Database Leads & Activity Feed
            </CardTitle>
            <span className="text-xs text-[#9CA3AF] font-mono">100% Real DB</span>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-[#9CA3AF] text-xs">Lead</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs">Phone</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs">Status</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-[#9CA3AF] text-xs">
                      No leads in database yet. Upload Excel / Sheet in <strong>Leads & Activity</strong> tab!
                    </TableCell>
                  </TableRow>
                ) : (
                  recentLeads.map((lead) => (
                    <TableRow key={lead.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <TableCell className="font-semibold text-white text-xs">
                        {lead.name}
                      </TableCell>
                      <TableCell className="text-[#9CA3AF] text-xs font-mono">
                        {lead.phone}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[10px]"
                        >
                          {lead.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#9CA3AF] text-xs text-right font-mono">
                        {lead.time}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}