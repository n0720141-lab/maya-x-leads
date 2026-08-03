'use client'

import { useState, useEffect, useCallback } from 'react'
import { Star, ChevronRight, Quote } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Review Data ──────────────────────────────────────────────────────────

export interface Review {
  name: string
  company: string
  initials: string
  quote: string
  stars: number
  color: string // bg color for avatar
}

export const REVIEWS: Review[] = [
  {
    name: 'James Anderson',
    company: 'DriveX Canada',
    initials: 'JA',
    quote: 'MayaX Leads helped us increase our show rate by 38% and save hours every day. The AI qualification is a game-changer for our dealership.',
    stars: 5,
    color: '#7C3AED',
  },
  {
    name: 'Sarah Mitchell',
    company: 'PrimeAuto Group',
    initials: 'SM',
    quote: 'We went from 15% response rate to over 60% within the first month. The AI handles qualification beautifully while we focus on closing deals.',
    stars: 5,
    color: '#2563EB',
  },
  {
    name: 'Michael Chen',
    company: 'AutoTrust Financial',
    initials: 'MC',
    quote: 'The multi-channel approach — SMS, WhatsApp, and email — means we never miss a lead. Our pipeline has never been healthier.',
    stars: 5,
    color: '#059669',
  },
  {
    name: 'Lisa Rodriguez',
    company: 'NextLevel Motors',
    initials: 'LR',
    quote: 'Setup was incredibly easy and the support team is outstanding. We had our first AI-qualified appointment within 48 hours of going live.',
    stars: 5,
    color: '#D97706',
  },
  {
    name: 'David Thompson',
    company: 'NorthStar Auto',
    initials: 'DT',
    quote: 'MayaX replaced three separate tools for us — SMS, CRM, and follow-ups. One platform, better results, lower cost. Highly recommend.',
    stars: 5,
    color: '#DC2626',
  },
  {
    name: 'Emily Watson',
    company: 'Summit Dealerships',
    initials: 'EW',
    quote: 'The appointment booking automation alone saves us 20+ hours per week. Our sales team can now focus entirely on what they do best — selling.',
    stars: 4,
    color: '#8B5CF6',
  },
  {
    name: 'Robert Kim',
    company: 'Velocity Auto Group',
    initials: 'RK',
    quote: 'We tried 4 different lead systems before MayaX. Nothing comes close. The AI conversations feel natural and leads actually enjoy the interaction.',
    stars: 5,
    color: '#0891B2',
  },
]

// ─── Component Props ──────────────────────────────────────────────────────

interface FloatingReviewsProps {
  /** Number of avatar dots to show (default: all) */
  maxVisible?: number
  /** Auto-rotate interval in ms (0 = no auto-rotate, default: 5000) */
  autoRotateMs?: number
  /** Extra class for the container */
  className?: string
  /** Compact mode for tighter spaces */
  compact?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────

export function FloatingReviews({
  maxVisible,
  autoRotateMs = 5000,
  className,
  compact = false,
}: FloatingReviewsProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const reviews = maxVisible ? REVIEWS.slice(0, maxVisible) : REVIEWS
  const current = reviews[activeIndex]

  // Auto-rotate
  useEffect(() => {
    if (autoRotateMs <= 0) return
    const timer = setInterval(() => {
      goToNext()
    }, autoRotateMs)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, autoRotateMs, reviews.length])

  const goToReview = useCallback(
    (index: number) => {
      if (index === activeIndex || isAnimating) return
      setIsAnimating(true)
      setTimeout(() => {
        setActiveIndex(index)
        setIsAnimating(false)
      }, 150)
    },
    [activeIndex, isAnimating],
  )

  const goToNext = useCallback(() => {
    const next = (activeIndex + 1) % reviews.length
    goToReview(next)
  }, [activeIndex, reviews.length, goToReview])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Review Card */}
      <div
        className={cn(
          'rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-5 transition-all duration-300',
          isAnimating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0',
          !compact && 'shadow-lg shadow-black/20',
        )}
      >
        {/* Quote icon */}
        <Quote className="h-5 w-5 text-[#7C3AED]/40 mb-2" />

        {/* Stars */}
        <div className="mb-3 flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'h-3.5 w-3.5 transition-colors',
                i < current.stars
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-white/10',
              )}
            />
          ))}
        </div>

        {/* Quote text */}
        <blockquote
          className={cn(
            'leading-relaxed text-white/60 transition-opacity duration-300',
            compact ? 'text-xs' : 'text-sm',
            isAnimating ? 'opacity-0' : 'opacity-100',
          )}
        >
          &ldquo;{current.quote}&rdquo;
        </blockquote>

        {/* Author info */}
        <div
          className={cn(
            'mt-3 flex items-center gap-2.5 transition-opacity duration-300',
            isAnimating ? 'opacity-0' : 'opacity-100',
          )}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-md transition-colors duration-300"
            style={{ backgroundColor: current.color + '33', color: current.color }}
          >
            {current.initials}
          </div>
          <div>
            <p className={cn('font-semibold text-white/80', compact ? 'text-[11px]' : 'text-xs')}>
              {current.name}
            </p>
            <p className={cn('text-white/35', compact ? 'text-[10px]' : 'text-[11px]')}>
              {current.company}
            </p>
          </div>
        </div>
      </div>

      {/* Floating Avatar Navigation */}
      <div className="flex items-center gap-1.5 px-1">
        {reviews.map((review, index) => (
          <button
            key={review.name}
            type="button"
            onClick={() => goToReview(index)}
            className={cn(
              'relative rounded-full transition-all duration-300 ease-out focus:outline-none',
              'hover:scale-110 active:scale-95',
              compact ? 'h-6 w-6 text-[8px]' : 'h-7 w-7 text-[9px]',
              index === activeIndex
                ? 'ring-2 ring-[#7C3AED] ring-offset-1 ring-offset-[#141825] scale-110 z-10'
                : 'opacity-50 hover:opacity-80',
            )}
            style={{
              backgroundColor: index === activeIndex ? review.color + '55' : 'rgba(255,255,255,0.08)',
              color: review.color,
            }}
            title={review.name}
            aria-label={`View review from ${review.name}`}
          >
            <span className="font-bold leading-none">{review.initials}</span>
          </button>
        ))}

        {/* Next button */}
        <button
          type="button"
          onClick={goToNext}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-white/30 transition-all hover:bg-white/[0.12] hover:text-white/60 active:scale-90"
          aria-label="Next review"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>


    </div>
  )
}