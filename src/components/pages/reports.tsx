'use client'

import { useState } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  TrendingUp,
  DollarSign,
  Target,
  CalendarDays,
  BarChart3,
  Brain,
  ArrowRight,
  MessageSquare,
  Mail,
  Phone,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const engagementTrend = Array.from({ length: 30 }, (_, i) => ({
  day: `May ${i + 1}`,
  leads: Math.floor(30 + Math.random() * 25 + (i > 10 ? 10 : 0) + (i > 20 ? 5 : 0)),
  replies: Math.floor(20 + Math.random() * 18 + (i > 10 ? 8 : 0) + (i > 20 ? 4 : 0)),
  qualified: Math.floor(8 + Math.random() * 8 + (i > 15 ? 3 : 0)),
}))

const appointmentsByDay = [
  { day: 'Mon', appointments: 24 },
  { day: 'Tue', appointments: 31 },
  { day: 'Wed', appointments: 28 },
  { day: 'Thu', appointments: 35 },
  { day: 'Fri', appointments: 19 },
  { day: 'Sat', appointments: 12 },
  { day: 'Sun', appointments: 6 },
]

const channelData = [
  {
    channel: 'SMS',
    icon: MessageSquare,
    leads: 524,
    replies: 412,
    replyRate: '78.6%',
    qualified: 148,
    appointments: 62,
    cost: '$4,392',
    color: '#7C3AED',
  },
  {
    channel: 'WhatsApp',
    icon: Phone,
    leads: 438,
    replies: 362,
    replyRate: '82.6%',
    qualified: 128,
    appointments: 48,
    cost: '$3,248',
    color: '#10B981',
  },
  {
    channel: 'Email',
    icon: Mail,
    leads: 286,
    replies: 158,
    replyRate: '55.2%',
    qualified: 50,
    appointments: 18,
    cost: '$2,560',
    color: '#F59E0B',
  },
]

const pieData = [
  { name: 'SMS', value: 524, color: '#7C3AED' },
  { name: 'WhatsApp', value: 438, color: '#10B981' },
  { name: 'Email', value: 286, color: '#F59E0B' },
]

const funnelSteps = [
  { label: 'Leads Imported', count: 1248, color: '#7C3AED' },
  { label: 'Contacted', count: 1102, color: '#8B5CF6' },
  { label: 'Replied', count: 932, color: '#6366F1' },
  { label: 'Qualified', count: 326, color: '#3B82F6' },
  { label: 'Appointment Set', count: 128, color: '#06B6D4' },
  { label: 'Showed Up', count: 98, color: '#10B981' },
  { label: 'Converted', count: 41, color: '#22C55E' },
]

const aiResponseTimeData = [
  { range: '<1s', count: 3241 },
  { range: '1-3s', count: 2892 },
  { range: '3-5s', count: 1567 },
  { range: '5-10s', count: 982 },
  { range: '10-30s', count: 712 },
  { range: '30-60s', count: 348 },
  { range: '>60s', count: 100 },
]

