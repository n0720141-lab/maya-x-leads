'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  LayoutDashboard,
  BarChart3,
  Activity,
  MessageSquare,
  Rocket,
  Bot,
  ListChecks,
  Link2,
  Radio,
  CalendarDays,
  BarChart2,
  CreditCard,
  Settings,
  X,
  Headphones,
  LogOut,
} from 'lucide-react'
import { useAppStore, type AppPage } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'

const NAV_ITEMS: { id: AppPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'lead-activity', label: 'Leads & Activity', icon: Activity },
  { id: 'conversations', label: 'Live Conversations', icon: MessageSquare },
  { id: 'channels', label: 'Channels', icon: Radio },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const PLAN_PRICES: Record<string, number> = {
  starter: 99,
  growth: 499,
  enterprise: 1999,
}

const PLAN_LEADS_LIMITS: Record<string, number> = {
  starter: 500,
  growth: 5000,
  enterprise: 50000,
}

export function Sidebar() {
  const { currentPage, setPage, sidebarOpen, setSidebarOpen, tenant, clearAuth, clearSuperAdminAuth } = useAppStore()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const isOverlay = isMobile && sidebarOpen
  const isCollapsed = isMobile ? false : !sidebarOpen

  if (isMobile && !sidebarOpen) return null

  const planName = tenant?.plan ?? 'starter'
  const capitalizedPlan = planName.charAt(0).toUpperCase() + planName.slice(1)
  const planPrice = PLAN_PRICES[planName] ?? 99
  const leadsLimit = PLAN_LEADS_LIMITS[planName] ?? 500

  return (
    <>
      {isOverlay && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-full flex-col transition-all duration-300',
          'bg-[#121826] border-r border-[#374151]',
          !isMobile && !sidebarOpen && 'w-[70px]',
          !isMobile && sidebarOpen && 'w-[260px]',
          isMobile && 'w-[260px]',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4">
          {isCollapsed ? (
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg">
              <Image src="/logo.png" alt="M" width={36} height={36} className="rounded-lg" />
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="MayaX" width={32} height={32} className="rounded-lg" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white leading-tight">MayaX</span>
                <span className="text-[10px] font-medium text-white/40 leading-none">Leads</span>
              </div>
            </div>
          )}

          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#9CA3AF] hover:text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Separator className="bg-[#374151]" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
          <ul className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = currentPage === item.id
              const Icon = item.icon

              const buttonContent = (
                <button
                  onClick={() => {
                    setPage(item.id)
                    if (isMobile) setSidebarOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[#7C3AED]/20 text-[#7C3AED]'
                      : 'text-[#9CA3AF] hover:bg-[#1A1F2E] hover:text-white',
                    isCollapsed && 'justify-center px-2',
                  )}
                >
                  <Icon className={cn(
                    'h-[18px] w-[18px] shrink-0',
                    isActive ? 'text-[#7C3AED]' : ''
                  )} />
                  {!isCollapsed && <span>{item.label}</span>}
                  {isActive && !isCollapsed && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
                  )}
                </button>
              )

              if (isCollapsed) {
                return (
                  <li key={item.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                )
              }

              return <li key={item.id}>{buttonContent}</li>
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4">
          <Separator className="mb-3 bg-[#374151]" />

          {!isCollapsed ? (
            <>
              {/* Need Help */}
              <div className="mb-4 rounded-xl bg-[#1A1F2E] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Headphones className="h-4 w-4 text-[#7C3AED]" />
                  <p className="text-sm font-medium text-white">Need Help?</p>
                </div>
                <p className="text-xs text-[#9CA3AF] mb-3">
                  Our support team is here to help you succeed.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10"
                >
                  Contact Support
                </Button>
              </div>

              {/* Plan Info */}
              <div className="space-y-2 px-1">
                <p className="text-xs text-[#9CA3AF]">
                  Your Plan:{' '}
                  <span className="font-semibold text-white">{capitalizedPlan}</span>{' '}
                  <span className="inline-flex items-center gap-1 ml-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                    <span className="text-[#10B981]">Active</span>
                  </span>
                </p>
                <p className="text-lg font-bold text-white">
                  ${planPrice.toLocaleString()}
                  <span className="ml-1 text-xs font-normal text-[#9CA3AF]">/month</span>
                </p>
                <p className="text-xs text-[#9CA3AF]">
                  Up to {leadsLimit.toLocaleString()} leads / month
                </p>
                <button
                  className="mt-1 text-xs text-[#7C3AED] hover:text-[#A855F7] transition-colors"
                  onClick={() => setPage('billing')}
                >
                  Manage Subscription
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    try {
                      localStorage.removeItem('mayax-auth')
                      localStorage.removeItem('mayax-auth-token')
                    } catch {}
                    clearAuth()
                    clearSuperAdminAuth()
                    window.location.href = '/'
                  }}
                  className="w-full mt-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs flex items-center justify-center gap-2 border border-red-500/20"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setPage('billing')}
                  className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-[#9CA3AF] transition-colors hover:bg-[#1A1F2E] hover:text-white"
                >
                  <CreditCard className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Manage Subscription
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </>
  )
}