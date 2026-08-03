'use client'

import { useState } from 'react'
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Shield,
  Save,
  RefreshCw,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronUp,
  Zap,
  Globe,
  KeyRound,
  Eye,
  EyeOff,
  Webhook,
  Terminal,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const deliveryData = [
  { id: 1, lead: 'Sarah Mitchell', event: 'New Lead', status: 'Delivered', code: 200, time: '2024-01-15 14:32:18' },
  { id: 2, lead: 'James Rodriguez', event: 'Qualified', status: 'Delivered', code: 200, time: '2024-01-15 14:28:05' },
  { id: 3, lead: 'Emily Chen', event: 'Appointment', status: 'Delivered', code: 200, time: '2024-01-15 14:15:42' },
  { id: 4, lead: 'Michael Brown', event: 'Updated', status: 'Failed', code: 502, time: '2024-01-15 14:10:33' },
  { id: 5, lead: 'Olivia Williams', event: 'New Lead', status: 'Delivered', code: 200, time: '2024-01-15 13:58:21' },
  { id: 6, lead: 'Daniel Kim', event: 'Qualified', status: 'Pending', code: null, time: '2024-01-15 13:45:09' },
  { id: 7, lead: 'Sophia Martinez', event: 'New Lead', status: 'Delivered', code: 200, time: '2024-01-15 13:32:55' },
  { id: 8, lead: 'Liam Johnson', event: 'Appointment', status: 'Delivered', code: 200, time: '2024-01-15 13:20:14' },
  { id: 9, lead: 'Ava Patel', event: 'Updated', status: 'Failed', code: 500, time: '2024-01-15 13:12:47' },
  { id: 10, lead: 'Noah Davis', event: 'New Lead', status: 'Delivered', code: 200, time: '2024-01-15 12:58:33' },
  { id: 11, lead: 'Isabella Taylor', event: 'Qualified', status: 'Delivered', code: 200, time: '2024-01-15 12:45:02' },
  { id: 12, lead: 'Ethan Wilson', event: 'New Lead', status: 'Delivered', code: 201, time: '2024-01-15 12:30:19' },
]

const failedDeliveries = [
  {
    id: 4,
    lead: 'Michael Brown',
    event: 'Updated',
    code: 502,
    time: '2024-01-15 14:10:33',
    error: 'Bad Gateway — The upstream CRM server returned an invalid response. Retry after verifying CRM service health.',
    retries: 1,
  },
  {
    id: 9,
    lead: 'Ava Patel',
    event: 'Updated',
    code: 500,
    time: '2024-01-15 13:12:47',
    error: 'Internal Server Error — CRM endpoint experienced an unhandled exception. Payload size exceeded CRM rate limit.',
    retries: 3,
  },
]

