'use client'

import { useState, useCallback, type FormEvent } from 'react'
import Image from 'next/image'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Bot,
  Zap,
  BarChart3,
  ShieldCheck,
  Clock,
  ArrowRightLeft,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/lib/store'
import { FloatingReviews } from '@/components/ui/floating-reviews'

/* ------------------------------------------------------------------ */
/*  Feature data for left sidebar                                      */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: MessageSquare,
    title: 'Multi-Channel Outreach',
    description:
      'Engage leads across SMS, WhatsApp, Email and more.',
  },
  {
    icon: Bot,
    title: 'AI That Qualifies & Converts',
    description:
      'Our AI asks the right questions, qualifies leads and books appointments.',
  },
  {
    icon: Zap,
    title: 'Smart Automations',
    description:
      'Nurture leads, automate follow-ups and close more deals on autopilot.',
  },
  {
    icon: BarChart3,
    title: 'Built-in CRM',
    description:
      'Track conversations, manage pipelines and measure performance.',
  },
]

const footerItems = [
  {
    icon: ArrowRightLeft,
    label: 'More Conversations',
    description: 'Engage leads on every channel.',
  },
  {
    icon: Clock,
    label: 'Save Time',
    description: 'Automate repetitive tasks.',
  },
  {
    icon: Layers,
    label: 'Scalable Platform',
    description: 'Grow without limits.',
  },
  {
    icon: ShieldCheck,
    label: 'Secure & Reliable',
    description: 'Enterprise-grade security.',
  },
]

