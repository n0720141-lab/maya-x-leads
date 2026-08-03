'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import {
  Plus,
  Megaphone,
  Users,
  MessageSquare,
  CalendarCheck,
  Pencil,
  Pause,
  Play,
  BarChart3,
  Send,
  Mail,
  Phone,
  Clock,
  Target,
  TrendingUp,
  X,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type CampaignStatus = 'Active' | 'Paused' | 'Completed' | 'Draft'
type CampaignChannel = 'SMS' | 'WhatsApp' | 'Email'

interface CampaignItem {
  id: number
  name: string
  channel: CampaignChannel
  status: CampaignStatus
  leads: number
  replies: number
  replyRate: number
  qualified: number
  appointments: number
  created: string
  sent: number
  delivered: number
  openRate: number
  clickRate: number
}

const campaigns: CampaignItem[] = [
  {
    id: 1,
    name: 'Spring Promotion SMS',
    channel: 'SMS' as const,
    status: 'Active' as const,
    leads: 312,
    replies: 98,
    replyRate: 31.4,
    qualified: 42,
    appointments: 14,
    created: '2025-03-15',
    sent: 312,
    delivered: 298,
    openRate: 95.5,
    clickRate: 18.3,
  },
  {
    id: 2,
    name: 'New Vehicle Follow-Up',
    channel: 'WhatsApp' as const,
    status: 'Active' as const,
    leads: 245,
    replies: 89,
    replyRate: 36.3,
    qualified: 38,
    appointments: 12,
    created: '2025-03-22',
    sent: 245,
    delivered: 241,
    openRate: 98.4,
    clickRate: 22.1,
  },
  {
    id: 3,
    name: 'Service Reminder Campaign',
    channel: 'Email' as const,
    status: 'Active' as const,
    leads: 189,
    replies: 47,
    replyRate: 24.9,
    qualified: 21,
    appointments: 8,
    created: '2025-04-01',
    sent: 189,
    delivered: 182,
    openRate: 42.3,
    clickRate: 12.7,
  },
  {
    id: 4,
    name: 'Trade-In Special Offer',
    channel: 'SMS' as const,
    status: 'Paused' as const,
    leads: 156,
    replies: 41,
    replyRate: 26.3,
    qualified: 18,
    appointments: 4,
    created: '2025-04-10',
    sent: 156,
    delivered: 150,
    openRate: 96.2,
    clickRate: 15.4,
  },
  {
    id: 5,
    name: 'Lease Expiration Outreach',
    channel: 'Email' as const,
    status: 'Completed' as const,
    leads: 203,
    replies: 52,
    replyRate: 25.6,
    qualified: 24,
    appointments: 7,
    created: '2025-02-20',
    sent: 203,
    delivered: 196,
    openRate: 38.7,
    clickRate: 14.2,
  },
  {
    id: 6,
    name: 'Holiday Season Blast',
    channel: 'WhatsApp' as const,
    status: 'Draft' as const,
    leads: 93,
    replies: 0,
    replyRate: 0,
    qualified: 0,
    appointments: 0,
    created: '2025-04-18',
    sent: 0,
    delivered: 0,
    openRate: 0,
    clickRate: 0,
  },
]

