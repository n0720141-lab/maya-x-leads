'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
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
import {
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  Users,
  Target,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Tenant {
  id: string
  name: string
  email: string
  plan: string
  status: string
  users: number
  leads: number
  campaigns: number
  createdAt: string
}

interface TenantDetail extends Tenant {
  userList: { id: string; name: string; email: string; role: string }[]
  usage30Days: { date: string; messages: number; leads: number }[]
}

interface TenantsResponse {
  tenants: Tenant[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SuperAdminTenants() {
  const superAdminToken = useAppStore((s) => s.superAdminToken)

  // List state
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [tenantDetail, setTenantDetail] = useState<TenantDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Edit form
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editPlan, setEditPlan] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  /* ---- Fetch tenants ---- */

  const fetchTenants = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(planFilter !== 'all' && { plan: planFilter }),
      })
      const res = await fetch(`/api/super-admin/tenants?${params}`, {
        headers: superAdminToken ? { Authorization: `Bearer ${superAdminToken}` } : {},
      })
      if (res.ok) {
        const data: TenantsResponse = await res.json()
        setTenants(data.tenants)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      } else {
        setTenants([])
        setTotal(0)
      }
    } catch {
      setTenants([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, planFilter, superAdminToken])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  /* ---- Handlers ---- */

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchTenants()
  }

  function openEdit(t: Tenant) {
    setSelectedTenant(t)
    setEditName(t.name)
    setEditEmail(t.email)
    setEditStatus(t.status)
    setEditPlan(t.plan)
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!selectedTenant) return
    setSaving(true)
    try {
      const res = await fetch(`/api/super-admin/tenants/${selectedTenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(superAdminToken ? { Authorization: `Bearer ${superAdminToken}` } : {}),
        },
        body: JSON.stringify({ name: editName, email: editEmail, status: editStatus, plan: editPlan }),
      })
      if (res.ok) {
        toast.success('Tenant updated successfully')
        setEditOpen(false)
        fetchTenants()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update tenant')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function openDetail(t: Tenant) {
    setSelectedTenant(t)
    setDetailOpen(true)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/super-admin/tenants/${t.id}`, {
        headers: superAdminToken ? { Authorization: `Bearer ${superAdminToken}` } : {},
      })
      if (res.ok) {
        setTenantDetail(await res.json())
      }
    } catch {
      // keep loading state
    } finally {
      setLoadingDetail(false)
    }
  }

  function openDelete(t: Tenant) {
    setSelectedTenant(t)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!selectedTenant) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/super-admin/tenants/${selectedTenant.id}`, {
        method: 'DELETE',
        headers: superAdminToken ? { Authorization: `Bearer ${superAdminToken}` } : {},
      })
      if (res.ok) {
        toast.success('Tenant deleted successfully')
        setDeleteOpen(false)
        fetchTenants()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete tenant')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setDeleting(false)
    }
  }

  /* ---- Styles ---- */

  const STATUS_STYLES: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    trial: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    suspended: 'bg-red-500/15 text-red-400 border-red-500/30',
  }

  const PLAN_STYLES: Record<string, string> = {
    starter: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    growth: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    enterprise: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  }

  /* ---- Render ---- */

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <Input
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-lg border-[#2A2F3D] bg-[#1A1F2E] pl-10 pr-10 text-white placeholder:text-[#6B7280] focus-visible:border-[#7C3AED] focus-visible:ring-[#7C3AED]/30"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setPage(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Filter toggle */}
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-2 border-[#2A2F3D] text-[#9CA3AF] hover:bg-[#1A1F2E] hover:text-white',
              showFilters && 'border-[#7C3AED] text-[#7C3AED] bg-[#7C3AED]/10'
            )}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <p className="text-sm text-[#9CA3AF]">
          {total.toLocaleString()} tenant{total !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[#1A1F2E] border border-[#2A2F3D] p-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-[#9CA3AF] whitespace-nowrap">Status:</Label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="h-9 w-[140px] border-[#2A2F3D] bg-[#0F1117] text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1F2E] border-[#2A2F3D]">
                <SelectItem value="all" className="text-white">All</SelectItem>
                <SelectItem value="active" className="text-white">Active</SelectItem>
                <SelectItem value="trial" className="text-white">Trial</SelectItem>
                <SelectItem value="suspended" className="text-white">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-[#9CA3AF] whitespace-nowrap">Plan:</Label>
            <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1) }}>
              <SelectTrigger className="h-9 w-[140px] border-[#2A2F3D] bg-[#0F1117] text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1F2E] border-[#2A2F3D]">
                <SelectItem value="all" className="text-white">All</SelectItem>
                <SelectItem value="starter" className="text-white">Starter</SelectItem>
                <SelectItem value="growth" className="text-white">Growth</SelectItem>
                <SelectItem value="enterprise" className="text-white">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="bg-[#1A1F2E] border-[#2A2F3D]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#7C3AED]" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-[#9CA3AF]">
              <Building2 className="h-8 w-8" />
              <p className="text-sm">No tenants found</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2A2F3D] hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-[#9CA3AF]">Tenant</TableHead>
                    <TableHead className="text-xs font-medium text-[#9CA3AF]">Plan</TableHead>
                    <TableHead className="text-xs font-medium text-[#9CA3AF]">Status</TableHead>
                    <TableHead className="text-xs font-medium text-[#9CA3AF] text-right">Users</TableHead>
                    <TableHead className="text-xs font-medium text-[#9CA3AF] text-right">Leads</TableHead>
                    <TableHead className="text-xs font-medium text-[#9CA3AF] text-right">Campaigns</TableHead>
                    <TableHead className="text-xs font-medium text-[#9CA3AF]">Created</TableHead>
                    <TableHead className="text-xs font-medium text-[#9CA3AF] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((t) => (
                    <TableRow key={t.id} className="border-[#2A2F3D] hover:bg-white/[0.02]">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-white">{t.name}</p>
                          <p className="text-xs text-[#9CA3AF]">{t.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs capitalize', PLAN_STYLES[t.plan] ?? 'border-[#374151] text-[#9CA3AF]')}>
                          {t.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs capitalize', STATUS_STYLES[t.status] ?? 'border-[#374151] text-[#9CA3AF]')}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-white text-right">{t.users}</TableCell>
                      <TableCell className="text-sm text-white text-right">{t.leads.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-white text-right">{t.campaigns}</TableCell>
                      <TableCell className="text-sm text-[#9CA3AF]">{t.createdAt}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#9CA3AF] hover:text-white hover:bg-white/10"
                            onClick={() => openDetail(t)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#9CA3AF] hover:text-white hover:bg-white/10"
                            onClick={() => openEdit(t)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#9CA3AF] hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => openDelete(t)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#2A2F3D] px-4 py-3">
              <p className="text-xs text-[#9CA3AF]">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-[#2A2F3D] text-[#9CA3AF] hover:bg-[#1A1F2E] hover:text-white"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-[#2A2F3D] text-[#9CA3AF] hover:bg-[#1A1F2E] hover:text-white"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ======== EDIT DIALOG ======== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#1A1F2E] border-[#2A2F3D] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Tenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#9CA3AF]">Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10 border-[#2A2F3D] bg-[#0F1117] text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#9CA3AF]">Email</Label>
              <Input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-10 border-[#2A2F3D] bg-[#0F1117] text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#9CA3AF]">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="h-10 border-[#2A2F3D] bg-[#0F1117] text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1F2E] border-[#2A2F3D]">
                    <SelectItem value="active" className="text-white">Active</SelectItem>
                    <SelectItem value="trial" className="text-white">Trial</SelectItem>
                    <SelectItem value="suspended" className="text-white">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#9CA3AF]">Plan</Label>
                <Select value={editPlan} onValueChange={setEditPlan}>
                  <SelectTrigger className="h-10 border-[#2A2F3D] bg-[#0F1117] text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1F2E] border-[#2A2F3D]">
                    <SelectItem value="starter" className="text-white">Starter</SelectItem>
                    <SelectItem value="growth" className="text-white">Growth</SelectItem>
                    <SelectItem value="enterprise" className="text-white">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-[#2A2F3D] text-[#9CA3AF] hover:bg-white/5" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              onClick={handleSaveEdit}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======== DETAIL DIALOG ======== */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-[#1A1F2E] border-[#2A2F3D] text-white max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Tenant Details</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#7C3AED]" />
            </div>
          ) : selectedTenant ? (
            <div className="space-y-5 py-2">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#9CA3AF]">Name</p>
                  <p className="text-sm font-medium text-white">{selectedTenant.name}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF]">Email</p>
                  <p className="text-sm text-white">{selectedTenant.email}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF]">Plan</p>
                  <Badge variant="outline" className={cn('text-xs capitalize', PLAN_STYLES[selectedTenant.plan] ?? 'border-[#374151] text-[#9CA3AF]')}>
                    {selectedTenant.plan}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF]">Status</p>
                  <Badge variant="outline" className={cn('text-xs capitalize', STATUS_STYLES[selectedTenant.status] ?? 'border-[#374151] text-[#9CA3AF]')}>
                    {selectedTenant.status}
                  </Badge>
                </div>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-[#0F1117] p-3 text-center">
                  <Users className="mx-auto mb-1 h-4 w-4 text-purple-400" />
                  <p className="text-lg font-bold text-white">{selectedTenant.users}</p>
                  <p className="text-[10px] text-[#9CA3AF]">Users</p>
                </div>
                <div className="rounded-lg bg-[#0F1117] p-3 text-center">
                  <Target className="mx-auto mb-1 h-4 w-4 text-cyan-400" />
                  <p className="text-lg font-bold text-white">{selectedTenant.leads.toLocaleString()}</p>
                  <p className="text-[10px] text-[#9CA3AF]">Leads</p>
                </div>
                <div className="rounded-lg bg-[#0F1117] p-3 text-center">
                  <Send className="mx-auto mb-1 h-4 w-4 text-orange-400" />
                  <p className="text-lg font-bold text-white">{selectedTenant.campaigns}</p>
                  <p className="text-[10px] text-[#9CA3AF]">Campaigns</p>
                </div>
              </div>

              {/* User list from detail */}
              {tenantDetail?.userList && tenantDetail.userList.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-[#9CA3AF]">Users ({tenantDetail.userList.length})</p>
                  <div className="max-h-40 overflow-auto rounded-lg border border-[#2A2F3D]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#2A2F3D] hover:bg-transparent">
                          <TableHead className="text-xs text-[#9CA3AF]">Name</TableHead>
                          <TableHead className="text-xs text-[#9CA3AF]">Email</TableHead>
                          <TableHead className="text-xs text-[#9CA3AF]">Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenantDetail.userList.map((u) => (
                          <TableRow key={u.id} className="border-[#2A2F3D] hover:bg-white/[0.02]">
                            <TableCell className="text-sm text-white">{u.name}</TableCell>
                            <TableCell className="text-sm text-[#9CA3AF]">{u.email}</TableCell>
                            <TableCell className="text-sm text-[#9CA3AF]">{u.role}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ======== DELETE DIALOG ======== */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#1A1F2E] border-[#2A2F3D] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Tenant</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#9CA3AF]">
            Are you sure you want to delete <span className="font-medium text-white">{selectedTenant?.name}</span>? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-[#2A2F3D] text-[#9CA3AF] hover:bg-white/5" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}