/* ------------------------------------------------------------------ */
/*  LoginForm component                                                */
/* ------------------------------------------------------------------ */

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  const setAuth = useAppStore((s) => s.setAuth)
  const setPage = useAppStore((s) => s.setPage)

  /* ---- Validation helpers ---- */

  function validateForm(): boolean {
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address')
      return false
    }
    if (!password.trim()) {
      toast.error('Please enter your password')
      return false
    }
    return true
  }

  /* ---- Submit handler ---- */

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!validateForm()) return

    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Invalid email or password')
        return
      }

      setAuth(data.user, data.tenant, data.token)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---- Social login handler ---- */

  const handleSocialLogin = useCallback(
    async (provider: string) => {
      setSocialLoading(provider)
      try {
        toast.info(`${provider} sign-in is coming soon!`)
      } catch {
        toast.error('Something went wrong. Please try again.')
      } finally {
        setSocialLoading(null)
      }
    },
    [],
  )

  /* ---- Render ---- */

  return (
    <div className="flex min-h-screen w-full">
      {/* ============================================================ */}
      {/*  LEFT SIDEBAR — hidden on mobile                             */}
      {/* ============================================================ */}
      <aside className="relative hidden w-[40%] flex-col justify-between overflow-y-auto bg-[#141825] lg:flex">
        <div className="flex flex-1 flex-col px-8 pt-10 xl:px-12 xl:pt-14">
          {/* Logo */}
          <div className="mb-10 flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="MayaX Leads"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">MayaX</h1>
              <p className="text-[11px] font-medium text-white/40 -mt-0.5">Leads</p>
            </div>
          </div>

          {/* Tagline */}
          <p className="mb-8 text-xs font-medium uppercase tracking-widest text-white/30">
            AI-Powered Lead Engagement Platform
          </p>

          {/* Headline */}
          <h2 className="mb-2 text-3xl font-bold leading-tight text-white xl:text-4xl">
            Welcome Back
          </h2>
          <p className="mb-10 max-w-sm text-sm leading-relaxed text-white/50">
            Log in to access your dashboard, manage leads, and track performance.
          </p>

          {/* Feature list */}
          <ul className="space-y-5">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3.5 group">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/15 transition-all duration-300 group-hover:bg-[#7C3AED]/25 group-hover:shadow-lg group-hover:shadow-[#7C3AED]/10 group-hover:-translate-y-0.5">
                  <Icon className="h-4.5 w-4.5 text-[#7C3AED]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/40">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Floating Reviews — replaces old static testimonial */}
          <div className="mt-10">
            <FloatingReviews autoRotateMs={6000} />
          </div>
        </div>

        {/* Bottom footer items */}
        <div className="border-t border-white/[0.06] px-8 py-5 xl:px-12">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {footerItems.map(({ icon: Icon, label, description }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0 text-white/25" />
                <div>
                  <p className="text-[11px] font-semibold text-white/50">
                    {label}
                  </p>
                  <p className="text-[10px] leading-snug text-white/25">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/*  RIGHT FORM AREA                                              */}
      {/* ============================================================ */}
      <main className="flex w-full flex-col bg-[#0F1117] lg:w-[60%]">
        {/* Top bar header */}
        <div className="flex items-center justify-between px-6 pt-6 sm:px-10 lg:px-14">
          <button
            type="button"
            onClick={() => setPage('home')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white transition-colors bg-white/[0.05] hover:bg-white/[0.1] px-3 py-1.5 rounded-lg border border-white/10"
          >
            &larr; Back to Main Website
          </button>
          <span className="text-sm text-white/40">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setPage('signup')}
              className="font-medium text-[#7C3AED] transition-colors hover:text-[#8B5CF6]"
            >
              Create Account
            </button>
          </span>
        </div>

        {/* Centered form */}
        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10 lg:px-14">
          <div className="w-full max-w-md">
            {/* Mobile logo — only visible on small screens */}
            <div className="mb-8 flex items-center gap-2.5 justify-center lg:hidden">
              <Image
                src="/logo.png"
                alt="MayaX Leads"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">MayaX</h1>
                <p className="text-[11px] font-medium text-white/40 -mt-0.5">Leads</p>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-white">
                Log In to Your Account
              </h2>
              <p className="mt-1.5 text-sm text-white/40">
                Enter your credentials to access your dashboard
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email field */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="login-email"
                  className="text-xs font-medium text-white/50"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="john@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    className="h-11 rounded-lg border-[#2A2F3D] bg-[#1A1F2E] pl-10 text-white placeholder:text-[#6B7280] focus-visible:border-[#7C3AED] focus-visible:ring-[#7C3AED]/30 shadow-lg shadow-black/10 transition-all focus-visible:shadow-[#7C3AED]/10"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="login-password"
                    className="text-xs font-medium text-white/50"
                  >
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => toast.info('Password reset flow coming soon!')}
                    className="text-xs font-medium text-[#7C3AED] transition-colors hover:text-[#8B5CF6]"
                    tabIndex={-1}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    className="h-11 rounded-lg border-[#2A2F3D] bg-[#1A1F2E] pl-10 pr-10 text-white placeholder:text-[#6B7280] focus-visible:border-[#7C3AED] focus-visible:ring-[#7C3AED]/30 shadow-lg shadow-black/10 transition-all focus-visible:shadow-[#7C3AED]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] transition-colors hover:text-white/70"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sign In button — floating style */}
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full rounded-lg bg-[#7C3AED] text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all duration-300 hover:bg-[#6D28D9] hover:shadow-xl hover:shadow-[#7C3AED]/35 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in&hellip;
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <Button
                type="button"
                onClick={async () => {
                  setEmail('owner@demo.com')
                  setPassword('123456')
                  setSubmitting(true)
                  try {
                    const res = await fetch('/api/auth/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: 'owner@demo.com', password: '123456' }),
                    })
                    const data = await res.json()
                    if (res.ok) {
                      setAuth(data.user, data.tenant, data.token)
                      toast.success('Logged into Demo Account!')
                    } else {
                      toast.error(data.error || 'Demo login failed')
                    }
                  } catch {
                    toast.error('Connection error')
                  } finally {
                    setSubmitting(false)
                  }
                }}
                variant="outline"
                className="h-11 w-full rounded-lg border-[#7C3AED]/40 bg-[#7C3AED]/15 text-sm font-bold text-[#A78BFA] hover:bg-[#7C3AED]/30 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#7C3AED]/10"
              >
                ⚡ Instant Demo Login (One-Click)
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.08]" />
              <span className="text-xs font-medium text-white/25">
                or continue with
              </span>
              <div className="h-px flex-1 bg-white/[0.08]" />
            </div>

            {/* Social buttons — floating style */}
            <div className="flex gap-3">
              {/* Google */}
              <Button
                type="button"
                variant="outline"
                disabled={socialLoading === 'Google'}
                onClick={() => handleSocialLogin('Google')}
                className="h-11 flex-1 rounded-lg border-[#2A2F3D] bg-[#1A1F2E] text-sm font-medium text-white/70 transition-all duration-300 hover:border-[#3A3F4D] hover:bg-[#1E2436] hover:text-white hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 active:translate-y-0"
              >
                {socialLoading === 'Google' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                Google
              </Button>

              {/* Microsoft */}
              <Button
                type="button"
                variant="outline"
                disabled={socialLoading === 'Microsoft'}
                onClick={() => handleSocialLogin('Microsoft')}
                className="h-11 flex-1 rounded-lg border-[#2A2F3D] bg-[#1A1F2E] text-sm font-medium text-white/70 transition-all duration-300 hover:border-[#3A3F4D] hover:bg-[#1E2436] hover:text-white hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 active:translate-y-0"
              >
                {socialLoading === 'Microsoft' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 23 23"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                    <rect
                      x="1"
                      y="1"
                      width="10"
                      height="10"
                      fill="#F25022"
                      transform="translate(12)"
                    />
                    <rect
                      x="1"
                      y="1"
                      width="10"
                      height="10"
                      fill="#F25022"
                      transform="translate(12 12)"
                    />
                    <rect
                      x="1"
                      y="1"
                      width="10"
                      height="10"
                      fill="#F25022"
                      transform="translate(0 12)"
                    />
                    <rect
                      x="1"
                      y="1"
                      width="10"
                      height="10"
                      fill="#7FBA00"
                      transform="translate(12)"
                    />
                    <rect
                      x="1"
                      y="1"
                      width="10"
                      height="10"
                      fill="#00A4EF"
                      transform="translate(12 12)"
                    />
                    <rect
                      x="1"
                      y="1"
                      width="10"
                      height="10"
                      fill="#FFB900"
                      transform="translate(0 12)"
                    />
                  </svg>
                )}
                Microsoft
              </Button>
            </div>

            {/* Footer terms */}
            <p className="mt-8 text-center text-[11px] leading-relaxed text-white/25">
              By continuing, you agree to our{' '}
              <button
                type="button"
                onClick={() => toast.info('Terms of Service page coming soon!')}
                className="underline underline-offset-2 transition-colors hover:text-white/50"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => toast.info('Privacy Policy page coming soon!')}
                className="underline underline-offset-2 transition-colors hover:text-white/50"
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}