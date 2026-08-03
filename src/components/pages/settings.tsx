'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  User, Building2, Bell, Shield,
  Save, CheckCircle2, Loader2, Monitor, Eye, EyeOff,
} from 'lucide-react'

const notificationDefs = [
  { id: 'new-lead', label: 'New Lead Alert', description: 'Get notified when a new lead is imported into the system' },
  { id: 'qualified-lead', label: 'Qualified Lead Alert', description: 'Receive alerts when a lead passes AI qualification' },
  { id: 'appointment-set', label: 'Appointment Booked', description: 'Notification when a new appointment is scheduled' },
  { id: 'message-failed', label: 'Message Failed', description: 'Get alerted when a message fails to deliver' },
]

interface SettingsData {
  profile: { id: string; name: string; email: string; role: string; createdAt: string } | null
  business: { id: string; name: string; email: string; phone: string | null; address: string | null; plan: string; status: string } | null
  notifications: Record<string, boolean>
  timezone: string
  language: string
}

export default function Settings() {
  const { user, tenant } = useAppStore()
  const [data, setData] = useState<SettingsData | null>(null)

  // Profile form
  const [profileName, setProfileName] = useState(user?.name || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // Business form
  const [bizName, setBizName] = useState(tenant?.name || '')
  const [bizEmail, setBizEmail] = useState(user?.email || '')
  const [bizPhone, setBizPhone] = useState('')
  const [bizAddress, setBizAddress] = useState('')
  const [savingBiz, setSavingBiz] = useState(false)
  const [bizMsg, setBizMsg] = useState('')

  // Notifications
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    'new-lead': true,
    'qualified-lead': true,
    'appointment-set': true,
    'message-failed': true,
  })
  const [savingNotif, setSavingNotif] = useState(false)
  const [notifMsg, setNotifMsg] = useState('')

  // Password
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showCurrentPwd, setShowCurrentPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdMsg, setPwdMsg] = useState('')
  const [pwdError, setPwdError] = useState('')

  // Preferences
  const [timezone, setTimezone] = useState('america_new_york')
  const [language, setLanguage] = useState('en')

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.get<SettingsData>('/settings')
      setData(res)

      if (res.profile) setProfileName(res.profile.name)
      if (res.business) {
        setBizName(res.business.name)
        setBizEmail(res.business.email)
        setBizPhone(res.business.phone || '')
        setBizAddress(res.business.address || '')
      }
      if (res.notifications) setNotifications(res.notifications)
      if (res.timezone) setTimezone(res.timezone)
      if (res.language) setLanguage(res.language)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  const saveProfile = async () => {
    setSavingProfile(true)
    setProfileMsg('')
    try {
      await api.put('/settings', { section: 'profile', name: profileName })
      setProfileMsg('Profile updated!')
      loadSettings()
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingProfile(false)
      setTimeout(() => setProfileMsg(''), 3000)
    }
  }

  const saveBusiness = async () => {
    setSavingBiz(true)
    setBizMsg('')
    try {
      await api.put('/settings', { section: 'business', name: bizName, email: bizEmail, phone: bizPhone, address: bizAddress })
      setBizMsg('Business info updated!')
      loadSettings()
    } catch (err) {
      setBizMsg(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingBiz(false)
      setTimeout(() => setBizMsg(''), 3000)
    }
  }

  const saveNotifications = async () => {
    setSavingNotif(true)
    setNotifMsg('')
    try {
      await api.put('/settings', { section: 'notifications', notifications })
      setNotifMsg('Preferences saved!')
    } catch {
      setNotifMsg('Failed to save')
    } finally {
      setSavingNotif(false)
      setTimeout(() => setNotifMsg(''), 3000)
    }
  }

  const changePassword = async () => {
    setPwdMsg('')
    setPwdError('')
    if (!currentPwd || !newPwd) { setPwdError('All fields are required'); return }
    if (newPwd !== confirmPwd) { setPwdError('New passwords do not match'); return }
    if (newPwd.length < 6) { setPwdError('Password must be at least 6 characters'); return }

    setSavingPwd(true)
    try {
      await api.put('/settings', { section: 'password', currentPassword: currentPwd, newPassword: newPwd })
      setPwdMsg('Password changed successfully!')
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setSavingPwd(false)
    }
  }

  const savePreferences = async () => {
    try {
      await api.put('/settings', { section: 'preferences', timezone, language })
    } catch {
      // ignore
    }
  }

  const userInitials = (data?.profile?.name || user?.name || 'User')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">Configure your profile, business details, and notifications</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-[#141825] border border-white/[0.06] p-1 h-auto flex-wrap">
          {[
            { value: 'profile', label: 'Profile', icon: User },
            { value: 'business', label: 'Business', icon: Building2 },
            { value: 'notifications', label: 'Notifications', icon: Bell },
            { value: 'security', label: 'Security', icon: Shield },
          ].map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-[#7C3AED] data-[state=active]:text-white text-[#9CA3AF] px-4 py-2 text-sm rounded-lg gap-1.5">
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Profile Tab ─── */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-base">Profile Information</CardTitle>
              <p className="text-[#9CA3AF] text-xs">Manage your personal account details</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center shrink-0">
                  <span className="text-white text-2xl font-bold">{userInitials}</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{data?.profile?.name || user?.name || ''}</h3>
                  <p className="text-[#9CA3AF] text-sm">{data?.profile?.email || user?.email || ''}</p>
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 text-xs mt-2">
                    {data?.profile?.role || 'Admin'}
                  </Badge>
                </div>
              </div>
              <Separator className="bg-white/[0.06] mb-6" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-[#9CA3AF] text-sm">Full Name</Label>
                  <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-[#9CA3AF]/50 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#9CA3AF] text-sm">Email Address</Label>
                  <Input value={data?.profile?.email || user?.email || ''} readOnly className="bg-white/[0.02] border-white/[0.04] text-[#6B7280]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#9CA3AF] text-sm">Timezone</Label>
                  <Select value={timezone} onValueChange={(v) => { setTimezone(v); savePreferences() }}>
                    <SelectTrigger className="w-full bg-white/[0.03] border-white/[0.06] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E2235] border-white/10 text-white">
                      <SelectItem value="america_new_york">Eastern Time (ET) — UTC-5</SelectItem>
                      <SelectItem value="america_chicago">Central Time (CT) — UTC-6</SelectItem>
                      <SelectItem value="america_denver">Mountain Time (MT) — UTC-7</SelectItem>
                      <SelectItem value="america_los_angeles">Pacific Time (PT) — UTC-8</SelectItem>
                      <SelectItem value="asia_karachi">Pakistan Standard Time (PST) — UTC+5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {profileMsg && (
                <p className={`text-xs font-medium mt-4 ${profileMsg.includes('updated') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {profileMsg}
                </p>
              )}

              <div className="mt-6">
                <Button onClick={saveProfile} disabled={savingProfile} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300">
                  {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Business Tab ─── */}
        <TabsContent value="business" className="space-y-6">
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-base">Business Details</CardTitle>
              <p className="text-[#9CA3AF] text-xs">Update your business information</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-[#9CA3AF] text-sm">Business / Dealership Name</Label>
                  <Input value={bizName} onChange={(e) => setBizName(e.target.value)} className="bg-white/[0.03] border-white/[0.06] text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#9CA3AF] text-sm">Business Email</Label>
                  <Input value={bizEmail} onChange={(e) => setBizEmail(e.target.value)} className="bg-white/[0.03] border-white/[0.06] text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#9CA3AF] text-sm">Phone Number</Label>
                  <Input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} placeholder="(555) 000-0000" className="bg-white/[0.03] border-white/[0.06] text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#9CA3AF] text-sm">Address</Label>
                  <Input value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} placeholder="123 Main St, City, State" className="bg-white/[0.03] border-white/[0.06] text-white" />
                </div>
              </div>

              {bizMsg && (
                <p className={`text-xs font-medium mt-2 ${bizMsg.includes('updated') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {bizMsg}
                </p>
              )}

              <Button onClick={saveBusiness} disabled={savingBiz} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300">
                {savingBiz ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Business Info
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Notifications Tab ─── */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-base">Notification Preferences</CardTitle>
              <p className="text-[#9CA3AF] text-xs">Choose which alerts you want to receive</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {notificationDefs.map((def, idx) => (
                <div key={def.id}>
                  {idx > 0 && <Separator className="bg-white/[0.06] my-4" />}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">{def.label}</p>
                      <p className="text-[#9CA3AF] text-xs mt-0.5">{def.description}</p>
                    </div>
                    <Switch
                      checked={!!notifications[def.id]}
                      onCheckedChange={(val) => setNotifications((prev) => ({ ...prev, [def.id]: val }))}
                    />
                  </div>
                </div>
              ))}

              {notifMsg && (
                <p className={`text-xs font-medium mt-2 ${notifMsg.includes('saved') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {notifMsg}
                </p>
              )}

              <div className="pt-2">
                <Button onClick={saveNotifications} disabled={savingNotif} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300">
                  {savingNotif ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Security Tab ─── */}
        <TabsContent value="security" className="space-y-6">
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-base">Change Password</CardTitle>
              <p className="text-[#9CA3AF] text-xs">Ensure your account uses a strong password</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2 max-w-md">
                <Label className="text-[#9CA3AF] text-sm">Current Password</Label>
                <div className="relative">
                  <Input type={showCurrentPwd ? 'text' : 'password'} value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className="bg-white/[0.03] border-white/[0.06] text-white pr-10" />
                  <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white">
                    {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-w-md">
                <Label className="text-[#9CA3AF] text-sm">New Password</Label>
                <div className="relative">
                  <Input type={showNewPwd ? 'text' : 'password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="bg-white/[0.03] border-white/[0.06] text-white pr-10" />
                  <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white">
                    {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-w-md">
                <Label className="text-[#9CA3AF] text-sm">Confirm New Password</Label>
                <div className="relative">
                  <Input type={showConfirmPwd ? 'text' : 'password'} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="bg-white/[0.03] border-white/[0.06] text-white pr-10" />
                  <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white">
                    {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {pwdError && <p className="text-xs text-red-400 font-medium">{pwdError}</p>}
              {pwdMsg && <p className="text-xs text-emerald-400 font-medium">{pwdMsg}</p>}

              <Button onClick={changePassword} disabled={savingPwd} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300">
                {savingPwd ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-base">Active Sessions</CardTitle>
              <p className="text-[#9CA3AF] text-xs">Your current login session</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-[#9CA3AF] text-xs font-medium">Device</TableHead>
                    <TableHead className="text-[#9CA3AF] text-xs font-medium">Status</TableHead>
                    <TableHead className="text-[#9CA3AF] text-xs font-medium">Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-white/[0.06] hover:bg-white/[0.02]">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-[#9CA3AF]" />
                        <span className="text-white text-sm">Current Browser</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 text-xs">Active Now</Badge>
                    </TableCell>
                    <TableCell className="text-[#9CA3AF] text-sm">Now</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}