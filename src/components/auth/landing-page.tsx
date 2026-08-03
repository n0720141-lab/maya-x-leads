'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { FloatingReviews, REVIEWS } from '@/components/ui/floating-reviews'
import {
  Check,
  ArrowRight,
  Calendar,
  MessageSquare,
  MessageCircle,
  Zap,
  BarChart3,
  Users,
  Plug,
  Bot,
  Globe,
  Phone,
  Mail,
  Shield,
  Target,
  Menu,
  X,
  ChevronRight,
  Play,
  Star,
  TrendingUp,
  Sparkles,
  Send,
  Activity,
  Cpu,
  Layers,
  CheckCircle2,
  Lock,
} from 'lucide-react'

// ─── Keyframe Animations ──────────────────────────────────────────────────
const STYLES = `
@keyframes pulseGlow {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.08); }
}
@keyframes floatSlow {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
@keyframes shimmerBorder {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
`

export function LandingPage() {
  const storeSetPage = useAppStore((s) => s.setPage)
  const setPage = (page: any) => {
    try {
      useAppStore.getState().setPage(page)
    } catch {}
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('page', page)
      window.history.pushState({}, '', url.toString())
      window.dispatchEvent(new Event('popstate'))
    }
  }
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [leadsVolume, setLeadsVolume] = useState(25000)
  const [selectedIndustry, setSelectedIndustry] = useState('auto')
  const [simStep, setSimStep] = useState(0)

  // Live Simulator Step Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setSimStep((prev) => (prev + 1) % 4)
    }, 3500)
    return () => clearInterval(timer)
  }, [])

  const calcPrice = Math.round((leadsVolume / 1000) * 8.5)

  return (
    <div className="min-h-screen bg-[#06080F] text-white selection:bg-[#7C3AED]/30 selection:text-white font-sans relative overflow-hidden">
      <style>{STYLES}</style>

      {/* ── Background Glow Orbs ── */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#7C3AED]/20 via-[#3B82F6]/10 to-transparent blur-[140px] rounded-full -z-10" />
      <div className="pointer-events-none absolute top-[25%] -left-40 w-[600px] h-[600px] bg-[#7C3AED]/15 blur-[160px] rounded-full -z-10" />
      <div className="pointer-events-none absolute top-[55%] -right-40 w-[600px] h-[600px] bg-[#06B6D4]/15 blur-[160px] rounded-full -z-10" />

      {/* ── Top Navigation Bar ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#06080F]/80 border-b border-white/[0.08] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage('home')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-[#7C3AED]/30 bg-[#0D111C]">
              <Image src="/logo.png" alt="MayaX Logo" width={40} height={40} className="rounded-xl object-contain" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white">MayaX</span>
              <span className="ml-2 text-[10px] font-semibold tracking-wider text-[#A78BFA] uppercase px-2 py-0.5 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30">
                PRO SaaS v2.0
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9CA3AF]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#channels" className="hover:text-white transition-colors">Channels</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#reviews" className="hover:text-white transition-colors">Reviews</a>
          </div>

          {/* Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setPage('login')}
              className="text-[#D1D5DB] hover:text-white hover:bg-white/[0.06] font-medium"
            >
              Sign In
            </Button>
            <Button
              onClick={() => setPage('signup')}
              className="bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] hover:from-[#6D28D9] hover:to-[#2563EB] text-white font-semibold shadow-lg shadow-[#7C3AED]/25 hover:shadow-xl hover:shadow-[#7C3AED]/40 hover:-translate-y-0.5 transition-all"
            >
              Get Started Free <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-[#9CA3AF]"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden p-6 bg-[#0D111C] border-b border-white/10 space-y-4">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 font-medium">Features</a>
            <a href="#channels" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 font-medium">Channels</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 font-medium">How It Works</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 font-medium">Pricing</a>
            <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
              <Button onClick={() => setPage('login')} variant="outline" className="w-full text-white border-white/20">Sign In</Button>
              <Button onClick={() => setPage('signup')} className="w-full bg-[#7C3AED] text-white">Get Started Free</Button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#7C3AED]/20 to-[#3B82F6]/20 border border-[#7C3AED]/40 shadow-inner">
              <Sparkles className="w-4 h-4 text-[#A78BFA] animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-gray-200">
                Multi-Channel AI Lead Outreach & Qualification Engine
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white">
              Scale Lead Outreach to{' '}
              <span className="bg-gradient-to-r from-[#A78BFA] via-[#60A5FA] to-[#34D399] bg-clip-text text-transparent">
                50,000+ Daily
              </span>{' '}
              Conversations with DeepSeek AI
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-[#9CA3AF] max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Blast leads across <strong className="text-white">SIM Box SMS</strong>, <strong className="text-white">WhatsApp Baileys</strong>, & <strong className="text-white">Gmail SMTP</strong>. Auto-qualify responses, extract loan info, & push qualified deals straight to your CRM webhook.
            </p>

            {/* Bullet Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-sm text-gray-300 font-medium max-w-xl mx-auto lg:mx-0">
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                <span>100% Primary Inbox</span>
              </div>
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                <span>Sticky SIM Slot Lock</span>
              </div>
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                <span>Auto CRM Webhook</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <Button
                size="lg"
                onClick={() => setPage('signup')}
                className="w-full sm:w-auto h-14 px-8 text-base font-bold bg-gradient-to-r from-[#7C3AED] via-[#6366F1] to-[#3B82F6] hover:from-[#6D28D9] hover:to-[#1D4ED8] text-white shadow-xl shadow-[#7C3AED]/30 hover:shadow-2xl hover:shadow-[#7C3AED]/50 hover:-translate-y-1 transition-all rounded-xl"
              >
                Launch Your First Campaign <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/auth/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: 'owner@demo.com', password: '123456' }),
                    })
                    const data = await res.json()
                    if (res.ok) {
                      useAppStore.getState().setAuth(data.user, data.tenant, data.token)
                    } else {
                      setPage('login')
                    }
                  } catch {
                    setPage('login')
                  }
                }}
                className="w-full sm:w-auto h-14 px-8 text-base font-semibold bg-[#0D111C] border border-white/15 text-white hover:bg-white/[0.08] hover:border-white/30 rounded-xl"
              >
                <Play className="w-4 h-4 mr-2 text-[#A78BFA] fill-[#A78BFA]" /> Live Dashboard Demo
              </Button>
            </div>

            {/* Trust Footer */}
            <div className="flex items-center justify-center lg:justify-start gap-4 pt-6 text-xs text-[#6B7280]">
              <div className="flex -space-x-2">
                {['/public/logo-dark.png', '/public/logo-white.png'].map((_, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#3B82F6] border-2 border-[#06080F] flex items-center justify-center text-[10px] font-bold text-white">
                    {['A', 'S', 'F'][i]}
                  </div>
                ))}
              </div>
              <span>Trusted by <strong className="text-gray-300">240+ Auto Dealerships & Agencies</strong> worldwide</span>
            </div>
          </div>

          {/* Right Live Interactive Simulator Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl bg-gradient-to-b from-[#141827] to-[#0D111C] border border-white/10 p-6 shadow-2xl shadow-[#7C3AED]/15 backdrop-blur-xl">
              
              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Live AI Lead Qualification</span>
                </div>
                <span className="text-xs text-gray-400 font-mono">Sim Slot: 1.04</span>
              </div>

              {/* Chat Simulation Area */}
              <div className="py-6 space-y-4 min-h-[320px]">
                
                {/* Step 0: Inbound Lead */}
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold">
                    IN
                  </div>
                  <div className="bg-[#1E2436] rounded-xl p-3.5 text-xs text-gray-200 border border-white/5 max-w-[85%]">
                    <p className="font-semibold text-blue-400 mb-1">Lead: Ali (Google Sheet Import)</p>
                    <p>"Hi, I submitted an inquiry for a 2024 Honda Civic. Can I get auto financing?"</p>
                  </div>
                </div>

                {/* Step 1: AI Processing */}
                {simStep >= 1 && (
                  <div className="flex gap-3 items-start justify-end">
                    <div className="bg-[#2D1F4B] rounded-xl p-3.5 text-xs text-gray-100 border border-[#7C3AED]/30 max-w-[85%]">
                      <p className="font-semibold text-[#A78BFA] mb-1">MayaX AI (SIM Box SMS)</p>
                      <p>"Hi Ali! Yes, we work with financing partners for all credit types. What is your estimated monthly income?"</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#A78BFA] text-xs font-bold">
                      AI
                    </div>
                  </div>
                )}

                {/* Step 2: Lead Reply */}
                {simStep >= 2 && (
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold">
                      IN
                    </div>
                    <div className="bg-[#1E2436] rounded-xl p-3.5 text-xs text-gray-200 border border-white/5 max-w-[85%]">
                      <p>"Around $4,500/month. Credit score is 680."</p>
                    </div>
                  </div>
                )}

                {/* Step 3: Qualified Badge */}
                {simStep >= 3 && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>LEAD QUALIFIED ➔ Pushed to CRM Webhook</span>
                    </div>
                    <span className="font-mono text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded">200 OK</span>
                  </div>
                )}

              </div>

              {/* Card Footer Live Pulse */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                <span>Multi-Channel Sync: SMS + WhatsApp + Email</span>
                <span className="text-[#A78BFA] font-mono font-semibold">DeepSeek v3 Active</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── METRICS & LOGOS STRIP ── */}
      <section className="py-12 bg-[#0A0D18] border-y border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-white">50,000+</p>
              <p className="text-xs text-[#9CA3AF] font-medium mt-1">Daily SMS/WhatsApp Volume</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#34D399]">99.8%</p>
              <p className="text-xs text-[#9CA3AF] font-medium mt-1">Primary Inbox Deliverability</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#60A5FA]">128 SIMs</p>
              <p className="text-xs text-[#9CA3AF] font-medium mt-1">Skyline Gateway Capacity</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#A78BFA]">&lt; 0.8s</p>
              <p className="text-xs text-[#9CA3AF] font-medium mt-1">DeepSeek AI Response Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CHANNELS SHOWCASE SECTION ── */}
      <section id="channels" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-xs font-bold text-[#A78BFA] uppercase tracking-widest">Integrated Hardware & APIs</h2>
          <p className="text-3xl sm:text-4xl font-bold text-white">3 Heavy-Duty Channels in One Unified Dashboard</p>
          <p className="text-base text-[#9CA3AF]">
            Connect your physical SIM box hardware, WhatsApp sessions, and Gmail SMTP servers without complex coding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: SIM Box */}
          <div className="p-8 rounded-2xl bg-[#0D111C] border border-white/10 hover:border-[#7C3AED]/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Skyline SIM Box Gateway</h3>
            <p className="text-sm text-[#9CA3AF] leading-relaxed mb-6">
              Full support for Skyline SK Gateway (192.168.1.16 on Port 80 HTTP API + SMPP Port 20002). Features sticky SIM slot locking so replies always match original outbound numbers.
            </p>
            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Sticky SIM Slot Lock</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> SMPP Inbound Receiver</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Anti-Ban Batch Delays</li>
            </ul>
          </div>

          {/* Card 2: WhatsApp */}
          <div className="p-8 rounded-2xl bg-[#0D111C] border border-white/10 hover:border-[#3B82F6]/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">WhatsApp Baileys Engine</h3>
            <p className="text-sm text-[#9CA3AF] leading-relaxed mb-6">
              Connect via quick QR Code scan (whatsapp-web.js / Baileys). Zero per-message Meta fees, built-in human typing simulation with "composing..." status indicator.
            </p>
            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> FREE — No Meta per-msg fees</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Real Human Typing Simulation</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Multi-Session Account Management</li>
            </ul>
          </div>

          {/* Card 3: Email */}
          <div className="p-8 rounded-2xl bg-[#0D111C] border border-white/10 hover:border-[#34D399]/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Direct Gmail & SMTP</h3>
            <p className="text-sm text-[#9CA3AF] leading-relaxed mb-6">
              Direct SMTP integration using App Passwords with native DKIM, Message-ID alignment, and 28-32s random pacing for 100% Primary Inbox deliverability.
            </p>
            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> DKIM / DMARC Header Alignment</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 30s Random Anti-Spam Pacing</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Dynamic Wording Spinning</li>
            </ul>
          </div>

        </div>
      </section>

      {/* ── HOW IT WORKS SECTION ── */}
      <section id="how-it-works" className="py-24 bg-[#0A0D18] border-t border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs font-bold text-[#60A5FA] uppercase tracking-widest">Seamless Workflow</h2>
            <p className="text-3xl sm:text-4xl font-bold text-white">How MayaX Automates Your Lead Pipeline</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="relative p-8 rounded-2xl bg-[#0D111C] border border-white/10">
              <div className="text-4xl font-extrabold text-[#7C3AED]/40 mb-4">01</div>
              <h3 className="text-lg font-bold text-white mb-2">Import & Paste Leads</h3>
              <p className="text-sm text-[#9CA3AF]">
                Upload Excel CSV files or connect your Google Sheets service account. Fields automatically map Phone, Email, Name, and Vehicle interest.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative p-8 rounded-2xl bg-[#0D111C] border border-white/10">
              <div className="text-4xl font-extrabold text-[#3B82F6]/40 mb-4">02</div>
              <h3 className="text-lg font-bold text-white mb-2">Multi-Channel Outreach Blast</h3>
              <p className="text-sm text-[#9CA3AF]">
                System sends initial message across SIM Box SMS, WhatsApp, and Email. The channel customer replies on becomes the active thread!
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative p-8 rounded-2xl bg-[#0D111C] border border-white/10">
              <div className="text-4xl font-extrabold text-[#34D399]/40 mb-4">03</div>
              <h3 className="text-lg font-bold text-white mb-2">DeepSeek AI Qualification & CRM Sync</h3>
              <p className="text-sm text-[#9CA3AF]">
                DeepSeek AI conducts natural conversations, extracts vehicle preference, monthly income, credit score, and pushes qualified leads to your CRM.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── REVIEWS & TESTIMONIALS SECTION ── */}
      <section id="reviews" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>4.9 / 5.0 Rating from 240+ Dealerships</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Loved by Automotive Dealerships & Agencies</h2>
          <p className="text-base text-[#9CA3AF]">
            Here is what dealership owners and growth teams say about scaling lead outreach with MayaX.
          </p>
        </div>

        {/* Reviews Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {REVIEWS.slice(0, 6).map((rev) => (
            <div
              key={rev.name}
              className="p-6 rounded-2xl bg-[#0D111C] border border-white/10 hover:border-[#7C3AED]/30 transition-all space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: rev.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-200 leading-relaxed italic">
                  "{rev.quote}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: rev.color + '33', color: rev.color }}
                >
                  {rev.initials}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{rev.name}</h4>
                  <p className="text-[11px] text-[#9CA3AF]">{rev.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING CALCULATOR SECTION ── */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-xs font-bold text-[#34D399] uppercase tracking-widest">Flexible Pricing</h2>
          <p className="text-3xl sm:text-4xl font-bold text-white">Transparent Plans Built for Your Scale</p>
        </div>

        <div className="max-w-4xl mx-auto p-8 sm:p-12 rounded-3xl bg-[#0D111C] border border-white/10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Controls */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-2">Select Industry Focus:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'auto', label: 'Auto Dealers' },
                    { id: 'realestate', label: 'Real Estate' },
                    { id: 'finance', label: 'Finance' },
                    { id: 'agency', label: 'Agencies' },
                  ].map((ind) => (
                    <button
                      key={ind.id}
                      onClick={() => setSelectedIndustry(ind.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selectedIndustry === ind.id
                          ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/30'
                          : 'bg-white/[0.04] border-white/10 text-gray-400 hover:bg-white/[0.08]'
                      }`}
                    >
                      {ind.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-300">Monthly Leads Volume:</label>
                  <span className="text-lg font-bold text-[#A78BFA] font-mono">{leadsVolume.toLocaleString()} leads/mo</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="100000"
                  step="5000"
                  value={leadsVolume}
                  onChange={(e) => setLeadsVolume(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#7C3AED]"
                />
              </div>

              <ul className="space-y-2 text-xs text-gray-300 pt-2">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Unlimited SIM Box Gateway Ports</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> DeepSeek AI Auto-Reply Model Included</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Multi-Tenant Super Admin Access</li>
              </ul>
            </div>

            {/* Right Result Card */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-b from-[#181C2E] to-[#111422] border border-white/10 text-center space-y-6">
              <span className="text-xs uppercase font-bold tracking-wider text-gray-400">Estimated Investment</span>
              <div>
                <span className="text-4xl sm:text-5xl font-extrabold text-white">${calcPrice}</span>
                <span className="text-sm text-gray-400">/month</span>
              </div>
              <Button
                size="lg"
                onClick={() => setPage('signup')}
                className="w-full h-12 bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] hover:from-[#6D28D9] hover:to-[#2563EB] text-white font-bold shadow-lg shadow-[#7C3AED]/25"
              >
                Start Free 14-Day Trial
              </Button>
              <p className="text-[11px] text-gray-400">No credit card required • Cancel anytime</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#04050A] border-t border-white/10 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-12 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-[#0D111C]">
                <Image src="/logo.png" alt="MayaX Logo" width={32} height={32} className="rounded-lg object-contain" />
              </div>
              <span className="text-lg font-bold text-white">MayaX Engine</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[#9CA3AF]">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#channels" className="hover:text-white transition-colors">Channels</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <button onClick={() => setPage('login')} className="hover:text-white transition-colors">Sign In</button>
            </div>
          </div>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B7280] gap-4">
            <p>© 2026 MayaX SaaS Engine. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>GDPR Compliant</span>
              <span>•</span>
              <span>DMARC Aligned</span>
              <span>•</span>
              <span>SSL 256-Bit Encrypted</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}