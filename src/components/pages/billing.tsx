'use client'

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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  CreditCard,
  Download,
  Check,
  Crown,
  Zap,
  Building2,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Shield,
  Users,
  MessageSquare,
  Globe,
  Sparkles,
  ChevronRight,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const plans = [
  {
    name: 'Starter',
    price: 99,
    description: 'For small businesses getting started',
    leads: 1_000,
    channels: ['SMS', 'Email'],
    features: [
      '1,000 leads/month',
      'SMS & Email channels',
      'Basic AI qualification',
      'Email support',
      'Daily reports',
    ],
    icon: Zap,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    current: false,
    cta: 'Downgrade',
    ctaVariant: 'outline' as const,
  },
  {
    name: 'Growth',
    price: 499,
    description: 'For growing businesses scaling outreach',
    leads: 5_000,
    channels: ['SMS', 'WhatsApp', 'Email'],
    features: [
      '5,000 leads/month',
      'SMS, WhatsApp & Email',
      'Advanced AI qualification',
      'Priority support',
      'Custom reports',
      'Webhook integrations',
      'Multi-user access',
    ],
    icon: Crown,
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    current: true,
    cta: 'Current Plan',
    ctaVariant: 'default' as const,
  },
  {
    name: 'Enterprise',
    price: 1999,
    description: 'For large teams with custom needs',
    leads: 50_000,
    channels: ['SMS', 'WhatsApp', 'Email', 'Voice'],
    features: [
      '50,000 leads/month',
      'All channels including Voice',
      'Custom AI models',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'SSO & advanced security',
      'Unlimited users',
    ],
    icon: Building2,
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    current: false,
    cta: 'Upgrade',
    ctaVariant: 'default' as const,
  },
]

const paymentHistory = [
  {
    date: 'May 15, 2024',
    description: 'Growth Plan - Monthly',
    amount: '$499.00',
    status: 'Paid' as const,
    invoice: 'INV-2024-005',
  },
  {
    date: 'Apr 15, 2024',
    description: 'Growth Plan - Monthly',
    amount: '$499.00',
    status: 'Paid' as const,
    invoice: 'INV-2024-004',
  },
  {
    date: 'Mar 15, 2024',
    description: 'Growth Plan - Monthly',
    amount: '$499.00',
    status: 'Paid' as const,
    invoice: 'INV-2024-003',
  },
  {
    date: 'Mar 02, 2024',
    description: 'Extra Lead Pack (2,000 leads)',
    amount: '$80.00',
    status: 'Paid' as const,
    invoice: 'INV-2024-002B',
  },
  {
    date: 'Feb 15, 2024',
    description: 'Growth Plan - Monthly',
    amount: '$499.00',
    status: 'Paid' as const,
    invoice: 'INV-2024-002',
  },
  {
    date: 'Jan 15, 2024',
    description: 'Growth Plan - Monthly',
    amount: '$499.00',
    status: 'Paid' as const,
    invoice: 'INV-2024-001',
  },
  {
    date: 'Dec 15, 2023',
    description: 'Starter Plan - Monthly',
    amount: '$99.00',
    status: 'Paid' as const,
    invoice: 'INV-2023-012',
  },
]

