'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  LayoutDashboard,
  Building2,
  Settings,
  X,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const NAV_ITEMS: { id: AppPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'super-admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'super-admin-tenants', label: 'Tenants', icon: Building2 },
  { id: 'super-admin-config', label: 'Platform Config', icon: Settings },
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function SuperAdminSidebar() {
  const { currentPage, setPage, sidebarOpen, setSidebarOpen, superAdmin, clearSuperAdminAuth } = useAppStore()
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
                <span className="text-[10px] font-medium text-[#7C3AED] leading-none">Super Admin</span>
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
            <div className="space-y-3 px-1">
              {/* Admin info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-[#7C3AED] text-white text-xs font-semibold">
                    {superAdmin ? getInitials(superAdmin.name) : 'SA'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {superAdmin?.name ?? 'Super Admin'}
                  </p>
                  <p className="text-xs text-[#9CA3AF] truncate">
                    {superAdmin?.email ?? 'admin@mayax.com'}
                  </p>
                </div>
              </div>

              {/* Logout button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs border-[#374151] text-[#9CA3AF] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                onClick={clearSuperAdminAuth}
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </Button>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={clearSuperAdminAuth}
                  className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-[#9CA3AF] transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Logout
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </>
  )
}