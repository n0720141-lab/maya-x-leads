'use client'

import { useState, type FormEvent } from 'react'
import Image from 'next/image'
import { Mail, Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAppStore, type SuperAdminUser } from '@/lib/store'

export function SuperAdminLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const setSuperAdminAuth = useAppStore((s) => s.setSuperAdminAuth)
  const setPage = useAppStore((s) => s.setPage)

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!validateForm()) return

    setSubmitting(true)

    try {
      const res = await fetch('/api/super-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Invalid credentials')
        return
      }

      const admin: SuperAdminUser = {
        id: data.admin.id,
        email: data.admin.email,
        name: data.admin.name,
        role: data.admin.role,
      }
      setSuperAdminAuth(admin, data.token)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0F1117] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <Image
            src="/logo.png"
            alt="MayaX"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">MayaX</h1>
            <p className="text-[11px] font-medium text-white/40 -mt-0.5">Super Admin</p>
          </div>
        </div>

        {/* Shield badge */}
        <div className="mb-8 flex justify-center">
          <Badge
            variant="outline"
            className="gap-1.5 rounded-full border-[#7C3AED]/40 bg-[#7C3AED]/10 px-4 py-1.5 text-xs font-medium text-[#7C3AED]"
          >
            <Shield className="h-3.5 w-3.5" />
            Platform Administration
          </Badge>
        </div>

        {/* Heading */}
        <div className="mb-7 text-center">
          <h2 className="text-2xl font-bold text-white">
            Admin Panel Access
          </h2>
          <p className="mt-1.5 text-sm text-white/40">
            Sign in with your super admin credentials
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div className="space-y-1.5">
            <Label
              htmlFor="sa-email"
              className="text-xs font-medium text-white/50"
            >
              Email Address
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              <Input
                id="sa-email"
                type="email"
                autoComplete="email"
                placeholder="admin@mayax.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="h-11 rounded-lg border-[#2A2F3D] bg-[#1A1F2E] pl-10 text-white placeholder:text-[#6B7280] focus-visible:border-[#7C3AED] focus-visible:ring-[#7C3AED]/30 shadow-lg shadow-black/10 transition-all focus-visible:shadow-[#7C3AED]/10"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <Label
              htmlFor="sa-password"
              className="text-xs font-medium text-white/50"
            >
              Password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              <Input
                id="sa-password"
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

          {/* Sign In button */}
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
              'Sign In to Admin Panel'
            )}
          </Button>
        </form>

        {/* Back to user login */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setPage('login')}
            className="text-sm text-white/40 transition-colors hover:text-[#7C3AED]"
          >
            &larr; Back to User Login
          </button>
        </div>
      </div>
    </div>
  )
}