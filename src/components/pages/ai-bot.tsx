'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import {
  Bot,
  HelpCircle,
  CheckCircle2,
  Target,
  CalendarCheck,
  Sparkles,
  MessageSquare,
  User,
  Save,
  Send,
  Zap,
  Clock,
  Timer,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'

const qualificationCriteria = [
  { id: 'budget', label: 'Budget Confirmed', description: 'Lead has confirmed a budget range', enabled: true },
  { id: 'timeline', label: 'Timeline Established', description: 'Lead has a purchase timeline', enabled: true },
  { id: 'decision', label: 'Decision Maker Identified', description: 'Lead is the primary decision maker', enabled: false },
  { id: 'contact', label: 'Contact Information Complete', description: 'Valid phone & email collected', enabled: true },
  { id: 'tradein', label: 'Trade-In Interest Confirmed', description: 'Lead has expressed trade-in interest', enabled: false },
  { id: 'financing', label: 'Financing Needs Assessed', description: 'Lead financing preferences identified', enabled: true },
]

const conversationMessages = [
  {
    id: 1,
    sender: 'bot' as const,
    text: "Hi there! 👋 Welcome to MayaX Auto. I'm your virtual sales assistant. How can I help you find the perfect vehicle today?",
    time: '10:00 AM',
  },
  {
    id: 2,
    sender: 'lead' as const,
    text: "Hey! I'm looking to upgrade my current car. Interested in an SUV.",
    time: '10:01 AM',
  },
  {
    id: 3,
    sender: 'bot' as const,
    text: "Great choice! SUVs are very popular right now. What's your approximate budget range? We have excellent options from $25K all the way up to luxury models.",
    time: '10:01 AM',
  },
  {
    id: 4,
    sender: 'lead' as const,
    text: "I'm thinking around $35K to $50K. Something with good tech features.",
    time: '10:02 AM',
  },
  {
    id: 5,
    sender: 'bot' as const,
    text: "Perfect! In that range, I'd recommend checking out the new Explorer or the Traverse. Both come loaded with tech. When are you looking to make a purchase?",
    time: '10:02 AM',
  },
  {
    id: 6,
    sender: 'lead' as const,
    text: "Within the next 1-2 months I think. I still need to sell my current car first.",
    time: '10:03 AM',
  },
  {
    id: 7,
    sender: 'bot' as const,
    text: "That's great timing — we can help with trade-ins too! Could I get your name and the best number to reach you? I'll have one of our product specialists give you a personalized walkthrough.",
    time: '10:03 AM',
  },
  {
    id: 8,
    sender: 'lead' as const,
    text: "Sure! I'm Marcus. My number is (555) 234-8901. Prefer afternoon calls if possible.",
    time: '10:04 AM',
  },
]

const performanceStats = [
  {
    label: 'Questions Asked',
    value: '9,842',
    icon: MessageSquare,
    subValue: '+1,234 this week',
    progress: 0,
  },
  {
    label: 'Answers Collected',
    value: '8,721',
    icon: CheckCircle2,
    subValue: '88.6% completion rate',
    progress: 88.6,
  },
  {
    label: 'Qualification Rate',
    value: '10.3%',
    icon: Target,
    subValue: '+1.2% vs last month',
    progress: 10.3,
  },
  {
    label: 'Appointment Rate',
    value: '3.3%',
    icon: CalendarCheck,
    subValue: '+0.4% vs last month',
    progress: 3.3,
  },
]