const channelConfig = {
  SMS: { color: 'bg-purple-500/15 text-purple-400 border-purple-500/20', icon: Send },
  WhatsApp: { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: Phone },
  Email: { color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', icon: Mail },
}

const statusConfig = {
  Active: { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  Paused: { color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  Completed: { color: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
  Draft: { color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20' },
}

const stats = [
  { label: 'Active Campaigns', value: '5', icon: Megaphone, change: '+2 this month' },
  { label: 'Total Leads Reached', value: '1,198', icon: Users, change: '+312 this week' },
  { label: 'Overall Reply Rate', value: '29.4%', icon: MessageSquare, change: '+2.1% vs last month' },
  { label: 'Appointments Generated', value: '41', icon: CalendarCheck, change: '+8 this week' },
]

export default function Campaigns() {
  const [selectedCampaign, setSelectedCampaign] = useState<typeof campaigns[0] | null>(null)
  const [realCampaigns, setRealCampaigns] = useState<CampaignItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<{ campaigns: typeof campaigns }>('/campaigns')
        if (data.campaigns && Array.isArray(data.campaigns)) {
          setRealCampaigns(data.campaigns)
        }
      } catch (err) {
        console.error('Failed to load campaigns:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const activeCampaigns = realCampaigns ?? campaigns

  const handleDeleteCampaign = async (id: number) => {
    try {
      await api.del(`/campaigns/${id}`)
      if (realCampaigns) {
        setRealCampaigns(realCampaigns.filter((c) => c.id !== id))
      }
      if (selectedCampaign?.id === id) setSelectedCampaign(null)
    } catch (err) {
      console.error('Failed to delete campaign:', err)
    }
  }

  const handleToggleCampaign = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Paused' : 'Active'
      await api.put(`/campaigns/${id}`, { status: newStatus })
      if (realCampaigns) {
        setRealCampaigns(realCampaigns.map((c) => c.id === id ? { ...c, status: newStatus } : c))
      }
    } catch (err) {
      console.error('Failed to toggle campaign:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">Create and manage your marketing campaigns</p>
        </div>
        <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300">
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#9CA3AF]">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className="rounded-lg bg-[#7C3AED]/10 p-2.5">
                  <stat.icon className="h-5 w-5 text-[#7C3AED]" />
                </div>
              </div>
              <p className="text-xs text-emerald-400 mt-3 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content area */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Campaigns table */}
        <div className={`transition-all duration-300 ${selectedCampaign ? 'lg:w-[60%]' : 'w-full'}`}>
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
            <CardContent className="p-0">
              <div className="p-5 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">All Campaigns</h2>
                  <Tabs defaultValue="all">
                    <TabsList className="bg-white/[0.05] border-white/[0.06]">
                      <TabsTrigger
                        value="all"
                        className="data-[state=active]:bg-[#7C3AED] data-[state=active]:text-white text-[#9CA3AF]"
                      >
                        All
                      </TabsTrigger>
                      <TabsTrigger
                        value="active"
                        className="data-[state=active]:bg-[#7C3AED] data-[state=active]:text-white text-[#9CA3AF]"
                      >
                        Active
                      </TabsTrigger>
                      <TabsTrigger
                        value="paused"
                        className="data-[state=active]:bg-[#7C3AED] data-[state=active]:text-white text-[#9CA3AF]"
                      >
                        Paused
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-[#9CA3AF] font-medium">Name</TableHead>
                      <TableHead className="text-[#9CA3AF] font-medium">Channel</TableHead>
                      <TableHead className="text-[#9CA3AF] font-medium">Status</TableHead>
                      <TableHead className="text-[#9CA3AF] font-medium text-right">Leads</TableHead>
                      <TableHead className="text-[#9CA3AF] font-medium text-right">Replies</TableHead>
                      <TableHead className="text-[#9CA3AF] font-medium text-right">Reply Rate</TableHead>
                      <TableHead className="text-[#9CA3AF] font-medium text-right">Qualified</TableHead>
                      <TableHead className="text-[#9CA3AF] font-medium text-right">Appts</TableHead>
                      <TableHead className="text-[#9CA3AF] font-medium text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeCampaigns.map((campaign) => {
                      const channel = channelConfig[campaign.channel]
                      const status = statusConfig[campaign.status]
                      const ChannelIcon = channel.icon
                      const isSelected = selectedCampaign?.id === campaign.id

                      return (
                        <TableRow
                          key={campaign.id}
                          className={`border-white/[0.06] cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#7C3AED]/10' : 'hover:bg-white/[0.03]'
                          }`}
                          onClick={() => setSelectedCampaign(isSelected ? null : campaign)}
                        >
                          <TableCell className="font-medium text-white">{campaign.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${channel.color} border text-xs font-medium gap-1`}
                            >
                              <ChannelIcon className="h-3 w-3" />
                              {campaign.channel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${status.color} border text-xs font-medium`}
                            >
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-[#9CA3AF]">{campaign.leads}</TableCell>
                          <TableCell className="text-right text-[#9CA3AF]">{campaign.replies}</TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`font-medium ${
                                campaign.replyRate >= 30
                                  ? 'text-emerald-400'
                                  : campaign.replyRate >= 20
                                  ? 'text-amber-400'
                                  : campaign.replyRate > 0
                                  ? 'text-[#9CA3AF]'
                                  : 'text-zinc-600'
                              }`}
                            >
                              {campaign.replyRate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-[#9CA3AF]">{campaign.qualified}</TableCell>
                          <TableCell className="text-right text-white font-medium">
                            {campaign.appointments}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-[#9CA3AF] hover:text-white hover:bg-white/[0.05]"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-[#9CA3AF] hover:text-white hover:bg-white/[0.05]"
                                onClick={() => handleToggleCampaign(campaign.id, campaign.status)}
                              >
                                {campaign.status === 'Active' ? (
                                  <Pause className="h-3.5 w-3.5" />
                                ) : (
                                  <Play className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-[#9CA3AF] hover:text-white hover:bg-white/[0.05]"
                              >
                                <BarChart3 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected campaign detail panel */}
        {selectedCampaign && (
          <div className="lg:w-[40%]">
            <Card className="bg-[#141825] border border-white/[0.06] rounded-xl sticky top-6">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedCampaign.name}</h3>
                    <p className="text-sm text-[#9CA3AF] mt-1">Created {selectedCampaign.created}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-[#9CA3AF] hover:text-white hover:bg-white/[0.05]"
                    onClick={() => setSelectedCampaign(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Channel & Status */}
                <div className="flex items-center gap-3 mb-6">
                  <Badge
                    variant="outline"
                    className={`${channelConfig[selectedCampaign.channel].color} border text-xs font-medium gap-1`}
                  >
                    {(() => {
                      const Icon = channelConfig[selectedCampaign.channel].icon
                      return <Icon className="h-3 w-3" />
                    })()}
                    {selectedCampaign.channel}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`${statusConfig[selectedCampaign.status].color} border text-xs font-medium`}
                  >
                    {selectedCampaign.status}
                  </Badge>
                </div>

                {/* Performance metrics */}
                <div className="space-y-5">
                  <h4 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider">
                    Performance
                  </h4>

                  {/* Reply Rate */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-[#7C3AED]" />
                        <span className="text-sm text-[#9CA3AF]">Reply Rate</span>
                      </div>
                      <span className="text-sm font-semibold text-white">
                        {selectedCampaign.replyRate}%
                      </span>
                    </div>
                    <Progress value={selectedCampaign.replyRate} className="h-2 bg-white/[0.06]" />
                  </div>

                  {/* Delivery Rate */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm text-[#9CA3AF]">Delivery Rate</span>
                      </div>
                      <span className="text-sm font-semibold text-white">
                        {selectedCampaign.sent > 0
                          ? ((selectedCampaign.delivered / selectedCampaign.sent) * 100).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        selectedCampaign.sent > 0
                          ? (selectedCampaign.delivered / selectedCampaign.sent) * 100
                          : 0
                      }
                      className="h-2 bg-white/[0.06]"
                    />
                  </div>

                  {/* Open Rate */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-[#9CA3AF]">Open Rate</span>
                      </div>
                      <span className="text-sm font-semibold text-white">
                        {selectedCampaign.openRate}%
                      </span>
                    </div>
                    <Progress value={selectedCampaign.openRate} className="h-2 bg-white/[0.06]" />
                  </div>

                  {/* Funnel metrics */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-white/[0.03] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-3.5 w-3.5 text-[#9CA3AF]" />
                        <span className="text-xs text-[#9CA3AF]">Total Leads</span>
                      </div>
                      <p className="text-xl font-bold text-white">{selectedCampaign.leads}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-3.5 w-3.5 text-[#9CA3AF]" />
                        <span className="text-xs text-[#9CA3AF]">Qualified</span>
                      </div>
                      <p className="text-xl font-bold text-white">{selectedCampaign.qualified}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CalendarCheck className="h-3.5 w-3.5 text-[#9CA3AF]" />
                        <span className="text-xs text-[#9CA3AF]">Appointments</span>
                      </div>
                      <p className="text-xl font-bold text-white">{selectedCampaign.appointments}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-3.5 w-3.5 text-[#9CA3AF]" />
                        <span className="text-xs text-[#9CA3AF]">Created</span>
                      </div>
                      <p className="text-sm font-bold text-white mt-0.5">{selectedCampaign.created}</p>
                    </div>
                  </div>

                  {/* Conversion funnel */}
                  <div className="pt-2">
                    <h4 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">
                      Conversion Funnel
                    </h4>
                    <div className="space-y-2">
                      {[
                        {
                          label: 'Leads',
                          value: selectedCampaign.leads,
                          pct: 100,
                          color: 'bg-[#7C3AED]',
                        },
                        {
                          label: 'Replies',
                          value: selectedCampaign.replies,
                          pct:
                            selectedCampaign.leads > 0
                              ? (selectedCampaign.replies / selectedCampaign.leads) * 100
                              : 0,
                          color: 'bg-purple-400',
                        },
                        {
                          label: 'Qualified',
                          value: selectedCampaign.qualified,
                          pct:
                            selectedCampaign.leads > 0
                              ? (selectedCampaign.qualified / selectedCampaign.leads) * 100
                              : 0,
                          color: 'bg-violet-400',
                        },
                        {
                          label: 'Appointments',
                          value: selectedCampaign.appointments,
                          pct:
                            selectedCampaign.leads > 0
                              ? (selectedCampaign.appointments / selectedCampaign.leads) * 100
                              : 0,
                          color: 'bg-emerald-400',
                        },
                      ].map((step) => (
                        <div key={step.label} className="flex items-center gap-3">
                          <span className="text-xs text-[#9CA3AF] w-24 shrink-0">{step.label}</span>
                          <div className="flex-1 h-5 bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${step.color} rounded-full flex items-center justify-end pr-2 transition-all`}
                              style={{ width: `${Math.max(step.pct, 2)}%` }}
                            >
                              {step.pct > 8 && (
                                <span className="text-[10px] font-medium text-white">{step.value}</span>
                              )}
                            </div>
                          </div>
                          {step.pct <= 8 && (
                            <span className="text-xs text-[#9CA3AF] w-8 text-right">{step.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-3">
                    <Button className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300">
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      View Full Report
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/[0.06] text-[#9CA3AF] hover:text-white hover:bg-white/[0.05]"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}