const webhookLogs = [
  {
    id: 'wh_001',
    time: '2024-01-15 14:32:18',
    lead: 'Sarah Mitchell',
    payload: `{
  "event": "lead.created",
  "data": {
    "id": "ld_8291",
    "name": "Sarah Mitchell",
    "email": "sarah.m@email.com",
    "phone": "+1 (555) 234-5678",
    "source": "website_form",
    "interest": "2024 Tesla Model 3",
    "score": 87
  },
  "timestamp": "2024-01-15T14:32:18Z"
}`,
  },
  {
    id: 'wh_002',
    time: '2024-01-15 14:28:05',
    lead: 'James Rodriguez',
    payload: `{
  "event": "lead.qualified",
  "data": {
    "id": "ld_8287",
    "name": "James Rodriguez",
    "email": "j.rodriguez@corp.com",
    "phone": "+1 (555) 876-4321",
    "source": "referral",
    "interest": "BMW X5 Lease",
    "score": 94,
    "stage": "qualified"
  },
  "timestamp": "2024-01-15T14:28:05Z"
}`,
  },
  {
    id: 'wh_003',
    time: '2024-01-15 14:15:42',
    lead: 'Emily Chen',
    payload: `{
  "event": "appointment.scheduled",
  "data": {
    "id": "ld_8274",
    "name": "Emily Chen",
    "email": "emily.chen@mail.com",
    "phone": "+1 (555) 345-6789",
    "appointment_date": "2024-01-18T10:00:00",
    "sales_rep": "Marcus Lee"
  },
  "timestamp": "2024-01-15T14:15:42Z"
}`,
  },
  {
    id: 'wh_004',
    time: '2024-01-15 13:58:21',
    lead: 'Olivia Williams',
    payload: `{
  "event": "lead.created",
  "data": {
    "id": "ld_8263",
    "name": "Olivia Williams",
    "email": "o.williams@inbox.net",
    "phone": "+1 (555) 456-7890",
    "source": "google_ads",
    "interest": "Mercedes-Benz GLC 300",
    "score": 72
  },
  "timestamp": "2024-01-15T13:58:21Z"
}`,
  },
  {
    id: 'wh_005',
    time: '2024-01-15 13:32:55',
    lead: 'Sophia Martinez',
    payload: `{
  "event": "lead.created",
  "data": {
    "id": "ld_8251",
    "name": "Sophia Martinez",
    "email": "s.martinez@web.org",
    "phone": "+1 (555) 567-8901",
    "source": "facebook_ad",
    "interest": "Audi Q5 Sportback",
    "score": 81
  },
  "timestamp": "2024-01-15T13:32:55Z"
}`,
  },
]

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Delivered: 'bg-emerald-400',
    Pending: 'bg-blue-400',
    Failed: 'bg-red-400',
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${colors[status] || 'bg-gray-400'}`} />
      {status}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'Delivered')
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    )
  if (status === 'Pending')
    return (
      <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/25">
        <Clock className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    )
  return (
    <Badge className="bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25">
      <XCircle className="h-3 w-3 mr-1" />
      {status}
    </Badge>
  )
}

function EventBadge({ event }: { event: string }) {
  const styles: Record<string, string> = {
    'New Lead': 'bg-[#7C3AED]/15 text-[#A78BFA] border-[#7C3AED]/20',
    Qualified: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    Appointment: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
    Updated: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  }
  return (
    <Badge variant="outline" className={styles[event] || ''}>
      {event}
    </Badge>
  )
}

export default function CRMWebhook() {
  const [showApiKey, setShowApiKey] = useState(false)
  const [expandedLog, setExpandedLog] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Webhook className="h-6 w-6 text-[#7C3AED]" />
          CRM Webhook
        </h1>
        <p className="text-[#9CA3AF] mt-1">
          Send lead data to external CRM systems via webhook integrations
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#9CA3AF] text-sm">Total Deliveries</p>
                <p className="text-2xl font-bold text-white mt-1">4,231</p>
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  +127 today
                </p>
              </div>
              <div className="h-11 w-11 rounded-lg bg-[#7C3AED]/15 flex items-center justify-center">
                <Send className="h-5 w-5 text-[#7C3AED]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#9CA3AF] text-sm">Success Rate</p>
                <p className="text-2xl font-bold text-white mt-1">94.2%</p>
                <Progress value={94.2} className="mt-2 h-1.5" />
              </div>
              <div className="h-11 w-11 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#9CA3AF] text-sm">Failed Deliveries</p>
                <p className="text-2xl font-bold text-white mt-1">245</p>
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  2 in last hour
                </p>
              </div>
              <div className="h-11 w-11 rounded-lg bg-red-500/15 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="deliveries" className="space-y-4">
        <TabsList className="bg-[#141825] border border-white/[0.06]">
          <TabsTrigger value="deliveries">Recent Deliveries</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="failed">Failed Deliveries</TabsTrigger>
          <TabsTrigger value="logs">Payload Logs</TabsTrigger>
        </TabsList>

        {/* Deliveries Table */}
        <TabsContent value="deliveries">
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base">Recent Webhook Deliveries</CardTitle>
                <Badge variant="outline" className="text-[#9CA3AF] border-white/[0.06]">
                  {deliveryData.length} records
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-[#9CA3AF] font-medium pl-5">Lead Name</TableHead>
                      <TableHead className="text-[#9CA3AF] font-medium">Event</TableHead>
                      <TableHead className="text-[#9CA3AF] font-medium">Status</TableHead>
                      <TableHead className="text-[#9CA3AF] font-medium">Response Code</TableHead>
                      <TableHead className="text-[#9CA3AF] font-medium pr-5">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveryData.map((d) => (
                      <TableRow key={d.id} className="border-white/[0.06]">
                        <TableCell className="text-white font-medium pl-5">{d.lead}</TableCell>
                        <TableCell>
                          <EventBadge event={d.event} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={d.status} />
                        </TableCell>
                        <TableCell>
                          <span className={`font-mono text-sm ${d.code && d.code >= 400 ? 'text-red-400' : d.code === null ? 'text-[#9CA3AF]' : 'text-emerald-400'}`}>
                            {d.code ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-[#9CA3AF] text-sm pr-5">{d.time}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration */}
        <TabsContent value="configuration">
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#7C3AED]" />
                Webhook Endpoint Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Webhook URL */}
              <div className="space-y-2">
                <Label className="text-[#9CA3AF] text-sm flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" />
                  Webhook URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    defaultValue="https://crm.example.com/api/leads/webhook"
                    className="bg-[#0D1117] border-white/[0.06] text-white placeholder-[#4B5563] focus:border-[#7C3AED]/50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-[#0D1117] border-white/[0.06] hover:bg-white/[0.05] shrink-0"
                  >
                    <Copy className="h-4 w-4 text-[#9CA3AF]" />
                  </Button>
                </div>
                <p className="text-xs text-[#6B7280]">
                  The endpoint where lead data will be sent as JSON POST requests
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label className="text-[#9CA3AF] text-sm flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5" />
                  API Key
                </Label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    defaultValue="sk-9f8e7d6c5b4a3210fedcba9876543210a3f2"
                    className="bg-[#0D1117] border-white/[0.06] text-white placeholder-[#4B5563] focus:border-[#7C3AED]/50 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="bg-[#0D1117] border-white/[0.06] hover:bg-white/[0.05] shrink-0"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-[#9CA3AF]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[#9CA3AF]" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-[#6B7280]">
                  Used for authenticating requests to the webhook endpoint
                </p>
              </div>

              {/* Auth Method */}
              <div className="space-y-2">
                <Label className="text-[#9CA3AF] text-sm flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" />
                  Authentication Method
                </Label>
                <Select defaultValue="bearer">
                  <SelectTrigger className="w-full bg-[#0D1117] border-white/[0.06] text-white focus:border-[#7C3AED]/50">
                    <SelectValue placeholder="Select auth method" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-white/[0.06]">
                    <SelectItem value="bearer" className="text-white focus:bg-[#7C3AED]/15 focus:text-white">Bearer Token</SelectItem>
                    <SelectItem value="basic" className="text-white focus:bg-[#7C3AED]/15 focus:text-white">Basic Auth</SelectItem>
                    <SelectItem value="custom" className="text-white focus:bg-[#7C3AED]/15 focus:text-white">Custom Header</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#6B7280]">
                  Bearer Token includes the API key in the Authorization header
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  className="bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Test Webhook
                </Button>
                <Button
                  className="bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failed Deliveries */}
        <TabsContent value="failed">
          <div className="space-y-4">
            <Card className="bg-[#141825] border border-red-500/20 rounded-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    Failed Deliveries
                    <Badge className="bg-red-500/15 text-red-400 border-red-500/20 ml-2">
                      {failedDeliveries.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {failedDeliveries.map((fd) => (
                  <div
                    key={fd.id}
                    className="bg-[#0D1117] border border-white/[0.06] rounded-lg p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                          <XCircle className="h-5 w-5 text-red-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{fd.lead}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <EventBadge event={fd.event} />
                            <span className="text-xs text-[#9CA3AF]">{fd.time}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className="bg-red-500/15 text-red-400 border-red-500/20 font-mono">
                          {fd.code}
                        </Badge>
                        <Badge variant="outline" className="text-[#9CA3AF] border-white/[0.06]">
                          {fd.retries} retry{fd.retries !== 1 ? 'ies' : ''}
                        </Badge>
                        <Button
                          size="sm"
                          className="bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Retry
                        </Button>
                      </div>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/10 rounded-md p-3">
                      <p className="text-red-400/90 text-sm flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        {fd.error}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payload Logs */}
        <TabsContent value="logs">
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-[#7C3AED]" />
                  Delivery Logs
                </CardTitle>
                <Badge variant="outline" className="text-[#9CA3AF] border-white/[0.06]">
                  Last {webhookLogs.length} payloads
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {webhookLogs.map((log, idx) => (
                <div
                  key={log.id}
                  className="bg-[#0D1117] border border-white/[0.06] rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedLog(expandedLog === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-[#7C3AED]/15 flex items-center justify-center shrink-0">
                        <Terminal className="h-4 w-4 text-[#7C3AED]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium truncate">{log.lead}</span>
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">
                            200
                          </Badge>
                        </div>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">
                          {log.time} &middot; {log.id}
                        </p>
                      </div>
                    </div>
                    {expandedLog === idx ? (
                      <ChevronUp className="h-4 w-4 text-[#9CA3AF] shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#9CA3AF] shrink-0" />
                    )}
                  </button>
                  {expandedLog === idx && (
                    <div className="border-t border-white/[0.06] p-4 bg-[#0a0e18]">
                      <pre className="text-xs text-[#A5B4FC] font-mono overflow-x-auto whitespace-pre leading-relaxed">
                        {log.payload}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}