export default function AIBot() {
  const [botName, setBotName] = useState('MayaX Sales Assistant')
  const [personality, setPersonality] = useState('Professional')
  const [greeting, setGreeting] = useState(
    "Hi there! 👋 Welcome to MayaX Auto. I'm your virtual sales assistant. How can I help you find the perfect vehicle today?"
  )
  const [responseSpeed, setResponseSpeed] = useState('instant')
  const [aiApiKey, setAiApiKey] = useState('sk-f5f4724e6fd243a7ae21ef4f627e5e95')
  const [instructions, setInstructions] = useState(
    'You are Maya, an AI sales assistant for US/Canada car dealerships. Ask Q1 (Vehicle), Q2 (Income), Q3 (License) to qualify leads.'
  )
  const [criteria, setCriteria] = useState(qualificationCriteria.map((c) => ({ ...c })))
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<{ config?: Record<string, unknown> }>('/bot-config')
        const cfg = data?.config || data
        if (cfg && typeof cfg === 'object') {
          if (cfg.botName) setBotName(String(cfg.botName))
          if (cfg.personality) setPersonality(String(cfg.personality))
          if (cfg.greeting) setGreeting(String(cfg.greeting))
          if (cfg.responseSpeed) setResponseSpeed(String(cfg.responseSpeed))
          if (cfg.aiApiKey) setAiApiKey(String(cfg.aiApiKey))
          if (cfg.instructions) setInstructions(String(cfg.instructions))
        }
      } catch (err) {
        console.error('Failed to load bot config:', err)
      }
      try {
        const aiCheck = await api.get<{ configured: boolean }>('/ai/chat')
        setAiConfigured(aiCheck.configured ?? true)
      } catch {
        setAiConfigured(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSaveConfig = async () => {
    setSaving(true)
    setSaveSuccessMsg('')
    try {
      const formData = {
        botName,
        personality,
        greeting,
        responseSpeed,
        aiApiKey,
        instructions,
        status: 'active',
      }
      await api.put('/bot-config', formData)
      setSaveSuccessMsg('AI Bot Configuration & Key saved successfully!')
      setAiConfigured(true)
      setTimeout(() => setSaveSuccessMsg(''), 3000)
    } catch (err) {
      console.error('Failed to save bot config:', err)
    } finally {
      setSaving(false)
    }
  }

  const toggleCriteria = (id: string) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Bot Configuration</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">Configure your AI sales assistant behavior and qualification flow</p>
        </div>
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 border gap-1.5 px-3 py-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          {aiConfigured === null && loading ? 'Checking...' : aiConfigured ? 'Bot Active' : 'Bot Inactive'}
        </Badge>
      </div>

      {/* Main content: Config + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left panel: Configuration (60%) */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#7C3AED]/10 p-2">
                  <Bot className="h-5 w-5 text-[#7C3AED]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Bot Settings</h2>
                  <p className="text-sm text-[#9CA3AF]">Configure the core behavior of your AI assistant</p>
                </div>
              </div>

              {/* DeepSeek API Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-[#9CA3AF]">DeepSeek AI API Key</Label>
                  <span className="text-xs text-emerald-400 font-mono">Connected</span>
                </div>
                <Input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white font-mono text-sm placeholder:text-[#6B7280]"
                  placeholder="sk-..."
                />
                <p className="text-xs text-[#6B7280]">Client's DeepSeek API Key for automated lead qualification</p>
              </div>

              {/* Bot Name */}
              <div className="space-y-2">
                <Label className="text-sm text-[#9CA3AF]">Bot Name</Label>
                <Input
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-[#6B7280] focus:border-[#7C3AED]/50 focus:ring-[#7C3AED]/20"
                  placeholder="Enter bot name"
                />
              </div>

              {/* System Instructions / Prompt */}
              <div className="space-y-2">
                <Label className="text-sm text-[#9CA3AF]">AI Qualification Instructions (System Prompt)</Label>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-[#6B7280] focus:border-[#7C3AED]/50 focus:ring-[#7C3AED]/20 resize-none font-mono text-xs"
                  placeholder="Enter custom instructions for DeepSeek AI..."
                />
              </div>

              {/* Personality/Tone */}
              <div className="space-y-2">
                <Label className="text-sm text-[#9CA3AF]">Bot Personality / Tone</Label>
                <Select value={personality} onValueChange={setPersonality}>
                  <SelectTrigger className="w-full bg-white/[0.04] border-white/[0.08] text-white data-[placeholder]:text-[#6B7280] focus:border-[#7C3AED]/50 focus:ring-[#7C3AED]/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-white/[0.08]">
                    <SelectItem value="Friendly" className="text-white focus:bg-white/[0.05] focus:text-white">
                      😊 Friendly — Casual and warm
                    </SelectItem>
                    <SelectItem value="Professional" className="text-white focus:bg-white/[0.05] focus:text-white">
                      🎩 Professional — Polished and efficient
                    </SelectItem>
                    <SelectItem value="Casual" className="text-white focus:bg-white/[0.05] focus:text-white">
                      ✌️ Casual — Relaxed and informal
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Greeting Message */}
              <div className="space-y-2">
                <Label className="text-sm text-[#9CA3AF]">Greeting Message</Label>
                <Textarea
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  rows={3}
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-[#6B7280] focus:border-[#7C3AED]/50 focus:ring-[#7C3AED]/20 resize-none"
                  placeholder="Enter the bot's greeting message"
                />
                <p className="text-xs text-[#6B7280]">This is the first message the bot sends to new leads</p>
              </div>

              {/* Response Speed */}
              <div className="space-y-2">
                <Label className="text-sm text-[#9CA3AF]">Response Speed</Label>
                <Select value={responseSpeed} onValueChange={setResponseSpeed}>
                  <SelectTrigger className="w-full bg-white/[0.04] border-white/[0.08] text-white data-[placeholder]:text-[#6B7280] focus:border-[#7C3AED]/50 focus:ring-[#7C3AED]/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-white/[0.08]">
                    <SelectItem value="instant" className="text-white focus:bg-white/[0.05] focus:text-white">
                      <span className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5" /> Instant
                      </span>
                    </SelectItem>
                    <SelectItem value="1min" className="text-white focus:bg-white/[0.05] focus:text-white">
                      <span className="flex items-center gap-2">
                        <Timer className="h-3.5 w-3.5" /> 1 min delay
                      </span>
                    </SelectItem>
                    <SelectItem value="3min" className="text-white focus:bg-white/[0.05] focus:text-white">
                      <span className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" /> 3 min delay
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#6B7280]">Adding a small delay makes conversations feel more natural</p>
              </div>
            </CardContent>
          </Card>

          {/* Qualification Criteria */}
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <Target className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Qualification Criteria</h2>
                  <p className="text-sm text-[#9CA3AF]">
                    Toggle which criteria the bot must verify before qualifying a lead
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {criteria.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-full p-1 transition-colors ${
                          item.enabled ? 'bg-[#7C3AED]/15' : 'bg-white/[0.04]'
                        }`}
                      >
                        <CheckCircle2
                          className={`h-4 w-4 transition-colors ${
                            item.enabled ? 'text-[#7C3AED]' : 'text-[#4B5563]'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        <p className="text-xs text-[#6B7280]">{item.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={item.enabled}
                      onCheckedChange={() => toggleCriteria(item.id)}
                      className="data-[state=checked]:bg-[#7C3AED]"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-[#9CA3AF]">
                  <span className="text-white font-medium">{criteria.filter((c) => c.enabled).length}</span> of{' '}
                  {criteria.length} criteria enabled
                </p>
                <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300" onClick={handleSaveConfig} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel: Live Preview (40%) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 sticky top-6">
            <CardContent className="p-0 flex flex-col" style={{ maxHeight: '680px' }}>
              {/* Chat header */}
              <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
                <div className="rounded-full bg-[#7C3AED] p-2">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{botName}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                    </span>
                    <span className="text-xs text-emerald-400">Online</span>
                    <span className="text-xs text-[#6B7280]">• {personality} tone</span>
                  </div>
                </div>
                <Badge className="ml-auto bg-[#7C3AED]/15 text-[#7C3AED] border-[#7C3AED]/20 border text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Preview
                </Badge>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversationMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'lead' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`flex items-end gap-2 max-w-[85%] ${
                        msg.sender === 'lead' ? 'flex-row' : 'flex-row-reverse'
                      }`}
                    >
                      <div
                        className={`rounded-full p-1.5 shrink-0 ${
                          msg.sender === 'bot' ? 'bg-[#7C3AED]/20' : 'bg-white/[0.08]'
                        }`}
                      >
                        {msg.sender === 'bot' ? (
                          <Bot className="h-3 w-3 text-[#7C3AED]" />
                        ) : (
                          <User className="h-3 w-3 text-[#9CA3AF]" />
                        )}
                      </div>
                      <div>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            msg.sender === 'bot'
                              ? 'bg-[#7C3AED] text-white rounded-br-md'
                              : 'bg-white/[0.08] text-[#E5E7EB] rounded-bl-md'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <p
                          className={`text-[10px] text-[#6B7280] mt-1 ${
                            msg.sender === 'bot' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat input (visual only) */}
              <div className="p-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Input
                    disabled
                    placeholder="Lead is typing..."
                    className="bg-white/[0.04] border-white/[0.08] text-[#6B7280] text-sm flex-1"
                  />
                  <Button
                    disabled
                    size="sm"
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom: AI Performance Stats */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5 text-[#7C3AED]" />
          <h2 className="text-lg font-semibold text-white">AI Performance Overview</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {performanceStats.map((stat) => (
            <Card
              key={stat.label}
              className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="rounded-lg bg-[#7C3AED]/10 p-2">
                    <stat.icon className="h-4 w-4 text-[#7C3AED]" />
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 border text-[10px]">
                    <HelpCircle className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-[#9CA3AF] mt-1">{stat.label}</p>
                {stat.progress > 0 && (
                  <div className="mt-3">
                    <Progress value={stat.progress} className="h-1.5 bg-white/[0.06]" />
                  </div>
                )}
                <p className="text-xs text-emerald-400 mt-2">{stat.subValue}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}