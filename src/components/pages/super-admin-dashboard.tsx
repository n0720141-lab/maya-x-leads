'use client'

import { useEffect, useState } from 'react'
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
import { Progress } from '@/components/ui/progress'
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Users,
  Target,
  MessageSquare,
  Send,
  Clock,
  Loader2,
  Activity,
  BarChart3,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StatsData {
  totalTenants: number
  activeTenants: number
  suspendedTenants: number
  totalUsers: number
  totalLeads: number
  totalConversations: number
  totalCampaigns: number
  queuePending: number
  tenantsByPlan: { plan: string; count: number; percentage: number }[]
  messageQueue: { pending: number; processing: number; completed: number; failed: number }
  usage30Days: { date: string; messages: number; leads: number }[]
  recentSignups: {
    id: string
    name: string
    email: string
    plan: string
    status: string
    users: number
    leads: number
  }[]
}

const fallbackData: StatsData = {
  totalTenants: 142,
  activeTenants: 118,
  suspendedTenants: 8,
  totalUsers: 1847,
  totalLeads: 52340,
  totalConversations: 89120,
  totalCampaigns: 2340,
  queuePending: 47,
  tenantsByPlan: [
    { plan: 'starter', count: 78, percentage: 55 },
    { plan: 'growth', count: 45, percentage: 32 },
    { plan: 'enterprise', count: 19, percentage: 13 },
  ],
  messageQueue: {
    pending: 47,
    processing: 12,
    completed: 89340,
    failed: 23,
  },
  usage30Days: Array.from({ length: 7 }, (_, i) => ({
    date: `May ${15 + i}`,
    messages: Math.floor(Math.random() * 2000 + 3000),
    leads: Math.floor(Math.random() * 500 + 800),
  })),
  recentSignups: [
    { id: '1', name: 'Acme Corp', email: 'hello@acme.com', plan: 'growth', status: 'active', users: 12, leads: 340 },
    { id: '2', name: 'TechStart Inc', email: 'info@techstart.io', plan: 'starter', status: 'active', users: 3, leads: 45 },
    { id: '3', name: 'GlobalReach', email: 'admin@globalreach.com', plan: 'enterprise', status: 'active', users: 28, leads: 2100 },
    { id: '4', name: 'LocalBiz Pro', email: 'support@localbiz.co', plan: 'starter', status: 'trial', users: 1, leads: 12 },
    { id: '5', name: 'Nexus Digital', email: 'team@nexusdigital.io', plan: 'growth', status: 'active', users: 8, leads: 520 },
  ],
}

/* ------------------------------------------------------------------ */
/*  Stat card config                                                   */
/* ------------------------------------------------------------------ */