const statusStyles: Record<string, string> = {
  Paid: 'bg-emerald-500/10 text-emerald-400',
  Pending: 'bg-amber-500/10 text-amber-400',
  Failed: 'bg-red-500/10 text-red-400',
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Billing() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">
          Manage your subscription, payments, and billing information
        </p>
      </div>

      {/* Current Plan + Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-[#141825] border border-white/[0.06] rounded-xl lg:col-span-1 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base">Current Plan</CardTitle>
              <Badge className="bg-[#7C3AED] text-white text-xs">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-5 w-5 text-purple-400" />
                <h3 className="text-white text-xl font-bold">Growth</h3>
              </div>
              <p className="text-3xl font-bold text-white">
                $499<span className="text-[#9CA3AF] text-sm font-normal">/month</span>
              </p>
            </div>
            <Separator className="bg-white/[0.06]" />
            <div className="space-y-2.5">
              {[
                '5,000 leads/month',
                'SMS, WhatsApp & Email',
                'Advanced AI qualification',
                'Priority support',
                'Custom reports & webhooks',
              ].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[#9CA3AF] text-sm">{f}</span>
                </div>
              ))}
            </div>
            <Separator className="bg-white/[0.06]" />
            <div className="flex items-center gap-2 text-[#9CA3AF] text-sm">
              <Calendar className="h-3.5 w-3.5" />
              <span>Next billing: <span className="text-white font-medium">June 15, 2024</span></span>
            </div>
            <Button
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              Change Plan
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card className="bg-[#141825] border border-white/[0.06] rounded-xl lg:col-span-2 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Usage This Period</CardTitle>
            <p className="text-[#9CA3AF] text-xs">Resets on June 15, 2024</p>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Leads Usage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-400" />
                  <span className="text-white text-sm font-medium">Leads Used</span>
                </div>
                <span className="text-white text-sm">
                  <span className="font-bold">1,248</span>
                  <span className="text-[#9CA3AF]"> / 5,000</span>
                </span>
              </div>
              <div className="relative h-3 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] rounded-full transition-all duration-500"
                  style={{ width: '25%' }}
                />
              </div>
              <p className="text-[#9CA3AF] text-xs">25% used — 3,752 leads remaining</p>
            </div>

            {/* AI Messages Usage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-cyan-400" />
                  <span className="text-white text-sm font-medium">AI Messages</span>
                </div>
                <span className="text-white text-sm">
                  <span className="font-bold">14,532</span>
                  <span className="text-[#9CA3AF]"> / 100,000</span>
                </span>
              </div>
              <div className="relative h-3 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#06B6D4] to-[#22D3EE] rounded-full transition-all duration-500"
                  style={{ width: '15%' }}
                />
              </div>
              <p className="text-[#9CA3AF] text-xs">15% used — 85,468 messages remaining</p>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/[0.06]">
              <div>
                <p className="text-[#9CA3AF] text-xs">SMS Sent</p>
                <p className="text-white font-bold text-lg">3,241</p>
              </div>
              <div>
                <p className="text-[#9CA3AF] text-xs">WhatsApp Sent</p>
                <p className="text-white font-bold text-lg">2,876</p>
              </div>
              <div>
                <p className="text-[#9CA3AF] text-xs">Emails Sent</p>
                <p className="text-white font-bold text-lg">1,845</p>
              </div>
              <div>
                <p className="text-[#9CA3AF] text-xs">Days Remaining</p>
                <p className="text-white font-bold text-lg">15</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Comparison */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Plan Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const Icon = plan.icon
            return (
              <Card
                key={plan.name}
                className={`bg-[#141825] border rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 relative ${
                  plan.current ? 'border-[#7C3AED]/50 ring-1 ring-[#7C3AED]/20' : 'border-white/[0.06]'
                }`}
              >
                {plan.current && (
                  <div className="absolute top-0 right-4 -translate-y-1/2">
                    <Badge className="bg-[#7C3AED] text-white text-xs shadow-lg shadow-[#7C3AED]/30">
                      Current Plan
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`rounded-lg p-2.5 ${plan.iconBg}`}>
                      <Icon className={`h-5 w-5 ${plan.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{plan.name}</h3>
                      <p className="text-[#9CA3AF] text-xs">{plan.description}</p>
                    </div>
                  </div>
                  <div className="mb-5">
                    <span className="text-3xl font-bold text-white">
                      ${plan.price}
                    </span>
                    <span className="text-[#9CA3AF] text-sm">/month</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="h-3.5 w-3.5 text-[#9CA3AF]" />
                    <span className="text-[#9CA3AF] text-xs">
                      {plan.leads.toLocaleString()} leads/month
                    </span>
                  </div>
                  <Separator className="bg-white/[0.06] mb-4" />
                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-[#9CA3AF] text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full transition-all duration-300 ${
                      plan.current
                        ? 'bg-white/[0.06] text-[#9CA3AF] hover:bg-white/[0.08] cursor-default'
                        : plan.name === 'Enterprise'
                        ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 active:translate-y-0'
                        : 'bg-white/[0.06] text-white hover:bg-white/10 border border-white/[0.06] hover:-translate-y-0.5 active:translate-y-0'
                    }`}
                  >
                    {plan.cta}
                    {!plan.current && (
                      plan.name === 'Enterprise' ? (
                        <ArrowUpRight className="h-4 w-4 ml-1" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 ml-1" />
                      )
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Payment History */}
      <Card className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base">Payment History</CardTitle>
          <p className="text-[#9CA3AF] text-xs">Your recent transactions and invoices</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-[#9CA3AF] text-xs font-medium">Date</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium">Description</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium text-right">Amount</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium text-center">Status</TableHead>
                  <TableHead className="text-[#9CA3AF] text-xs font-medium text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((p) => (
                  <TableRow key={p.invoice} className="border-white/[0.06] hover:bg-white/[0.02]">
                    <TableCell className="text-white text-sm">{p.date}</TableCell>
                    <TableCell className="text-white text-sm">{p.description}</TableCell>
                    <TableCell className="text-white text-sm font-medium text-right">{p.amount}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={`${statusStyles[p.status]} text-xs`}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#7C3AED] hover:text-[#A78BFA] hover:bg-[#7C3AED]/10 h-8 px-3"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method + Billing Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method */}
        <Card className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Payment Method</CardTitle>
            <p className="text-[#9CA3AF] text-xs">Your saved payment information</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 p-3 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">Visa ending in 4242</p>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 text-xs">
                    Default
                  </Badge>
                </div>
                <p className="text-[#9CA3AF] text-sm mt-0.5">Expires 12/2026</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 bg-white/[0.06] text-white border-white/[0.06] hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Update Payment Method
            </Button>
          </CardContent>
        </Card>

        {/* Billing Summary */}
        <Card className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Billing Summary</CardTitle>
            <p className="text-[#9CA3AF] text-xs">2024 spending overview</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-purple-400" />
                  <span className="text-[#9CA3AF] text-xs">Total Spent (YTD)</span>
                </div>
                <p className="text-2xl font-bold text-white">$2,655.00</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  <span className="text-[#9CA3AF] text-xs">Avg Monthly Cost</span>
                </div>
                <p className="text-2xl font-bold text-white">$531.00</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF] text-sm">Invoices this year</span>
                <span className="text-white text-sm font-medium">7</span>
              </div>
              <Separator className="bg-white/[0.06]" />
              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF] text-sm">Successful payments</span>
                <span className="text-white text-sm font-medium">7 / 7</span>
              </div>
              <Separator className="bg-white/[0.06]" />
              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF] text-sm">Payment method since</span>
                <span className="text-white text-sm font-medium">Jan 15, 2024</span>
              </div>
              <Separator className="bg-white/[0.06]" />
              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF] text-sm">Billing cycle</span>
                <span className="text-white text-sm font-medium">Monthly</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}