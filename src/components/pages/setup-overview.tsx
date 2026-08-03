'use client'

import { useAppStore, type AppPage } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Check,
  Rocket,
  Play,
  BookOpen,
  MessageSquare,
} from 'lucide-react'

interface SetupStep {
  number: number
  title: string
  description: string
  subtext?: string
  status: 'completed' | 'pending'
  actionLabel: string
  actionPage: AppPage
}

const STEPS: SetupStep[] = [
  {
    number: 1,
    title: 'Business Profile',
    description: 'Your business information and subscription details.',
    status: 'completed',
    actionLabel: 'View Details',
    actionPage: 'settings',
  },
  {
    number: 2,
    title: 'Connect Google Sheet',
    description: 'Connect the Google Sheet where your leads are stored.',
    subtext: 'No sheet connected yet',
    status: 'pending',
    actionLabel: 'Connect Sheet',
    actionPage: 'dashboard',
  },
  {
    number: 3,
    title: 'Configure AI Bot',
    description: 'Customize how your AI communicates and qualifies leads.',
    status: 'pending',
    actionLabel: 'Configure Bot',
    actionPage: 'ai-bot',
  },
  {
    number: 4,
    title: 'Set Qualification Questions',
    description: 'Choose the questions and fields the AI should collect.',
    status: 'pending',
    actionLabel: 'Set Questions',
    actionPage: 'questions',
  },
  {
    number: 5,
    title: 'Connect CRM Webhook',
    description: 'Send qualified leads directly to your CRM via webhook.',
    status: 'pending',
    actionLabel: 'Connect CRM',
    actionPage: 'crm-webhook',
  },
  {
    number: 6,
    title: 'Review Messaging Channels',
    description:
      'Enable and configure your SMS, WhatsApp, and Email channels.',
    status: 'pending',
    actionLabel: 'Configure Channels',
    actionPage: 'channels',
  },
]

const PLAN_FEATURES = [
  'AI Lead Qualification',
  'SMS, WhatsApp & Email Outreach',
  'CRM Webhook Delivery',
  'Conversation Monitoring',
  'Advanced Reporting',
  'Priority Support',
]

const SYSTEM_STATUS_ITEMS = [
  { label: 'SMS Gateway', status: 'Online' },
  { label: 'WhatsApp Service', status: 'Online' },
  { label: 'Email Service', status: 'Online' },
]

function StepCircle({
  number,
  completed,
}: {
  number: number
  completed: boolean
}) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
        completed
          ? 'bg-emerald-500 text-white'
          : 'bg-primary text-white'
      )}
    >
      {completed ? <Check className="h-4 w-4" /> : number}
    </div>
  )
}

function StatusBadge({ status }: { status: 'completed' | 'pending' }) {
  if (status === 'completed') {
    return (
      <Badge
        className="border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
      >
        Completed
      </Badge>
    )
  }
  return (
    <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-400">
      Pending
    </Badge>
  )
}

function StepCard({ step }: { step: SetupStep }) {
  const setPage = useAppStore((s) => s.setPage)

  const isCompleted = step.status === 'completed'

  return (
    <Card className="border-border py-0 gap-0">
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        {/* Step circle */}
        <StepCircle number={step.number} completed={isCompleted} />

        {/* Center content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm sm:text-base">
            {step.title}
          </h3>
          <p className="text-muted-foreground text-sm mt-0.5">
            {step.description}
          </p>
          {step.subtext && (
            <p className="text-muted-foreground/60 text-xs mt-1">
              {step.subtext}
            </p>
          )}
          {!isCompleted && step.number === 2 && (
            <p className="text-muted-foreground/60 text-xs mt-0.5">
              Leads will be imported automatically
            </p>
          )}
        </div>

        {/* Right: status + button */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={step.status} />
          <Button
            variant={isCompleted ? 'outline' : 'default'}
            size="sm"
            onClick={() => setPage(step.actionPage)}
          >
            {step.actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SetupOverview() {
  const user = useAppStore((s) => s.user)
  const tenant = useAppStore((s) => s.tenant)

  const completedCount = STEPS.filter((s) => s.status === 'completed').length
  const totalCount = STEPS.length
  const percentage = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome to MayaX Leads, {user?.name || 'there'}! 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            Complete your setup so we can begin generating, qualifying, and
            delivering leads to your CRM.
          </p>
        </div>

        {/* Progress Bar Section */}
        <Card className="border-border py-0 gap-0">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">
                  Account Setup: {completedCount} of {totalCount} Completed
                </p>
                <Progress value={percentage} className="mt-2.5 h-2" />
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30 shrink-0 text-sm px-3 py-1">
                {percentage}%
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-3">
              Complete all steps below to activate lead generation and start
              delivering qualified leads to your CRM.
            </p>
          </CardContent>
        </Card>

        {/* Setup Step Cards */}
        <div className="space-y-3">
          {STEPS.map((step) => (
            <StepCard key={step.number} step={step} />
          ))}
        </div>

        {/* Footer Section */}
        <Card className="border-border/60 py-0 gap-0">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Rocket className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-muted-foreground text-sm">
                Almost there! Once you complete all required steps above,
                you&apos;ll be ready to launch lead generation and start getting
                qualified leads delivered to your CRM.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Button
                variant="outline"
                disabled
                className="text-muted-foreground border-muted hover:bg-muted/50"
              >
                Activate Lead Generation
              </Button>
              <span className="text-muted-foreground text-xs">
                Complete all required steps to activate
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-20 space-y-5">
          {/* Your Plan Card */}
          <div className="border border-border rounded-xl p-5 bg-card">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              Your Plan
            </p>
            <h3 className="text-white text-xl font-bold mt-2">
              {tenant?.plan
                ? `${tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)} Plan`
                : 'Growth Plan'}
            </h3>
            <p className="text-white text-lg font-bold mt-1">
              $10,000 <span className="text-sm font-normal text-muted-foreground">/month</span>
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Up to 600 leads per month
            </p>
            <div className="mt-4 space-y-2.5">
              {PLAN_FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-2.5 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="text-primary text-sm font-medium mt-5 hover:underline cursor-pointer"
            >
              Manage Subscription
            </button>
          </div>

          {/* Setup Help Card */}
          <div className="border border-border rounded-xl p-5 bg-card">
            <h3 className="text-white font-semibold text-base">Setup Help</h3>
            <p className="text-muted-foreground text-sm mt-1.5">
              Not sure what to do next? We&apos;ll guide you through each step.
            </p>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-primary transition-colors w-full cursor-pointer"
              >
                <Play className="h-4 w-4 shrink-0" />
                Watch Setup Video
              </button>
              <button
                type="button"
                className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-primary transition-colors w-full cursor-pointer"
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                Knowledge Base
              </button>
              <button
                type="button"
                className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-primary transition-colors w-full cursor-pointer"
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                Chat with Support
              </button>
            </div>
          </div>

          {/* System Status Card */}
          <div className="border border-border rounded-xl p-5 bg-card">
            <h3 className="text-white font-semibold text-base">System Status</h3>
            <p className="text-emerald-400 text-sm font-medium mt-1.5">
              All Systems Operational
            </p>
            <div className="mt-3.5 space-y-2.5">
              {SYSTEM_STATUS_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-emerald-400 text-xs font-medium">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}