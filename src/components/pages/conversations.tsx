'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MessageCircle,
  Clock,
  TrendingUp,
  Search,
  MessageSquare,
  Phone,
  Mail,
  Bot,
  User,
  Send,
  ArrowLeft,
  Trash2,
  RefreshCw,
} from 'lucide-react'

type Channel = 'SMS' | 'WhatsApp' | 'Email'
type ConvStatus = 'active' | 'paused' | 'completed'

const channelConfig: Record<Channel, { color: string; icon: typeof MessageSquare }> = {
  SMS: { color: 'bg-purple-500/15 text-purple-400', icon: MessageSquare },
  WhatsApp: { color: 'bg-green-500/15 text-green-400', icon: Phone },
  Email: { color: 'bg-orange-500/15 text-orange-400', icon: Mail },
}

interface Conversation {
  id: string | number
  name: string
  initials: string
  lastMessage: string
  time: string
  channel: Channel
  status: ConvStatus
  unread: number
  updatedAt?: string
}

interface ChatMessage {
  id: number | string
  sender: 'lead' | 'ai'
  text: string
  time: string
  channel?: string
}

export default function Conversations() {
  const [channelFilter, setChannelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | number>('')
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [threadChannelFilter, setThreadChannelFilter] = useState('all')

  const [realConversations, setRealConversations] = useState<Conversation[]>([])
  const [realThreads, setRealThreads] = useState<Record<string, ChatMessage[]>>({})
  const [loading, setLoading] = useState(true)
  const [messageInput, setMessageInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // Live Auto-Poll Conversations every 3 seconds
  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get<{
        conversations: Conversation[]
        threads: Record<string, ChatMessage[]>
      }>('/conversations?limit=100')

      if (data.conversations && Array.isArray(data.conversations)) {
        setRealConversations(data.conversations)
        setRealThreads(data.threads || {})

        // Set default selected conversation if none selected
        if (data.conversations.length > 0 && !selectedId) {
          setSelectedId(data.conversations[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to load live conversations:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, 3000) // Auto-poll every 3s
    return () => clearInterval(interval)
  }, [loadConversations])

  const activeConversations = realConversations
  const activeThreads = realThreads

  const filteredConversations = activeConversations.filter((c) => {
    if (channelFilter !== 'all' && c.channel.toLowerCase() !== channelFilter.toLowerCase()) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const selected = activeConversations.find((c) => String(c.id) === String(selectedId))
  const rawMessages = activeThreads[selectedId] || activeThreads[String(selectedId)] || []

  const messages = rawMessages.filter((msg) => {
    if (threadChannelFilter === 'all') return true
    const ch = (msg.channel || selected?.channel || 'whatsapp').toLowerCase()
    return ch.includes(threadChannelFilter.toLowerCase())
  })

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedId || sendingMessage) return
    const textToSend = messageInput.trim()
    setSendingMessage(true)
    setMessageInput('')

    const newMsgObj: ChatMessage = {
      id: Date.now(),
      sender: 'ai',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    // Optimistic UI update
    setRealThreads((prev) => ({
      ...prev,
      [selectedId]: [...(prev?.[selectedId] || []), newMsgObj],
    }))

    try {
      await api.post(`/conversations/${selectedId}/messages`, { text: textToSend })
      await loadConversations()
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSendingMessage(false)
    }
  }

  const handleClearAllConversations = async () => {
    if (!confirm('Are you sure you want to delete ALL conversations? This cannot be undone.')) return
    try {
      await api.delete('/conversations?all=true')
      setRealConversations([])
      setRealThreads({})
      setSelectedId('')
    } catch (err) {
      console.error('Failed to clear conversations:', err)
    }
  }

  const handleDeleteSingleConversation = async (id: string | number) => {
    if (!confirm('Delete this conversation thread?')) return
    try {
      await api.delete(`/conversations?id=${id}`)
      setRealConversations((prev) => prev.filter((c) => String(c.id) !== String(id)))
      setRealThreads((prev) => {
        const next = { ...prev }
        delete next[id]
        delete next[String(id)]
        return next
      })
      if (String(selectedId) === String(id)) {
        const remaining = realConversations.filter((c) => String(c.id) !== String(id))
        setSelectedId(remaining[0]?.id || '')
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  // Live Stats
  const statCards = [
    {
      label: 'Active Conversations',
      value: activeConversations.length.toString(),
      change: '+100%',
      positive: true,
      icon: MessageCircle,
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
    },
    {
      label: 'Live Auto-Poll Speed',
      value: '3 Seconds',
      change: 'Real-Time',
      positive: true,
      icon: Clock,
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
    },
    {
      label: 'AI DeepSeek Engine',
      value: 'Active 24/7',
      change: '100% Old Rules',
      positive: true,
      icon: TrendingUp,
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-[#7C3AED]" />
            Live Conversations & Chat Logs
          </h1>
          <p className="text-[#9CA3AF] mt-1">
            Real-time multi-channel conversation inbox (WhatsApp, Gmail, and SIM Box SMS)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeConversations.length > 0 && (
            <Button
              onClick={handleClearAllConversations}
              variant="outline"
              size="sm"
              className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear All Conversations
            </Button>
          )}
          <Button
            onClick={() => loadConversations()}
            variant="outline"
            size="sm"
            className="bg-[#0D1117] border-white/10 text-white hover:bg-white/[0.05] text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin-slow" /> Refresh Chat
          </Button>
        </div>
      </div>

      {/* Stats Cards Row */}
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

      {/* Main Inbox Panel */}
      <Card className="bg-[#141825] border border-white/[0.06] rounded-xl overflow-hidden min-h-[600px]">
        <CardContent className="p-0">
          <div className="flex h-[620px]">
            {/* LEFT PANEL: Conversation List */}
            <div
              className={`w-full md:w-[360px] lg:w-[400px] border-r border-white/[0.06] flex flex-col shrink-0 ${
                mobileShowChat ? 'hidden md:flex' : 'flex'
              }`}
            >
              {/* Search & Filters */}
              <div className="p-4 border-b border-white/[0.06] space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                  <Input
                    placeholder="Search conversations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-[#9CA3AF] pl-9 text-sm h-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={channelFilter} onValueChange={setChannelFilter}>
                    <SelectTrigger className="flex-1 bg-white/[0.03] border-white/[0.06] text-white text-xs h-8">
                      <SelectValue placeholder="All Channels" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141825] border-white/10 text-white">
                      <SelectItem value="all">All Channels</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Conversation List Scroll Area */}
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="p-8 text-center text-[#9CA3AF] text-sm">
                    Loading live conversations...
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-[#9CA3AF] text-sm space-y-2">
                    <MessageCircle className="h-8 w-8 mx-auto text-[#6B7280] opacity-50" />
                    <p className="font-semibold text-white">No Active Conversations</p>
                    <p className="text-xs">
                      When a lead is messaged or sends an inbound reply, their live chat history will appear here in real-time!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {filteredConversations.map((conv) => {
                      const channelCfg = channelConfig[conv.channel] || channelConfig.WhatsApp
                      const isSelected = String(conv.id) === String(selectedId)
                      const ChannelIcon = channelCfg.icon

                      return (
                        <div
                          key={conv.id}
                          onClick={() => {
                            setSelectedId(conv.id)
                            setMobileShowChat(true)
                          }}
                          className={`p-4 cursor-pointer transition-all duration-200 hover:bg-white/[0.03] group ${
                            isSelected
                              ? 'bg-[#7C3AED]/10 border-l-4 border-l-[#7C3AED]'
                              : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] flex items-center justify-center font-bold text-sm shrink-0">
                              {conv.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-semibold text-white text-sm truncate">
                                  {conv.name}
                                </span>
                                <span className="text-[10px] text-[#6B7280] shrink-0 font-mono">
                                  {conv.time}
                                </span>
                              </div>
                              <p className="text-xs text-[#9CA3AF] truncate line-clamp-1 mb-2">
                                {conv.lastMessage}
                              </p>
                              <div className="flex items-center justify-between">
                                <Badge
                                  variant="outline"
                                  className={`${channelCfg.color} gap-1 border-0 text-[10px] px-2 py-0.5`}
                                >
                                  <ChannelIcon className="h-3 w-3" />
                                  {conv.channel}
                                </Badge>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteSingleConversation(conv.id)
                                  }}
                                  className="text-[#6B7280] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                  title="Delete Thread"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* RIGHT PANEL: Chat Thread View */}
            <div
              className={`flex-1 flex flex-col bg-[#0D1117] ${
                mobileShowChat ? 'flex' : 'hidden md:flex'
              }`}
            >
              {selected ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-white/[0.06] bg-[#141825] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileShowChat(false)}
                        className="md:hidden h-8 w-8 text-[#9CA3AF]"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <div className="h-10 w-10 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] flex items-center justify-center font-bold text-sm">
                        {selected.initials}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-tight">
                          {selected.name}
                        </h3>
                        <p className="text-xs text-emerald-400 flex items-center gap-1.5 mt-0.5 font-medium">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          Live Auto-Reply Active ({selected.channel})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select value={threadChannelFilter} onValueChange={setThreadChannelFilter}>
                        <SelectTrigger className="w-[120px] bg-white/[0.03] border-white/[0.06] text-white text-xs h-8">
                          <SelectValue placeholder="All Msgs" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#141825] border-white/10 text-white">
                          <SelectItem value="all">All Messages</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSingleConversation(selected.id)}
                        className="h-8 w-8 text-[#6B7280] hover:text-red-400 hover:bg-red-500/10"
                        title="Delete Thread"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages Scroll Area */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="p-8 text-center text-[#9CA3AF] text-xs">
                          No messages in this channel filter. Select &quot;All Messages&quot;.
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isLead = msg.sender === 'lead'
                          return (
                            <div
                              key={msg.id}
                              className={`flex gap-3 max-w-[80%] ${
                                isLead ? 'mr-auto' : 'ml-auto flex-row-reverse'
                              }`}
                            >
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                  isLead
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-[#7C3AED]/20 text-[#A78BFA]'
                                }`}
                              >
                                {isLead ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                              </div>
                              <div>
                                <div
                                  className={`rounded-2xl p-3 text-sm ${
                                    isLead
                                      ? 'bg-[#141825] text-white border border-white/[0.06]'
                                      : 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20'
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                </div>
                                <p
                                  className={`text-[10px] text-[#6B7280] mt-1 font-mono ${
                                    isLead ? 'text-left' : 'text-right'
                                  }`}
                                >
                                  {msg.time} {msg.channel ? `via ${msg.channel.toUpperCase()}` : ''}
                                </p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </ScrollArea>

                  {/* Message Input Box */}
                  <div className="p-4 border-t border-white/[0.06] bg-[#141825]">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleSendMessage()
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        placeholder={`Reply to ${selected.name} via ${selected.channel}...`}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        disabled={sendingMessage}
                        className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-[#9CA3AF] text-sm h-10"
                      />
                      <Button
                        type="submit"
                        disabled={!messageInput.trim() || sendingMessage}
                        className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-10 px-4 shrink-0 shadow-lg shadow-[#7C3AED]/20"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        {sendingMessage ? 'Sending...' : 'Send'}
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#9CA3AF]">
                  <MessageCircle className="h-12 w-12 mb-3 text-[#6B7280] opacity-40" />
                  <h3 className="text-white font-bold text-base mb-1">Select a Conversation</h3>
                  <p className="text-xs max-w-sm">
                    Choose a conversation from the left panel to view full live chat history or send a manual reply.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}