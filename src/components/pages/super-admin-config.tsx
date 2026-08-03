'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Pencil,
  Trash2,
  Loader2,
  Plus,
  Save,
  X,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ConfigItem {
  key: string
  value: string
  description: string
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SuperAdminConfig() {
  const superAdminToken = useAppStore((s) => s.superAdminToken)

  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(true)

  // Add new form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [adding, setAdding] = useState(false)

  // Edit mode (inline)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  /* ---- Fetch config ---- */

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/config', {
        headers: superAdminToken ? { Authorization: `Bearer ${superAdminToken}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setConfigs(Array.isArray(data) ? data : data.configs ?? [])
      } else {
        setConfigs([])
      }
    } catch {
      setConfigs([])
    } finally {
      setLoading(false)
    }
  }, [superAdminToken])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  /* ---- Handlers ---- */

  function startEdit(item: ConfigItem) {
    setEditingKey(item.key)
    setEditValue(item.value)
    setEditDesc(item.description)
  }

  function cancelEdit() {
    setEditingKey(null)
    setEditValue('')
    setEditDesc('')
  }

  async function saveEdit() {
    if (!editingKey) return
    setSaving(true)
    try {
      const res = await fetch('/api/super-admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(superAdminToken ? { Authorization: `Bearer ${superAdminToken}` } : {}),
        },
        body: JSON.stringify({ key: editingKey, value: editValue, description: editDesc }),
      })
      if (res.ok) {
        toast.success('Config updated')
        setEditingKey(null)
        fetchConfig()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update config')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function addConfig() {
    if (!newKey.trim()) {
      toast.error('Key is required')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/super-admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(superAdminToken ? { Authorization: `Bearer ${superAdminToken}` } : {}),
        },
        body: JSON.stringify({ key: newKey.trim(), value: newValue, description: newDesc }),
      })
      if (res.ok) {
        toast.success('Config created')
        setNewKey('')
        setNewValue('')
        setNewDesc('')
        setShowAddForm(false)
        fetchConfig()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create config')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setAdding(false)
    }
  }

  async function deleteConfig(key: string) {
    setDeleting(key)
    try {
      const res = await fetch('/api/super-admin/config', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(superAdminToken ? { Authorization: `Bearer ${superAdminToken}` } : {}),
        },
        body: JSON.stringify({ key }),
      })
      if (res.ok) {
        toast.success('Config deleted')
        fetchConfig()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete config')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setDeleting(null)
    }
  }

  /* ---- Render ---- */

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#9CA3AF]">
          {configs.length} configuration item{configs.length !== 1 ? 's' : ''}
        </p>
        <Button
          className={cn(
            'gap-2 text-xs',
            showAddForm
              ? 'border-[#2A2F3D] text-[#9CA3AF] hover:bg-white/5'
              : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white'
          )}
          variant={showAddForm ? 'outline' : 'default'}
          onClick={() => {
            if (showAddForm) {
              setShowAddForm(false)
              setNewKey('')
              setNewValue('')
              setNewDesc('')
            } else {
              setShowAddForm(true)
            }
          }}
        >
          {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showAddForm ? 'Cancel' : 'Add Config'}
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <Card className="bg-[#1A1F2E] border-[#7C3AED]/30">
          <CardContent className="p-4 space-y-4">
            <p className="text-sm font-medium text-white">New Configuration</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#9CA3AF]">Key</Label>
                <Input
                  placeholder="config.key.name"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="h-10 border-[#2A2F3D] bg-[#0F1117] text-white placeholder:text-[#6B7280]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#9CA3AF]">Description</Label>
                <Input
                  placeholder="Brief description"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="h-10 border-[#2A2F3D] bg-[#0F1117] text-white placeholder:text-[#6B7280]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#9CA3AF]">Value</Label>
              <Textarea
                placeholder="Configuration value..."
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                rows={3}
                className="border-[#2A2F3D] bg-[#0F1117] text-white placeholder:text-[#6B7280] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-[#2A2F3D] text-[#9CA3AF] hover:bg-white/5"
                onClick={() => { setShowAddForm(false); setNewKey(''); setNewValue(''); setNewDesc('') }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                onClick={addConfig}
                disabled={adding}
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Config list */}
      <Card className="bg-[#1A1F2E] border-[#2A2F3D]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#7C3AED]" />
            </div>
          ) : configs.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-[#9CA3AF]">
              <Settings className="h-8 w-8" />
              <p className="text-sm">No configuration items found</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2A2F3D] hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-[#9CA3AF] w-[200px]">Key</TableHead>
                    <TableHead className="text-xs font-medium text-[#9CA3AF]">Value</TableHead>
                    <TableHead className="text-xs font-medium text-[#9CA3AF] w-[220px]">Description</TableHead>
                    <TableHead className="text-xs font-medium text-[#9CA3AF] w-[150px]">Updated</TableHead>
                    <TableHead className="text-xs font-medium text-[#9CA3AF] text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((item) => (
                    <TableRow key={item.key} className="border-[#2A2F3D] hover:bg-white/[0.02]">
                      {editingKey === item.key ? (
                        /* ---- Edit mode row ---- */
                        <>
                          <TableCell className="align-top pt-3">
                            <p className="text-sm font-mono font-medium text-[#7C3AED]">{item.key}</p>
                          </TableCell>
                          <TableCell className="align-top pt-3">
                            <Textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              rows={3}
                              className="border-[#2A2F3D] bg-[#0F1117] text-white text-sm resize-none"
                            />
                          </TableCell>
                          <TableCell className="align-top pt-3">
                            <Input
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              className="h-9 border-[#2A2F3D] bg-[#0F1117] text-white text-sm"
                            />
                          </TableCell>
                          <TableCell className="align-top pt-3 text-sm text-[#9CA3AF]">{item.updatedAt}</TableCell>
                          <TableCell className="align-top pt-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/10"
                                onClick={saveEdit}
                                disabled={saving}
                              >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-[#9CA3AF] hover:bg-white/10"
                                onClick={cancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        /* ---- Display mode row ---- */
                        <>
                          <TableCell>
                            <p className="text-sm font-mono font-medium text-[#7C3AED]">{item.key}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-white max-w-[300px] truncate">{item.value}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-[#9CA3AF]">{item.description}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-[#9CA3AF]">{item.updatedAt}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-[#9CA3AF] hover:text-white hover:bg-white/10"
                                onClick={() => startEdit(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-[#9CA3AF] hover:text-red-400 hover:bg-red-500/10"
                                onClick={() => deleteConfig(item.key)}
                                disabled={deleting === item.key}
                              >
                                {deleting === item.key ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}