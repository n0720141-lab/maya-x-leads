'use client'
// MayaX Leads v2.0 — Live Preview Active

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { SuperAdminSidebar } from '@/components/layout/super-admin-sidebar'
import { SuperAdminHeader } from '@/components/layout/super-admin-header'
import { LandingPage } from '@/components/auth/landing-page'
import { LoginForm } from '@/components/auth/login-form'
import { SignupForm } from '@/components/auth/signup-form'
import { SuperAdminLoginForm } from '@/components/auth/super-admin-login-form'
import { ReviewsPage } from '@/components/auth/reviews-page'
import Dashboard from '@/components/pages/dashboard'
import SetupOverview from '@/components/pages/setup-overview'
import LeadActivity from '@/components/pages/lead-activity'
import Conversations from '@/components/pages/conversations'
import Campaigns from '@/components/pages/campaigns'
import AIBot from '@/components/pages/ai-bot'
import Questions from '@/components/pages/questions'
import CRMWebhook from '@/components/pages/crm-webhook'
import Channels from '@/components/pages/channels'
import Appointments from '@/components/pages/appointments'
import Reports from '@/components/pages/reports'
import Billing from '@/components/pages/billing'
import Settings from '@/components/pages/settings'
import SuperAdminDashboard from '@/components/pages/super-admin-dashboard'
import SuperAdminTenants from '@/components/pages/super-admin-tenants'
import SuperAdminConfig from '@/components/pages/super-admin-config'

function PageRouter() {
  const { currentPage } = useAppStore()

  switch (currentPage) {
    case 'home':
      return <LandingPage />
    case 'login':
      return <LoginForm />
    case 'signup':
      return <SignupForm />
    case 'reviews':
      return <ReviewsPage />
    case 'setup-overview':
      return <SetupOverview />
    case 'dashboard':
      return <Dashboard />
    case 'lead-activity':
      return <LeadActivity />
    case 'conversations':
      return <Conversations />
    case 'campaigns':
      return <Campaigns />
    case 'ai-bot':
      return <AIBot />
    case 'questions':
      return <Questions />
    case 'crm-webhook':
      return <CRMWebhook />
    case 'channels':
      return <Channels />
    case 'appointments':
      return <Appointments />
    case 'reports':
      return <Reports />
    case 'billing':
      return <Billing />
    case 'settings':
      return <Settings />
    case 'super-admin-login':
      return <SuperAdminLoginForm />
    case 'super-admin-dashboard':
      return <SuperAdminDashboard />
    case 'super-admin-tenants':
      return <SuperAdminTenants />
    case 'super-admin-config':
      return <SuperAdminConfig />
    default:
      return <Dashboard />
  }
}

// Simple error boundary to prevent white screen on dashboard crash
function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
        <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
      <p className="max-w-sm text-sm text-white/50">{error.message}</p>
      <button
        onClick={reset}
        className="mt-2 rounded-lg bg-[#7C3AED] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all hover:bg-[#6D28D9] hover:shadow-xl hover:shadow-[#7C3AED]/30 hover:-translate-y-0.5 active:translate-y-0"
      >
        Try Again
      </button>
    </div>
  )
}

function PageWithErrorBoundary() {
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setError(null)
  }, [useAppStore((s) => s.currentPage)])

  if (error) {
    return <ErrorFallback error={error} reset={() => setError(null)} />
  }

  return <PageRouter />
}

const SUPER_ADMIN_PAGES = new Set([
  'super-admin-dashboard',
  'super-admin-tenants',
  'super-admin-config',
])

function isSuperAdminPage(page: string): boolean {
  return SUPER_ADMIN_PAGES.has(page)
}

export default function Home() {
  const { isAuthenticated, isSuperAdmin, hydrate, currentPage } = useAppStore()

  useEffect(() => {
    hydrate()
    const syncPageFromUrl = () => {
      if (typeof window !== 'undefined') {
        const state = useAppStore.getState()
        const params = new URLSearchParams(window.location.search)
        const pageParam = params.get('page')

        if (state.isAuthenticated || state.isSuperAdmin) {
          // Logged in user: if no pageParam or page is home/login/signup, auto-open dashboard
          if (!pageParam || pageParam === 'home' || pageParam === 'login' || pageParam === 'signup') {
            useAppStore.setState({ currentPage: 'dashboard' })
          } else if (pageParam && state.currentPage !== pageParam) {
            useAppStore.setState({ currentPage: pageParam as any })
          }
        } else {
          // Guest visitor: fallback to home
          const target = (pageParam || 'home') as any
          if (state.currentPage !== target) {
            useAppStore.setState({ currentPage: target })
          }
        }
      }
    }
    syncPageFromUrl()
    window.addEventListener('popstate', syncPageFromUrl)
    return () => window.removeEventListener('popstate', syncPageFromUrl)
  }, [hydrate])

  const isAuthPage = currentPage === 'login' || currentPage === 'signup'
  const isHome = currentPage === 'home'
  const isSaLoginPage = currentPage === 'super-admin-login'

  const isGuestPublicPage = (isHome || isAuthPage || currentPage === 'reviews' || isSaLoginPage) && !isAuthenticated && !isSuperAdmin

  if (isGuestPublicPage || (!isAuthenticated && !isSuperAdmin)) {
    return <PageWithErrorBoundary />
  }

  // Super admin layout
  if (isSuperAdmin && isSuperAdminPage(currentPage)) {
    return (
      <div className="flex min-h-screen">
        <SuperAdminSidebar />
        <div className="flex-1 flex flex-col lg:pl-[260px]">
          <SuperAdminHeader />
          <main className="flex-1 p-6 overflow-auto">
            <PageWithErrorBoundary />
          </main>
        </div>
      </div>
    )
  }

  // Regular authenticated layout
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:pl-[260px]">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <PageWithErrorBoundary />
        </main>
      </div>
    </div>
  )
}