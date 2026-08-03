'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Check,
  MessageSquare,
  Bot,
  Zap,
  Shield,
  Building2,
  Building,
  MapPin,
  Globe,
  Clock,
  Pencil,
  Loader2,
  Sparkles,
  Users,
  Headphones,
  BarChart3,
  Filter,
  LayoutGrid,
} from 'lucide-react'
import { FloatingReviews } from '@/components/ui/floating-reviews'

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = ['Create Account', 'Business Info', 'Choose Plan', 'Setup Complete'] as const

const BUSINESS_TYPES = [
  'Automotive',
  'Real Estate',
  'Healthcare',
  'Insurance',
  'Education',
  'Financial Services',
  'Other',
] as const

const ROLES = [
  'Owner/Manager',
  'Sales Manager',
  'Marketing Manager',
  'Agent',
  'Other',
] as const

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const

const PLANS = {
  starter: {
    name: 'Starter',
    price: 99,
    leads: '100 leads/mo',
    messages: '1,000 messages',
    seats: '1 agent seat',
    features: ['SMS only', 'Basic lead management', 'Email support'],
    highlight: false,
  },
  growth: {
    name: 'Growth',
    price: 499,
    leads: '600 leads/mo',
    messages: '25,000 messages',
    seats: '5 agent seats',
    features: [
      'All channels',
      'Advanced automations',
      'Priority support',
      'Team access',
      'Custom lead filters',
      'Advanced reporting',
    ],
    highlight: true,
  },
  enterprise: {
    name: 'Enterprise',
    price: 1999,
    leads: 'Unlimited leads',
    messages: '100,000 messages',
    seats: '10 agent seats',
    features: [
      'All channels + priority',
      'Unlimited automations',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'White-label options',
    ],
    highlight: false,
  },
} as const

type PlanKey = keyof typeof PLANS

const SIDEBAR_CONTENT: Record<
  number,
  { headline: string; keyPhrase: string; description: string }
