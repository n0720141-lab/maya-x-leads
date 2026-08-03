import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppPage =
  | 'home'
  | 'reviews'
  | 'setup-overview'
  | 'dashboard'
  | 'lead-activity'
  | 'conversations'
  | 'campaigns'
  | 'ai-bot'
  | 'questions'
  | 'crm-webhook'
  | 'channels'
  | 'appointments'
  | 'reports'
  | 'billing'
  | 'settings'
  | 'login'
  | 'signup'
  | 'super-admin-login'
  | 'super-admin-dashboard'
  | 'super-admin-tenants'
  | 'super-admin-config'

export interface User {
  id: string
  email: string
  name: string
  role: string
  tenantId: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  plan: string
  status: string
  logo?: string | null
}

export interface SuperAdminUser {
  id: string
  email: string
  name: string
  role: string
}

interface AppState {
  // Auth
  user: User | null
  tenant: Tenant | null
  token: string | null
  isAuthenticated: boolean

  // Super Admin
  superAdmin: SuperAdminUser | null
  superAdminToken: string | null
  isSuperAdmin: boolean

  // Navigation
  currentPage: AppPage
  sidebarOpen: boolean

  // Actions
  setAuth: (user: User, tenant: Tenant, token: string) => void
  clearAuth: () => void
  setSuperAdminAuth: (admin: SuperAdminUser, token: string) => void
  clearSuperAdminAuth: () => void
  setPage: (page: AppPage) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  hydrate: () => void
}

const isDesktop = () => {
  if (typeof window === 'undefined') return true
  return window.innerWidth >= 1024
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth defaults
      user: null,
      tenant: null,
      token: null,
      isAuthenticated: false,

      // Super Admin defaults
      superAdmin: null,
      superAdminToken: null,
      isSuperAdmin: false,

      // Navigation defaults
      currentPage: 'home' as AppPage,
      sidebarOpen: true,

      // Actions
      setAuth: (user, tenant, token) =>
        set({
          user,
          tenant,
          token,
          isAuthenticated: true,
          currentPage: 'dashboard' as AppPage,
        }),

      clearAuth: () =>
        set({
          user: null,
          tenant: null,
          token: null,
          isAuthenticated: false,
          currentPage: 'home' as AppPage,
        }),

      setSuperAdminAuth: (admin, token) =>
        set({
          superAdmin: admin,
          superAdminToken: token,
          isSuperAdmin: true,
          currentPage: 'super-admin-dashboard' as AppPage,
        }),

      clearSuperAdminAuth: () =>
        set({
          superAdmin: null,
          superAdminToken: null,
          isSuperAdmin: false,
          currentPage: 'home' as AppPage,
        }),

      setPage: (page) => {
        set({ currentPage: page })
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          if (url.searchParams.get('page') !== page) {
            url.searchParams.set('page', page)
            window.history.pushState({ page }, '', url.toString())
          }
        }
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      hydrate: () => {
        // Zustand persist middleware automatically restores persisted state
        // on store creation. This hydrate method exists as an explicit
        // entry point if manual rehydration is ever needed.
        const state = get()
        if (state.token && state.user) {
          set({ isAuthenticated: true })
        }
        if (state.superAdminToken && state.superAdmin) {
          set({ isSuperAdmin: true })
        }
      },
    }),
    {
      name: 'mayax-auth',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        superAdmin: state.superAdmin,
        superAdminToken: state.superAdminToken,
        isSuperAdmin: state.isSuperAdmin,
        currentPage: state.currentPage,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.sidebarOpen = isDesktop()
        }
      },
    },
  ),
)