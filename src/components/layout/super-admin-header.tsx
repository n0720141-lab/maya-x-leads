'use client'

import { useAppStore, type AppPage } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'

const pageConfig: Record<string, { title: string; subtitle: string }> = {
  'super-admin-dashboard': { title: 'Platform Dashboard', subtitle: 'Overview of all tenants and platform metrics' },
  'super-admin-tenants': { title: 'Tenant Management', subtitle: 'Manage all platform tenants' },
  'super-admin-config': { title: 'Platform Configuration', subtitle: 'Manage global platform settings' },
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function SuperAdminHeader() {
  const { currentPage, toggleSidebar, superAdmin } = useAppStore()

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
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white leading-tight">
                  {config.title}
                </h1>
                <Badge className="bg-[#7C3AED]/15 text-[#7C3AED] border-[#7C3AED]/30 hover:bg-[#7C3AED]/25 text-[10px] font-semibold px-2 py-0">
                  ADMIN
                </Badge>
              </div>
              <p className="text-sm text-[#9CA3AF] leading-tight">
                {config.subtitle}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {superAdmin && (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#7C3AED] text-white text-xs font-semibold">
              {getInitials(superAdmin.name)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  )
}