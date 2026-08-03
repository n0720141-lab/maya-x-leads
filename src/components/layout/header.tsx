'use client'

import { useAppStore, type AppPage } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Menu, Bell, ChevronDown, Calendar, HelpCircle } from 'lucide-react'

const pageConfig: Record<AppPage, { title: string; subtitle: string } | null> = {
  'setup-overview': { title: 'Setup Overview', subtitle: 'Get started with MayaX Leads' },
  dashboard: { title: 'Dashboard', subtitle: 'Real-time overview of your lead generation and qualification performance.' },
  'lead-activity': { title: 'Lead Activity', subtitle: 'Real-time feed of lead interactions' },
  conversations: { title: 'Conversations', subtitle: 'Monitor and manage all conversations' },
  campaigns: { title: 'Campaigns', subtitle: 'Create and manage your marketing campaigns' },
  'ai-bot': { title: 'AI Bot', subtitle: 'Configure your AI assistant for lead engagement' },
  questions: { title: 'Questions & Fields', subtitle: 'Manage intake questions and data collection' },
  'crm-webhook': { title: 'CRM Webhook', subtitle: 'Send lead data to your external CRM' },
  channels: { title: 'Channels', subtitle: 'Connect and manage your communication channels' },
  appointments: { title: 'Appointments', subtitle: 'Track and manage scheduled appointments' },
  reports: { title: 'Reports', subtitle: 'Detailed analytics and performance reports' },
  billing: { title: 'Billing', subtitle: 'Manage your subscription and payments' },
  settings: { title: 'Settings', subtitle: 'Configure your account and preferences' },
  reviews: null,
  'super-admin-login': null,
  'super-admin-dashboard': null,
  'super-admin-tenants': null,
  'super-admin-config': null,
  home: null,
  login: null,
  signup: null,
}

function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function Header() {
  const { currentPage, toggleSidebar, user, tenant } = useAppStore()

  const config = pageConfig[currentPage]

  return (
    <header
      className={cn(
        'sticky top-0 z-30 shrink-0',
        'h-16 bg-[#121826] border-b border-[#374151]',
        'flex items-center justify-between px-4 lg:px-6',
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-[#9CA3AF] hover:text-white hover:bg-white/10"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {config && (
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">
              {config.title}
            </h1>
            <p className="text-sm text-[#9CA3AF] leading-tight">
              {config.subtitle}
            </p>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Date range */}
        <div className="hidden md:flex items-center gap-2 text-sm text-[#9CA3AF] mr-2">
          <Calendar className="h-4 w-4" />
          <span>May 14 – May 22, 2024</span>
        </div>

        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-[#9CA3AF] hover:text-white hover:bg-white/10"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-bold text-white">
            3
          </span>
        </Button>

        {/* Help */}
        <Button
          variant="ghost"
          size="icon"
          className="text-[#9CA3AF] hover:text-white hover:bg-white/10"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>

        {/* User avatar */}
        {user && (
          <button
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#7C3AED] text-white text-xs font-semibold">
                {getUserInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-white leading-tight">
                {user.name}
              </p>
              {tenant && (
                <p className="text-xs text-[#9CA3AF] leading-tight">
                  {tenant.name}
                </p>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-[#9CA3AF] hidden sm:block" />
          </button>
        )}
      </div>
    </header>
  )
}