> = {
  1: {
    headline: 'Create Your Account',
    keyPhrase: 'Get Started in Minutes',
    description:
      'Join thousands of businesses that trust MayaX Leads to automate their lead engagement and close more deals with AI-powered conversations.',
  },
  2: {
    headline: 'Let AI Handle The Conversations.',
    keyPhrase: 'You Close More Deals.',
    description:
      'Tell us about your business so our AI can be tailored to your industry, automating lead qualification and appointment booking 24/7.',
  },
  3: {
    headline: 'Powerful Platform.',
    keyPhrase: 'Simple Pricing. Built for Results.',
    description:
      'Choose a plan that scales with your business. No hidden fees, no long-term contracts — just results.',
  },
  4: {
    headline: 'Almost There!',
    keyPhrase: 'Review Your Details.',
    description:
      'Double-check your information and you\'ll be ready to start engaging leads immediately after completing setup.',
  },
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-xl mx-auto mb-8 px-4">
      {STEPS.map((label, i) => {
        const stepNum = i + 1
        const isCompleted = stepNum < currentStep
        const isCurrent = stepNum === currentStep
        const isFuture = stepNum > currentStep

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            {/* Circle + Label */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 shrink-0',
                  isCompleted && 'bg-purple-600 text-white',
                  isCurrent && 'bg-purple-600 text-white ring-4 ring-purple-600/20',
                  isFuture && 'bg-[#374151] text-white',
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span
                className={cn(
                  'text-[11px] font-medium text-center leading-tight whitespace-nowrap',
                  isCurrent ? 'text-purple-400' : isCompleted ? 'text-white' : 'text-gray-500',
                )}
              >
                {label}
              </span>
            </div>

            {/* Connector Line */}
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-[2px] flex-1 mx-2 mt-[-18px] transition-colors duration-300',
                  stepNum < currentStep ? 'bg-purple-600' : 'bg-[#374151]',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Dark Input Wrapper ──────────────────────────────────────────────────────

function DarkInput({
  icon: Icon,
  children,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-10" />
      )}
      {children}
    </div>
  )
}

function darkInputClasses(hasIcon: boolean) {
  return cn(
    'h-11 w-full rounded-lg border border-[#2A2F3D] bg-[#1A1F2E] text-white placeholder:text-[#6B7280] text-sm',
    'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20',
    'transition-colors duration-200',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'file:text-foreground selection:bg-purple-500 selection:text-white',
    hasIcon && 'pl-10',
  )
}

function darkSelectTriggerClasses(hasIcon: boolean) {
  return cn(
    'h-11 w-full rounded-lg border border-[#2A2F3D] bg-[#1A1F2E] text-white text-sm',
    'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20',
    'transition-colors duration-200 data-[placeholder]:text-[#6B7280]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    hasIcon && 'pl-10',
    '[&>span]:text-white',
  )
}

// ─── Left Sidebar ────────────────────────────────────────────────────────────

function LeftSidebar({ step }: { step: number }) {
  const content = SIDEBAR_CONTENT[step]

  const features = [
    {
      icon: MessageSquare,
      title: 'Multi-Channel Outreach',
      desc: 'Engage leads across SMS, WhatsApp, and Email — all from one platform.',
    },
    {
      icon: Bot,
      title: 'AI That Converts',
      desc: 'Our AI asks the right questions, qualifies leads, and books more appointments.',
    },
    {
      icon: Zap,
      title: 'Powerful Automations',
      desc: 'Build smart workflows to follow up, nurture, and convert automatically.',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      desc: 'Enterprise-grade security with 99.9% uptime and data encryption.',
    },
  ]

  return (
    <aside className="hidden md:flex md:w-[35%] lg:w-[38%] bg-[#141825] flex-col justify-between p-8 lg:p-10 overflow-y-auto">
      <div className="space-y-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="MayaX Leads"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <div>
            <span className="text-2xl font-bold text-white leading-tight">MayaX</span>
            <p className="text-[11px] font-medium text-white/40 -mt-0.5">Leads</p>
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
            {content.headline.split(content.keyPhrase)[0]}
            {content.headline.includes(content.keyPhrase) && (
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                {content.keyPhrase}
              </span>
            )}
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">{content.description}</p>
        </div>

        {/* Features */}
        <div className="space-y-4">
          {features.map((f) => (
            <div key={f.title} className="flex gap-3 items-start group">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 group-hover:bg-purple-500/20 group-hover:shadow-lg group-hover:shadow-purple-500/10 group-hover:-translate-y-0.5">
                <f.icon className="w-4.5 h-4.5 text-purple-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{f.title}</p>
                <p className="text-gray-500 text-xs leading-relaxed mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Reviews — replaces old static testimonial */}
      <div className="mt-8">
        <FloatingReviews autoRotateMs={6000} compact />
      </div>
    </aside>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SignupForm() {
  const setAuth = useAppStore((s) => s.setAuth)
  const setPage = useAppStore((s) => s.setPage)

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Step 2
  const [companyName, setCompanyName] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [role, setRole] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessWebsite, setBusinessWebsite] = useState('')
  const [timezone, setTimezone] = useState('')

  // Step 3
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('growth')

  // ── Validation ───────────────────────────────────────────────────────────

  function validateStep(s: number): boolean {
    switch (s) {
      case 1: {
        if (!fullName.trim()) { toast.error('Please enter your full name'); return false }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          toast.error('Please enter a valid email address'); return false
        }
        if (!phone.trim()) { toast.error('Please enter your phone number'); return false }
        if (password.length < 6) { toast.error('Password must be at least 6 characters'); return false }
        if (password !== confirmPassword) { toast.error('Passwords do not match'); return false }
        return true
      }
      case 2: {
        if (!companyName.trim()) { toast.error('Please enter your business name'); return false }
        if (!businessPhone.trim()) { toast.error('Please enter your business phone number'); return false }
        if (!businessType) { toast.error('Please select a business type'); return false }
        if (!businessEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
          toast.error('Please enter a valid business email'); return false
        }
        if (!role) { toast.error('Please select your role'); return false }
        if (!businessAddress.trim()) { toast.error('Please enter your business address'); return false }
        if (!timezone) { toast.error('Please select your time zone'); return false }
        return true
      }
      case 3: {
        if (!selectedPlan) { toast.error('Please select a plan'); return false }
        return true
      }
      default:
        return true
    }
  }

  function handleNext() {
    if (!validateStep(step)) return
    if (step < 4) setStep(step + 1)
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1)
    } else {
      setPage('home')
    }
  }

  function goToStep(s: number) {
    if (s < step) setStep(s)
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email,
          password,
          companyName,
          businessPhone,
          businessType,
          businessEmail,
          role,
          businessAddress,
          businessWebsite,
          timezone,
          plan: selectedPlan,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Sign up failed')
        return
      }
      // Set auth state and force navigation
      setAuth(data.user, data.tenant, data.token)
      setPage('dashboard')
      toast.success('Account created successfully! Welcome to MayaX Leads.')
      // Safety fallback: if dashboard doesn't load within 1.5s, force reload
      setTimeout(() => {
        const state = useAppStore.getState()
        if (!state.isAuthenticated || state.currentPage !== 'dashboard') {
          window.location.reload()
        }
      }, 1500)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Plan Card ────────────────────────────────────────────────────────────

  function PlanCard({ planKey }: { planKey: PlanKey }) {
    const plan = PLANS[planKey]
    const isSelected = selectedPlan === planKey

    return (
      <button
        type="button"
        onClick={() => setSelectedPlan(planKey)}
        className={cn(
          'relative flex flex-col rounded-xl border p-6 text-left transition-all duration-200 cursor-pointer w-full',
          'hover:border-purple-500/50',
          isSelected
            ? 'border-purple-500 bg-purple-500/[0.07] shadow-lg shadow-purple-500/10'
            : 'border-[#2A2F3D] bg-[#1A1F2E] hover:bg-[#1E2436]',
        )}
      >
        {plan.highlight && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-semibold">
              <Sparkles className="w-3 h-3" />
              RECOMMENDED
            </span>
          </div>
        )}

        {isSelected && (
          <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        )}

        <h3 className="text-lg font-semibold text-white">{plan.name}</h3>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-white">${plan.price}</span>
          <span className="text-gray-500 text-sm">/mo</span>
        </div>

        <div className="mt-4 space-y-2 flex-1">
          <p className="text-sm text-gray-300 font-medium">{plan.leads}</p>
          <p className="text-sm text-gray-300">{plan.messages}</p>
          <p className="text-sm text-gray-300">{plan.seats}</p>
          <div className="h-px bg-[#2A2F3D] my-2" />
          {plan.features.map((f) => (
            <div key={f} className="flex items-center gap-2">
              <Check className={cn('w-4 h-4 shrink-0', isSelected ? 'text-purple-400' : 'text-gray-500')} />
              <span className="text-sm text-gray-400">{f}</span>
            </div>
          ))}
        </div>
      </button>
    )
  }

  // ── Review Info Field ────────────────────────────────────────────────────

  function ReviewField({ label, value }: { label: string; value: string }) {
    return (
      <div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-sm text-white bg-[#1A1F2E] rounded-lg px-3 py-2.5 border border-[#2A2F3D]">
          {value || '—'}
        </p>
      </div>
    )
  }

  // ── Render Steps ─────────────────────────────────────────────────────────

  function renderStepContent() {
    switch (step) {
      // ─── STEP 1 ─────────────────────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div>
              <h2 className="text-2xl font-bold text-white">Create Account</h2>
              <p className="text-gray-400 text-sm mt-1">
                Enter your personal details to get started.
              </p>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label className="text-white text-sm">Full Name</Label>
                <DarkInput icon={User}>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={darkInputClasses(true)}
                  />
                </DarkInput>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-white text-sm">Work Email</Label>
                <DarkInput icon={Mail}>
                  <Input
                    type="email"
                    placeholder="john@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={darkInputClasses(true)}
                  />
                </DarkInput>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="text-white text-sm">Phone Number</Label>
                <DarkInput icon={Phone}>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={darkInputClasses(true)}
                  />
                </DarkInput>
              </div>

              {/* Password Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm">Password</Label>
                  <DarkInput icon={Lock}>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={darkInputClasses(true)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </DarkInput>
                </div>

                <div className="space-y-2">
                  <Label className="text-white text-sm">Confirm Password</Label>
                  <DarkInput icon={Lock}>
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={darkInputClasses(true)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </DarkInput>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                onClick={handleBack}
                className="h-11 px-6 bg-[#2A2F3D] hover:bg-[#363D50] text-white rounded-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {step === 1 ? 'Back to Website' : 'Back'}
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                className="h-11 px-6 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg shadow-lg shadow-[#7C3AED]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#7C3AED]/35 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )

      // ─── STEP 2 ─────────────────────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div>
              <h2 className="text-2xl font-bold text-white">Business Information</h2>
              <p className="text-gray-400 text-sm mt-1">
                Tell us about your business so we can personalize your experience.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
              {/* Left: Form fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Business Name */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Business Name</Label>
                    <DarkInput icon={Building2}>
                      <Input
                        type="text"
                        placeholder="Acme Corp"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className={darkInputClasses(true)}
                      />
                    </DarkInput>
                  </div>

                  {/* Business Phone */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Business Phone</Label>
                    <DarkInput icon={Phone}>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={businessPhone}
                        onChange={(e) => setBusinessPhone(e.target.value)}
                        className={darkInputClasses(true)}
                      />
                    </DarkInput>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Business Type */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Business Type</Label>
                    <DarkInput icon={Building}>
                      <Select value={businessType} onValueChange={setBusinessType}>
                        <SelectTrigger className={darkSelectTriggerClasses(true)}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1F2E] border-[#2A2F3D]">
                          {BUSINESS_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="text-gray-300 focus:bg-purple-500/10 focus:text-white">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </DarkInput>
                  </div>

                  {/* Business Email */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Business Email</Label>
                    <DarkInput icon={Mail}>
                      <Input
                        type="email"
                        placeholder="info@company.com"
                        value={businessEmail}
                        onChange={(e) => setBusinessEmail(e.target.value)}
                        className={darkInputClasses(true)}
                      />
                    </DarkInput>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Your Role */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Your Role</Label>
                    <DarkInput icon={User}>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className={darkSelectTriggerClasses(true)}>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1F2E] border-[#2A2F3D]">
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r} className="text-gray-300 focus:bg-purple-500/10 focus:text-white">
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </DarkInput>
                  </div>

                  {/* Business Address */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Business Address</Label>
                    <DarkInput icon={MapPin}>
                      <Input
                        type="text"
                        placeholder="123 Main St, City, State"
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        className={darkInputClasses(true)}
                      />
                    </DarkInput>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Website */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm">
                      Business Website <span className="text-gray-500 font-normal">(optional)</span>
                    </Label>
                    <DarkInput icon={Globe}>
                      <Input
                        type="url"
                        placeholder="https://www.company.com"
                        value={businessWebsite}
                        onChange={(e) => setBusinessWebsite(e.target.value)}
                        className={darkInputClasses(true)}
                      />
                    </DarkInput>
                  </div>

                  {/* Timezone */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Time Zone</Label>
                    <DarkInput icon={Clock}>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger className={darkSelectTriggerClasses(true)}>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1F2E] border-[#2A2F3D] max-h-60">
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz} className="text-gray-300 focus:bg-purple-500/10 focus:text-white">
                              {tz.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </DarkInput>
                  </div>
                </div>
              </div>

              {/* Right: Info card */}
              <div className="hidden lg:block">
                <div className="rounded-xl bg-[#1A1F2E] border border-[#2A2F3D] p-5 sticky top-6">
                  <h4 className="text-white font-semibold text-sm mb-3">Why we ask this?</h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                      <span className="text-gray-400 text-xs leading-relaxed">
                        Personalize AI conversations for your industry
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                      <span className="text-gray-400 text-xs leading-relaxed">
                        Configure the right channel integrations
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                      <span className="text-gray-400 text-xs leading-relaxed">
                        Set up proper lead routing and scheduling
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                      <span className="text-gray-400 text-xs leading-relaxed">
                        Ensure compliance with regional regulations
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                onClick={handleBack}
                className="h-11 px-6 bg-[#2A2F3D] hover:bg-[#363D50] text-white rounded-lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                className="h-11 px-6 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg shadow-lg shadow-[#7C3AED]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#7C3AED]/35 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )

      // ─── STEP 3 ─────────────────────────────────────────────────────────
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div>
              <h2 className="text-2xl font-bold text-white">Choose Your Plan</h2>
              <p className="text-gray-400 text-sm mt-1">
                Select the plan that fits your business needs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              <PlanCard planKey="starter" />
              <PlanCard planKey="growth" />
              <PlanCard planKey="enterprise" />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                onClick={handleBack}
                className="h-11 px-6 bg-[#2A2F3D] hover:bg-[#363D50] text-white rounded-lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                className="h-11 px-6 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg shadow-lg shadow-[#7C3AED]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#7C3AED]/35 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )

      // ─── STEP 4 ─────────────────────────────────────────────────────────
      case 4: {
        const plan = PLANS[selectedPlan]
        return (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div>
              <h2 className="text-2xl font-bold text-white">Review & Complete Setup</h2>
              <p className="text-gray-400 text-sm mt-1">
                Please review your information and preferences before getting started.
              </p>
            </div>

            {/* Review Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Your Information */}
              <div className="rounded-xl bg-[#1A1F2E] border border-[#2A2F3D] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Your Information</h3>
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="text-gray-400 hover:text-purple-400 transition-colors"
                    title="Edit information"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <ReviewField label="Full Name" value={fullName} />
                  <ReviewField label="Email" value={email} />
                  <ReviewField label="Phone" value={phone} />
                  <div className="h-px bg-[#2A2F3D]" />
                  <ReviewField label="Business Name" value={companyName} />
                  <ReviewField label="Business Type" value={businessType} />
                  <ReviewField label="Role" value={role} />
                  <ReviewField label="Business Address" value={businessAddress} />
                  {businessWebsite && <ReviewField label="Website" value={businessWebsite} />}
                  <ReviewField label="Time Zone" value={timezone?.replace(/_/g, ' ')} />
                </div>
              </div>

              {/* Your Selected Plan */}
              <div className="rounded-xl bg-[#1A1F2E] border border-[#2A2F3D] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Your Selected Plan</h3>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="text-gray-400 hover:text-purple-400 transition-colors"
                    title="Edit plan"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-baseline gap-2 mb-5">
                  <span className="text-3xl font-bold text-white">${plan.price}</span>
                  <span className="text-gray-500 text-sm">/month</span>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-300">{plan.leads}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-300">{plan.messages}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-300">{plan.seats}</span>
                  </div>
                </div>

                <div className="h-px bg-[#2A2F3D] mb-4" />

                <p className="text-xs text-gray-500 mb-2 font-medium">Included features:</p>
                <div className="space-y-2">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="text-sm text-gray-400">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* What happens next */}
            <div className="rounded-xl bg-[#1A1F2E] border border-[#2A2F3D] p-5">
              <h3 className="text-white font-semibold mb-4">What happens next?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    num: '1',
                    title: 'Account Activation',
                    desc: 'Your account will be activated immediately after setup.',
                    icon: Zap,
                  },
                  {
                    num: '2',
                    title: 'Set Up Your Workspace',
                    desc: "We'll help you configure your dashboard and tools.",
                    icon: LayoutGrid,
                  },
                  {
                    num: '3',
                    title: 'Start Engaging Leads',
                    desc: 'Import contacts, launch campaigns and start closing more deals.',
                    icon: BarChart3,
                  },
                ].map((item) => (
                  <div key={item.num} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complete Button */}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-12 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg text-base font-semibold shadow-lg shadow-[#7C3AED]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#7C3AED]/35 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating your account...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>

            {/* Footer */}
            <p className="text-center text-xs text-gray-500">
              By continuing, you agree to our{' '}
              <button type="button" className="text-purple-400 hover:underline">
                Terms of Service
              </button>{' '}
              and{' '}
              <button type="button" className="text-purple-400 hover:underline">
                Privacy Policy
              </button>
              .
            </p>
          </div>
        )
      }

      default:
        return null
    }
  }

  // ── Main Render ──────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Sidebar */}
      <LeftSidebar step={step} />

      {/* Right Content Area */}
      <main className="flex-1 bg-[#0F1117] flex flex-col min-h-screen overflow-y-auto">
        <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-5 sm:px-8 py-8 lg:py-10">
          {/* Already have account */}
          <div className="flex justify-between items-center mb-6">
            <button
              type="button"
              onClick={() => setPage('home')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors bg-white/[0.05] hover:bg-white/[0.1] px-3 py-1.5 rounded-lg border border-white/10"
            >
              &larr; Back to Main Website
            </button>
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setPage('login')}
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                Log In
              </button>
            </p>
          </div>

          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2.5 mb-6">
            <Image
              src="/logo.png"
              alt="MayaX Leads"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <div>
              <span className="text-xl font-bold text-white leading-tight">MayaX</span>
              <p className="text-[10px] font-medium text-white/40 -mt-0.5">Leads</p>
            </div>
          </div>

          {/* Step Indicator */}
          <StepIndicator currentStep={step} />

          {/* Step Content */}
          {renderStepContent()}
        </div>
      </main>
    </div>
  )
}