const overviewMetrics = [
  {
    label: 'Total Leads',
    value: '1,248',
    change: '+18.5%',
    positive: true,
    icon: Users,
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
  },
  {
    label: 'Conversion Rate',
    value: '10.3%',
    change: '+2.1%',
    positive: true,
    icon: Target,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    label: 'Revenue Generated',
    value: '$124,500',
    change: '+24.3%',
    positive: true,
    icon: DollarSign,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
  },
  {
    label: 'Cost Per Lead',
    value: '$8.42',
    change: '-12.1%',
    positive: true,
    icon: TrendingUp,
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
]

const aiMetrics = [
  {
    label: 'Questions Asked',
    value: '9,842',
    change: '+31.2%',
    positive: true,
    icon: MessageSquare,
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
  },
  {
    label: 'Answers Collected',
    value: '8,721',
    change: '+28.7%',
    positive: true,
    icon: BarChart3,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    label: 'Collection Rate',
    value: '88.6%',
    change: '+4.2%',
    positive: true,
    icon: Target,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
  },
  {
    label: 'Avg Qualification Time',
    value: '3m 42s',
    change: '-18.5%',
    positive: true,
    icon: Brain,
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Custom Tooltip
// ─────────────────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="bg-[#1E2235] border border-white/10 rounded-lg p-3 shadow-xl">
      <p className="text-white text-sm font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: <span className="text-white font-medium">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Reports() {
  const [dateRange, setDateRange] = useState('30d')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">
            Detailed analytics and performance reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CalendarDays className="h-4 w-4 text-[#9CA3AF]" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px] bg-[#141825] border-white/10 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1E2235] border-white/10">
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="14d">Last 14 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="12m">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-[#141825] border border-white/[0.06] p-1 h-auto">
          {['Overview', 'Channel Performance', 'Lead Funnel', 'AI Performance'].map(
            (tab) => (
              <TabsTrigger
                key={tab}
                value={tab.toLowerCase().replace(/\s+/g, '-')}
                className="data-[state=active]:bg-[#7C3AED] data-[state=active]:text-white text-[#9CA3AF] px-4 py-2 text-sm rounded-lg"
              >
                {tab}
              </TabsTrigger>
            )
          )}
        </TabsList>

        {/* ─── Overview Tab ─── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewMetrics.map((m) => (
              <Card
                key={m.label}
                className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#9CA3AF] text-sm">{m.label}</span>
                    <div className={`rounded-lg p-2 ${m.iconBg}`}>
                      <m.icon className={`h-4 w-4 ${m.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{m.value}</p>
                  <p className={`text-xs mt-1 ${m.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.change} from last period
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Line Chart - Engagement Trend */}
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">
                Lead Engagement Trend
              </CardTitle>
              <p className="text-[#9CA3AF] text-xs">30-day lead, reply, and qualification trends</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagementTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="day"
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                      tickLine={false}
                      interval={4}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="leads"
                      name="Leads"
                      stroke="#7C3AED"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#7C3AED' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="replies"
                      name="Replies"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#10B981' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="qualified"
                      name="Qualified"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#F59E0B' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart - Appointments by Day */}
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">
                Appointments by Day of Week
              </CardTitle>
              <p className="text-[#9CA3AF] text-xs">Average appointments set per day</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appointmentsByDay} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="appointments" name="Appointments" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Channel Performance Tab ─── */}
        <TabsContent value="channel-performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Channel Table */}
            <Card className="bg-[#141825] border border-white/[0.06] rounded-xl lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base">
                  Channel Comparison
                </CardTitle>
                <p className="text-[#9CA3AF] text-xs">Performance breakdown by communication channel</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-[#9CA3AF] text-xs font-medium">Channel</TableHead>
                      <TableHead className="text-[#9CA3AF] text-xs font-medium text-right">Leads</TableHead>
                      <TableHead className="text-[#9CA3AF] text-xs font-medium text-right">Replies</TableHead>
                      <TableHead className="text-[#9CA3AF] text-xs font-medium text-right">Reply Rate</TableHead>
                      <TableHead className="text-[#9CA3AF] text-xs font-medium text-right">Qualified</TableHead>
                      <TableHead className="text-[#9CA3AF] text-xs font-medium text-right">Appts</TableHead>
                      <TableHead className="text-[#9CA3AF] text-xs font-medium text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channelData.map((ch) => (
                      <TableRow key={ch.channel} className="border-white/[0.06] hover:bg-white/[0.02]">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: ch.color }}
                            />
                            <span className="text-white text-sm font-medium">{ch.channel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-white text-sm text-right">{ch.leads.toLocaleString()}</TableCell>
                        <TableCell className="text-white text-sm text-right">{ch.replies.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-400 text-xs"
                          >
                            {ch.replyRate}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white text-sm text-right">{ch.qualified}</TableCell>
                        <TableCell className="text-white text-sm text-right">{ch.appointments}</TableCell>
                        <TableCell className="text-white text-sm text-right font-medium">{ch.cost}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base">
                  Lead Distribution
                </CardTitle>
                <p className="text-[#9CA3AF] text-xs">By channel</p>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-[#9CA3AF] text-xs">{d.name}</span>
                      <span className="text-white text-xs font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Channel Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {channelData.map((ch) => {
              const Icon = ch.icon
              return (
                <Card
                  key={ch.channel}
                  className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="rounded-lg p-2.5"
                        style={{ backgroundColor: `${ch.color}20` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: ch.color }} />
                      </div>
                      <div>
                        <p className="text-white font-semibold">{ch.channel}</p>
                        <p className="text-[#9CA3AF] text-xs">{ch.leads} leads</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[#9CA3AF] text-xs">Reply Rate</p>
                        <p className="text-white font-bold text-lg">{ch.replyRate}</p>
                      </div>
                      <div>
                        <p className="text-[#9CA3AF] text-xs">Appointments</p>
                        <p className="text-white font-bold text-lg">{ch.appointments}</p>
                      </div>
                      <div>
                        <p className="text-[#9CA3AF] text-xs">Qualified</p>
                        <p className="text-white font-bold text-lg">{ch.qualified}</p>
                      </div>
                      <div>
                        <p className="text-[#9CA3AF] text-xs">Total Cost</p>
                        <p className="text-white font-bold text-lg">{ch.cost}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ─── Lead Funnel Tab ─── */}
        <TabsContent value="lead-funnel" className="space-y-6">
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">
                Lead Conversion Funnel
              </CardTitle>
              <p className="text-[#9CA3AF] text-xs">Track leads from import to conversion</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {funnelSteps.map((step, i) => {
                  const prev = i > 0 ? funnelSteps[i - 1].count : step.count
                  const rate = i === 0 ? '100.0' : ((step.count / prev) * 100).toFixed(1)
                  const maxCount = funnelSteps[0].count
                  const widthPct = Math.max((step.count / maxCount) * 100, 12)

                  return (
                    <div key={step.label} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {i > 0 && (
                            <ArrowRight className="h-3 w-3 text-[#9CA3AF] hidden sm:block" />
                          )}
                          <span className="text-white text-sm font-medium">{step.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold text-sm">
                            {step.count.toLocaleString()}
                          </span>
                          {i > 0 && (
                            <Badge
                              variant="secondary"
                              className={`text-xs px-2 ${
                                parseFloat(rate) >= 70
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : parseFloat(rate) >= 40
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-red-500/10 text-red-400'
                              }`}
                            >
                              {rate}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="h-10 rounded-lg bg-white/[0.03] overflow-hidden">
                        <div
                          className="h-full rounded-lg flex items-center px-4 transition-all duration-500"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: `${step.color}30`,
                            borderLeft: `3px solid ${step.color}`,
                          }}
                        >
                          <span className="text-white text-xs font-medium whitespace-nowrap">
                            {step.count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Funnel Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/[0.06]">
                <div className="text-center">
                  <p className="text-[#9CA3AF] text-xs mb-1">Overall Conversion</p>
                  <p className="text-2xl font-bold text-emerald-400">3.3%</p>
                </div>
                <div className="text-center">
                  <p className="text-[#9CA3AF] text-xs mb-1">Contact Rate</p>
                  <p className="text-2xl font-bold text-purple-400">88.3%</p>
                </div>
                <div className="text-center">
                  <p className="text-[#9CA3AF] text-xs mb-1">Reply Rate</p>
                  <p className="text-2xl font-bold text-blue-400">84.6%</p>
                </div>
                <div className="text-center">
                  <p className="text-[#9CA3AF] text-xs mb-1">Show Rate</p>
                  <p className="text-2xl font-bold text-cyan-400">76.6%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── AI Performance Tab ─── */}
        <TabsContent value="ai-performance" className="space-y-6">
          {/* AI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {aiMetrics.map((m) => (
              <Card
                key={m.label}
                className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#9CA3AF] text-sm">{m.label}</span>
                    <div className={`rounded-lg p-2 ${m.iconBg}`}>
                      <m.icon className={`h-4 w-4 ${m.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{m.value}</p>
                  <p className={`text-xs mt-1 ${m.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.change} from last period
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Response Time Chart */}
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">
                AI Response Time Distribution
              </CardTitle>
              <p className="text-[#9CA3AF] text-xs">How quickly the AI responds to lead inquiries</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aiResponseTimeData} barSize={48}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="range"
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Responses" radius={[6, 6, 0, 0]}>
                      {aiResponseTimeData.map((_, i) => {
                        const colors = ['#22C55E', '#22C55E', '#10B981', '#06B6D4', '#F59E0B', '#F97316', '#EF4444']
                        return <Cell key={i} fill={colors[i]} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* AI Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
              <CardContent className="p-5">
                <h3 className="text-white font-semibold mb-4">Qualification Breakdown</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Auto-Qualified (AI)', value: 218, pct: '66.9%', color: 'bg-purple-500' },
                    { label: 'Manual Review', value: 72, pct: '22.1%', color: 'bg-amber-500' },
                    { label: 'Disqualified (AI)', value: 36, pct: '11.0%', color: 'bg-red-500' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[#9CA3AF] text-sm">{item.label}</span>
                        <span className="text-white text-sm font-medium">{item.value} ({item.pct})</span>
                      </div>
                      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: item.pct }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
              <CardContent className="p-5">
                <h3 className="text-white font-semibold mb-4">Top Performing Questions</h3>
                <div className="space-y-3">
                  {[
                    { q: 'What is your budget range?', responses: 892, rate: '94.2%' },
                    { q: 'When are you looking to purchase?', responses: 856, rate: '91.8%' },
                    { q: 'Do you have financing in place?', responses: 823, rate: '88.4%' },
                    { q: 'Have you been pre-approved?', responses: 741, rate: '86.1%' },
                    { q: 'What type of property are you interested in?', responses: 698, rate: '83.7%' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-[#9CA3AF] text-xs w-5 shrink-0">#{i + 1}</span>
                        <span className="text-white text-sm truncate">{item.q}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-[#9CA3AF] text-xs">{item.responses}</span>
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 text-xs">
                          {item.rate}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}