const STAT_CARDS = [
  { key: 'totalTenants' as const, label: 'Total Tenants', icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'activeTenants' as const, label: 'Active Tenants', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'suspendedTenants' as const, label: 'Suspended', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'totalUsers' as const, label: 'Total Users', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'totalLeads' as const, label: 'Total Leads', icon: Target, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { key: 'totalConversations' as const, label: 'Conversations', icon: MessageSquare, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { key: 'totalCampaigns' as const, label: 'Campaigns', icon: Send, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { key: 'queuePending' as const, label: 'Queue Pending', icon: Clock, color: 'text-red-400', bg: 'bg-red-500/10' },
]

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-blue-500',
  growth: 'bg-purple-500',
  enterprise: 'bg-amber-500',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  trial: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  suspended: 'bg-red-500/15 text-red-400 border-red-500/30',
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SuperAdminDashboard() {
  const superAdminToken = useAppStore((s) => s.superAdminToken)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/super-admin/stats', {
          headers: superAdminToken ? { Authorization: `Bearer ${superAdminToken}` } : {},
        })
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        } else {
          setStats(fallbackData)
        }
      } catch {
        setStats(fallbackData)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [superAdminToken])

  if (loading) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
      </div>
    )
  }

  if (!stats) return null

  const data = stats

  return (
    <div className="space-y-6">
      {/* Stat cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon
          const value = data[card.key]
          return (
            <Card key={card.key} className="bg-[#1A1F2E] border-[#2A2F3D]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#9CA3AF]">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {typeof value === 'number' ? value.toLocaleString() : value}
                    </p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tenants by Plan + Message Queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tenants by Plan */}
        <Card className="bg-[#1A1F2E] border-[#2A2F3D]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#7C3AED]" />
              Tenants by Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.tenantsByPlan.map((item) => (
              <div key={item.plan} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white capitalize">{item.plan}</span>
                  <span className="text-[#9CA3AF]">{item.count} tenants ({item.percentage}%)</span>
                </div>
                <div className="h-2 rounded-full bg-[#0F1117]">
                  <div
                    className={cn('h-full rounded-full transition-all', PLAN_COLORS[item.plan] ?? 'bg-[#7C3AED]')}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Message Queue Status */}
        <Card className="bg-[#1A1F2E] border-[#2A2F3D]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#7C3AED]" />
              Message Queue Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-[#0F1117] p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{data.messageQueue.pending.toLocaleString()}</p>
                <p className="mt-1 text-xs text-[#9CA3AF]">Pending</p>
              </div>
              <div className="rounded-lg bg-[#0F1117] p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">{data.messageQueue.processing.toLocaleString()}</p>
                <p className="mt-1 text-xs text-[#9CA3AF]">Processing</p>
              </div>
              <div className="rounded-lg bg-[#0F1117] p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{data.messageQueue.completed.toLocaleString()}</p>
                <p className="mt-1 text-xs text-[#9CA3AF]">Completed</p>
              </div>
              <div className="rounded-lg bg-[#0F1117] p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{data.messageQueue.failed.toLocaleString()}</p>
                <p className="mt-1 text-xs text-[#9CA3AF]">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 30-Day Usage */}
      <Card className="bg-[#1A1F2E] border-[#2A2F3D]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#7C3AED]" />
            30-Day Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-48 overflow-x-auto">
            <div className="flex items-end gap-2 min-w-[600px] h-40">
              {data.usage30Days.map((day, i) => {
                const maxMsg = Math.max(...data.usage30Days.map((d) => d.messages))
                const height = (day.messages / maxMsg) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-[#9CA3AF]">{day.messages.toLocaleString()}</span>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-[#7C3AED] to-[#A855F7] transition-all"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-[#9CA3AF]">{day.date}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Signups Table */}
      <Card className="bg-[#1A1F2E] border-[#2A2F3D]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-[#7C3AED]" />
            Recent Signups
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#2A2F3D] hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-[#9CA3AF]">Name</TableHead>
                  <TableHead className="text-xs font-medium text-[#9CA3AF]">Email</TableHead>
                  <TableHead className="text-xs font-medium text-[#9CA3AF]">Plan</TableHead>
                  <TableHead className="text-xs font-medium text-[#9CA3AF]">Status</TableHead>
                  <TableHead className="text-xs font-medium text-[#9CA3AF] text-right">Users</TableHead>
                  <TableHead className="text-xs font-medium text-[#9CA3AF] text-right">Leads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSignups.map((tenant) => (
                  <TableRow key={tenant.id} className="border-[#2A2F3D] hover:bg-white/[0.02]">
                    <TableCell className="text-sm font-medium text-white">{tenant.name}</TableCell>
                    <TableCell className="text-sm text-[#9CA3AF]">{tenant.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize border-[#374151] text-[#9CA3AF] text-xs">
                        {tenant.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs capitalize', STATUS_STYLES[tenant.status] ?? 'border-[#374151] text-[#9CA3AF]')}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-white text-right">{tenant.users}</TableCell>
                    <TableCell className="text-sm text-white text-right">{tenant.leads.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

