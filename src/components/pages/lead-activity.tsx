'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Activity,
  UserPlus,
  Brain,
  CalendarCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Phone,
  Mail,
  Upload,
  FileText,
  CheckCircle,
} from 'lucide-react'

type Status = 'New' | 'Contacted' | 'Qualified' | 'Appointment' | 'DNC'
type Channel = 'SMS' | 'WhatsApp' | 'Email'

const statusConfig: Record<Status, { color: string; dotColor: string }> = {
  New: { color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', dotColor: 'bg-blue-400' },
  Contacted: { color: 'bg-purple-500/15 text-purple-400 border-purple-500/20', dotColor: 'bg-purple-400' },
  Qualified: { color: 'bg-green-500/15 text-green-400 border-green-500/20', dotColor: 'bg-green-400' },
  Appointment: { color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20', dotColor: 'bg-cyan-400' },
  DNC: { color: 'bg-red-500/15 text-red-400 border-red-500/20', dotColor: 'bg-red-400' },
}

interface ActivityRow {
  id: number | string
  name: string
  phone: string
  email?: string
  channel: Channel
  activityType: string
  status: Status
  time: string
}

export default function LeadActivity() {
  const [channelFilter, setChannelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [realActivities, setRealActivities] = useState<ActivityRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Excel / CSV File Import Modal State
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState('')
  const [isImportingCsv, setIsImportingCsv] = useState(false)
  const [csvMsg, setCsvMsg] = useState('')

  const loadLeads = async () => {
    try {
      const data = await api.get<{ leads: ActivityRow[] }>('/leads?limit=500')
      if (data.leads && Array.isArray(data.leads)) {
        setRealActivities(data.leads)
      }
    } catch (err) {
      console.error('Failed to load leads:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
  }, [])

  const handleImportFile = async () => {
    if (!selectedFile && !csvText.trim()) return
    setIsImportingCsv(true)
    setCsvMsg('')
    try {
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)

        const data = await api.upload<{ success: boolean; message?: string; error?: string }>('/leads/import', formData)
        if (data.success) {
          await loadLeads()
          setCsvMsg(data.message || 'Excel file imported successfully!')
          setTimeout(() => {
            setShowCsvModal(false)
            setSelectedFile(null)
            setCsvText('')
            setCsvMsg('')
          }, 1500)
        } else {
          setCsvMsg(data.error || 'Import failed.')
        }
      } else {
        const data = await api.post<{ success: boolean; message?: string; error?: string }>('/leads/import', {
          csvText: csvText.trim(),
        })
        if (data.success) {
          await loadLeads()
          setCsvMsg(data.message || 'Leads imported successfully!')
          setTimeout(() => {
            setShowCsvModal(false)
            setCsvText('')
            setCsvMsg('')
          }, 1500)
        } else {
          setCsvMsg(data.error || 'Import failed.')
        }
      }
    } catch (err) {
      setCsvMsg(err instanceof Error ? err.message : 'Failed to import file')
    } finally {
      setIsImportingCsv(false)
    }
  }

  const [isSendingBulk, setIsSendingBulk] = useState(false)
  const [bulkStatusMsg, setBulkStatusMsg] = useState('')

  const handleSendBulkMessages = async () => {
    setIsSendingBulk(true)
    setBulkStatusMsg('')
    try {
      const data = await api.post<{ success: boolean; count?: number; message?: string; error?: string }>('/messaging/send-bulk', {})
      if (data.success) {
        setBulkStatusMsg(data.message || `Outreach blast started for ${data.count} leads!`)
        await loadLeads()
        setTimeout(() => setBulkStatusMsg(''), 4000)
      } else {
        setBulkStatusMsg(data.error || 'Failed to start blast.')
      }
    } catch (err) {
      setBulkStatusMsg(err instanceof Error ? err.message : 'Failed to trigger bulk send')
    } finally {
      setIsSendingBulk(false)
    }
  }

  const handleDeleteLead = async (id: string | number) => {
    try {
      await api.delete(`/leads?id=${id}`)
      await loadLeads()
    } catch (err) {
      console.error('Failed to delete lead:', err)
    }
  }

  const handleClearAllLeads = async () => {
    if (!confirm('Are you sure you want to delete all leads? This cannot be undone.')) return
    try {
      await api.delete('/leads?all=true')
      await loadLeads()
      setCurrentPage(1)
    } catch (err) {
      console.error('Failed to clear leads:', err)
    }
  }

  const activeActivities = realActivities ?? []

  // Dynamic Live Stats
  const statCards = [
    {
      label: 'Total Leads / Activities',
      value: activeActivities.length.toLocaleString(),
      change: '+12.3%',
      positive: true,
      icon: Activity,
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
    },
    {
      label: 'New Leads Today',
      value: activeActivities.filter((a) => a.status === 'New').length.toLocaleString(),
      change: '+8.1%',
      positive: true,
      icon: UserPlus,
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
    },
    {
      label: 'AI Qualifications',
      value: activeActivities.filter((a) => a.status === 'Qualified').length.toLocaleString(),
      change: '+18.6%',
      positive: true,
      icon: Brain,
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
    },
    {
      label: 'Appointments Set',
      value: activeActivities.filter((a) => a.status === 'Appointment').length.toLocaleString(),
      change: '+4.2%',
      positive: true,
      icon: CalendarCheck,
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400',
    },
  ]

  const filteredActivities = activeActivities.filter((a) => {
    if (channelFilter !== 'all' && a.channel.toLowerCase() !== channelFilter.toLowerCase()) return false
    if (statusFilter !== 'all' && a.status.toLowerCase() !== statusFilter.toLowerCase()) return false
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase()) && !a.phone.includes(searchQuery)) return false
    return true
  })

  // Dynamic Pagination Math
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredActivities.length)
  const paginatedActivities = filteredActivities.slice(startIndex, endIndex)

  const newLeadsCount = activeActivities.filter((a) => a.status === 'New').length
  const contactedLeadsCount = activeActivities.filter((a) => a.status === 'Contacted').length

  return (
    <div className="space-y-6">
      {/* ── Page Header + Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-[#7C3AED]" />
            Leads & Activity
          </h1>
          <p className="text-[#9CA3AF] mt-1">
            Paste customer leads and launch automated multi-channel messaging blasts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeActivities.length > 0 && (
            <>
              <Button
                onClick={handleSendBulkMessages}
                disabled={isSendingBulk}
                className={
                  newLeadsCount > 0
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-600/20"
                    : "bg-purple-600/60 hover:bg-purple-600/80 text-white font-medium"
                }
              >
                {isSendingBulk
                  ? '🚀 Sending Blasts...'
                  : newLeadsCount > 0
                  ? `🚀 Send Messages (${newLeadsCount} New Unsent)`
                  : `✅ All ${contactedLeadsCount} Leads Sent`}
              </Button>
              <Button
                onClick={handleClearAllLeads}
                variant="outline"
                className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-medium"
              >
                🗑️ Clear All Leads
              </Button>
            </>
          )}
          <Button
            onClick={() => setShowCsvModal(true)}
            variant="outline"
            className="bg-[#0D1117] border-white/10 text-white hover:bg-white/[0.05]"
          >
            📋 Add / Paste Leads
          </Button>
        </div>
      </div>

      {bulkStatusMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
          {bulkStatusMsg}
        </div>
      )}

      {/* ── Dynamic Stats Row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#9CA3AF] font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters Bar ── */}
      <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-[#9CA3AF] pl-9 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={channelFilter}
                onValueChange={(v) => {
                  setChannelFilter(v)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[140px] bg-white/[0.03] border-white/[0.06] text-white text-sm">
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent className="bg-[#141825] border-white/10 text-white">
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[140px] bg-white/[0.03] border-white/[0.06] text-white text-sm">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-[#141825] border-white/10 text-white">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="appointment">Appointment</SelectItem>
                  <SelectItem value="dnc">DNC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card className="bg-[#141825] border border-white/[0.06] rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-[#9CA3AF] text-xs font-medium">Lead Name</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium">Phone</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium">Channel</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium">Activity Type</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium">Status</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium">Time</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-[#9CA3AF]">
                      No leads found. Click <strong>📋 Add / Paste Leads</strong> above to add leads!
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedActivities.map((activity) => {
                    const statusCfg = statusConfig[activity.status] || statusConfig.New

                    return (
                      <TableRow
                        key={activity.id}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell className="font-medium text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] flex items-center justify-center font-bold text-xs uppercase">
                              {activity.name ? activity.name.slice(0, 2) : 'LD'}
                            </div>
                            <span>{activity.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#9CA3AF] font-mono text-xs">
                          {activity.phone}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(activity.hasWhatsApp || String(activity.channel).toLowerCase() === 'whatsapp') && (
                              <Badge
                                variant="outline"
                                className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 gap-1 text-[11px] font-medium"
                              >
                                <Phone className="h-3 w-3" />
                                WhatsApp
                              </Badge>
                            )}
                            {activity.hasSimBox && (
                              <Badge
                                variant="outline"
                                className="bg-purple-500/10 border-purple-500/30 text-purple-300 gap-1 text-[11px] font-medium"
                              >
                                <MessageSquare className="h-3 w-3" />
                                SIM Box
                              </Badge>
                            )}
                            {activity.email && (
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 border-amber-500/30 text-amber-400 gap-1 text-[11px] font-medium"
                              >
                                <Mail className="h-3 w-3" />
                                Email
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[#9CA3AF] whitespace-nowrap">
                          {activity.activityType}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${statusCfg.color} gap-1.5 border text-xs`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dotColor}`} />
                            {activity.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[#9CA3AF] whitespace-nowrap text-xs">
                          {activity.time}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteLead(activity.id)
                            }}
                            className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5"
                          >
                            🗑️ Delete
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

      {/* ── Fully Dynamic Pagination Controls ── */}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-[#9CA3AF]">
          Showing{' '}
          <span className="font-medium text-white">
            {filteredActivities.length === 0 ? 0 : startIndex + 1}-{endIndex}
          </span>{' '}
          of <span className="font-medium text-white">{filteredActivities.length}</span> results
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="h-8 w-8 text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <Button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`h-8 w-8 text-xs font-semibold ${
                  safePage === pageNum
                    ? 'bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90 shadow-lg shadow-[#7C3AED]/20'
                    : 'bg-white/[0.03] text-[#9CA3AF] hover:text-white hover:bg-white/[0.06]'
                }`}
                size="icon"
              >
                {pageNum}
              </Button>
            ))}

            <Button
              variant="ghost"
              size="icon"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="h-8 w-8 text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* IMPORT / PASTE LEADS MODAL */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141825] border border-white/10 rounded-2xl p-6 w-full max-w-xl space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                📋 Paste Leads Text
              </h3>
              <button
                onClick={() => setShowCsvModal(false)}
                className="text-[#9CA3AF] hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-xs text-[#A78BFA] space-y-1">
                <p className="font-semibold text-white">📊 Supported Paste Format (Separated by Space, Tab, or Comma):</p>
                <p className="font-mono text-[11px] text-purple-300">
                  Name ➔ Phone ➔ Email ➔ WhatsApp
                </p>
              </div>

              {/* DIRECT OPEN PASTE TEXTAREA */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white flex items-center gap-2">
                  Paste your leads below (1 lead per line):
                </label>
                <textarea
                  rows={6}
                  placeholder="Paste your lead rows here..."
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-xs font-mono text-white placeholder:text-[#6B7280]/50 focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              {csvMsg && (
                <p className={`text-xs font-medium ${csvMsg.includes('Successfully') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {csvMsg}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCsvModal(false)
                  setCsvText('')
                  setCsvMsg('')
                }}
                className="flex-1 bg-white/[0.03] border-white/[0.06] text-[#9CA3AF]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportFile}
                disabled={!csvText.trim() || isImportingCsv}
                className="flex-1 bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
              >
                {isImportingCsv ? 'Importing Leads...' : 'Import Leads'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}