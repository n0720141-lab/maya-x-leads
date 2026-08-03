'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Star, Quote, ArrowLeft, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { REVIEWS } from '@/components/ui/floating-reviews'
import { cn } from '@/lib/utils'

export function ReviewsPage() {
  const setPage = useAppStore((s) => s.setPage)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const current = REVIEWS[activeIndex]

  // Auto-rotate
  useEffect(() => {
    const timer = setInterval(() => {
      goToReview((activeIndex + 1) % REVIEWS.length)
    }, 5000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex])

  function goToReview(index: number) {
    if (index === activeIndex || isAnimating) return
    setIsAnimating(true)
    setTimeout(() => {
      setActiveIndex(index)
      setIsAnimating(false)
    }, 200)
  }

  function goPrev() {
    goToReview((activeIndex - 1 + REVIEWS.length) % REVIEWS.length)
  }
  function goNext() {
    goToReview((activeIndex + 1) % REVIEWS.length)
  }

  // Calculate average rating
  const avgRating = (REVIEWS.reduce((sum, r) => sum + r.stars, 0) / REVIEWS.length).toFixed(1)
  const totalReviews = REVIEWS.length

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0B0E14]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage('home')}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-white/50 transition-all hover:bg-white/[0.1] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Image
              src="/logo.png"
              alt="MayaX Leads"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-bold text-white">MayaX</span>
            <span className="text-sm font-medium text-white/40">Leads</span>
          </div>
          <Button
            onClick={() => setPage('signup')}
            className="h-9 rounded-lg bg-[#7C3AED] text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all duration-300 hover:bg-[#6D28D9] hover:shadow-xl hover:shadow-[#7C3AED]/35 hover:-translate-y-0.5 active:translate-y-0"
          >
            Get Started Free
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 px-6">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[#7C3AED]/[0.07] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-4 py-1.5 text-xs font-medium text-[#7C3AED]">
            <Sparkles className="h-3.5 w-3.5" />
            Customer Love
          </div>

          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Trusted by Businesses{' '}
            <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              Everywhere
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/50 sm:text-lg">
            See what our customers have to say about how MayaX Leads transformed their lead engagement, appointment booking, and sales pipeline.
          </p>

          {/* Stats bar */}
          <div className="mt-10 inline-flex items-center gap-6 sm:gap-10 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-6 py-4 sm:px-10 sm:py-5">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{avgRating}</div>
              <div className="mt-1 flex gap-0.5 justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-3.5 w-3.5',
                      i < Math.round(Number(avgRating))
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-transparent text-white/15',
                    )}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-white/30">Average Rating</p>
            </div>
            <div className="h-10 w-px bg-white/[0.08]" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{totalReviews}+</div>
              <p className="mt-1 text-xs text-white/30">Happy Customers</p>
            </div>
            <div className="h-10 w-px bg-white/[0.08]" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">38%</div>
              <p className="mt-1 text-xs text-white/30">Avg. Show Rate Increase</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Review */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-3xl">
          <div
            className={cn(
              'relative rounded-2xl border border-white/[0.08] bg-[#121826] p-8 sm:p-10 shadow-2xl shadow-[#7C3AED]/5 transition-all duration-300',
              isAnimating ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100',
            )}
          >
            {/* Quote icon */}
            <Quote className="absolute top-6 right-6 h-12 w-12 text-[#7C3AED]/10" />

            {/* Large quote */}
            <blockquote
              className={cn(
                'relative z-10 text-lg sm:text-xl leading-relaxed text-white/80 transition-opacity duration-300',
                isAnimating ? 'opacity-0' : 'opacity-100',
              )}
            >
              &ldquo;{current.quote}&rdquo;
            </blockquote>

            {/* Author */}
            <div
              className={cn(
                'mt-8 flex items-center gap-4 transition-opacity duration-300',
                isAnimating ? 'opacity-0' : 'opacity-100',
              )}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white shadow-lg"
                style={{ backgroundColor: current.color + '33', color: current.color }}
              >
                {current.initials}
              </div>
              <div>
                <p className="text-base font-semibold text-white">{current.name}</p>
                <p className="text-sm text-white/40">{current.company}</p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-4 w-4',
                      i < current.stars
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-transparent text-white/15',
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Navigation arrows */}
            <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-5">
              {/* Avatar dots */}
              <div className="flex items-center gap-2">
                {REVIEWS.map((review, index) => (
                  <button
                    key={review.name}
                    onClick={() => goToReview(index)}
                    className={cn(
                      'rounded-full transition-all duration-300 hover:scale-110',
                      index === activeIndex ? 'h-9 w-9 text-[10px] ring-2 ring-[#7C3AED] ring-offset-2 ring-offset-[#121826]' : 'h-7 w-7 text-[8px] opacity-40 hover:opacity-70',
                    )}
                    style={{
                      backgroundColor: index === activeIndex ? review.color + '55' : 'rgba(255,255,255,0.08)',
                      color: review.color,
                    }}
                    title={review.name}
                  >
                    <span className="font-bold leading-none flex items-center justify-center h-full">{review.initials}</span>
                  </button>
                ))}
              </div>

              {/* Arrow buttons */}
              <div className="flex gap-2">
                <button
                  onClick={goPrev}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/40 transition-all duration-300 hover:bg-white/[0.08] hover:text-white hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goNext}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/40 transition-all duration-300 hover:bg-white/[0.08] hover:text-white hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Reviews Grid */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-2 text-2xl font-bold text-white">All Reviews</h2>
          <p className="mb-8 text-sm text-white/40">What businesses like yours are saying about MayaX Leads</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map((review, index) => (
              <div
                key={review.name}
                className={cn(
                  'group relative rounded-xl border bg-[#121826] p-6 transition-all duration-300',
                  index === activeIndex
                    ? 'border-[#7C3AED]/40 shadow-lg shadow-[#7C3AED]/10'
                    : 'border-white/[0.06] hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20 hover:-translate-y-1',
                )}
              >
                {/* Stars */}
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-3.5 w-3.5',
                        i < review.stars
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-transparent text-white/15',
                      )}
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-sm leading-relaxed text-white/55 line-clamp-4 group-hover:text-white/70 transition-colors">
                  &ldquo;{review.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shadow-md transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: review.color + '33', color: review.color }}
                  >
                    {review.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/80">{review.name}</p>
                    <p className="text-xs text-white/30">{review.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-2xl border border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/10 via-[#121826] to-[#121826] p-10 text-center">
            <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[#7C3AED]/20 blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-[#7C3AED]/10 blur-[80px]" />

            <div className="relative">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Ready to Transform Your Lead Engagement?
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-white/50">
                Join hundreds of businesses already using MayaX Leads to automate lead qualification, book appointments, and close more deals.
              </p>
              <div className="mt-8 flex items-center justify-center gap-4">
                <Button
                  onClick={() => setPage('signup')}
                  className="h-12 rounded-xl bg-[#7C3AED] px-8 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all duration-300 hover:bg-[#6D28D9] hover:shadow-xl hover:shadow-[#7C3AED]/35 hover:-translate-y-1 active:translate-y-0"
                >
                  Start Free Trial
                </Button>
                <Button
                  onClick={() => setPage('home')}
                  className="h-12 rounded-xl border border-white/[0.1] bg-white/[0.05] px-8 text-sm font-semibold text-white/70 transition-all duration-300 hover:bg-white/[0.1] hover:text-white hover:-translate-y-1 active:translate-y-0"
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="MayaX Leads"
              width={24}
              height={24}
              className="rounded"
            />
            <span className="text-sm font-semibold text-white/60">MayaX Leads</span>
          </div>
          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} MayaX Leads. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}