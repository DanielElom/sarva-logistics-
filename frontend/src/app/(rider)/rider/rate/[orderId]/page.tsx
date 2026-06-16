/**
 * @page RiderRateOrderPage
 * @description Rider rates the customer after a completed delivery.
 * @route /rider/rate/[orderId]
 */
'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import api from '@/lib/api'
import { useEffect } from 'react'

const CHIPS = ['Polite', 'Package ready', 'Clear instructions', 'Good tipper']

export default function RateCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params?.orderId as string | undefined

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  const [rating, setRating] = useState(5)
  const [hovered, setHovered] = useState(0)
  const [chips, setChips] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
  }, [isAuthenticated, role, router])

  function toggleChip(c: string) {
    setChips((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  async function handleSubmit() {
    if (!orderId) { router.replace('/rider/home'); return }
    setSubmitting(true)
    try {
      await api.post(`/orders/${orderId}/rate`, { rating, chips, comment })
    } catch {
      // proceed regardless
    }
    router.replace('/rider/home')
  }

  const displayRating = hovered || rating

  const ratingLabels: Record<number, string> = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Great',
    5: 'Excellent',
  }

  return (
    <ScreenWrapper>
      <header className="bg-emerald-950/80 backdrop-blur-lg shadow-xl shadow-emerald-950/20 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 h-16">
          <button onClick={() => router.replace('/rider/home')} className="text-emerald-50">
            <span className="material-symbols-outlined">close</span>
          </button>
          <h1 className="text-lg font-extrabold tracking-tighter text-emerald-50 font-headline">Rate Customer</h1>
          <button
            onClick={() => router.replace('/rider/home')}
            className="text-emerald-50/60 text-sm font-body"
          >
            Skip
          </button>
        </div>
      </header>

      <main className="pt-8 pb-12 px-6 max-w-lg mx-auto space-y-8">
        {/* Customer avatar + header */}
        <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center border-2 border-outline-variant/20">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 block mb-1">Completed Delivery</span>
            <h2 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">How was the customer?</h2>
            <p className="text-on-surface-variant text-sm mt-2 font-body leading-relaxed">
              Your feedback helps us maintain a professional community for all riders.
            </p>
          </div>
        </div>

        {/* Stars */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
                className="text-4xl transition-transform active:scale-90"
              >
                <span
                  className="material-symbols-outlined text-4xl"
                  style={{
                    fontVariationSettings: star <= displayRating ? "'FILL' 1" : "'FILL' 0",
                    color: star <= displayRating ? '#003418' : '#c0c9be',
                  }}
                >
                  star
                </span>
              </button>
            ))}
          </div>
          <span className="text-sm font-semibold text-primary">{ratingLabels[displayRating]}</span>
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2 justify-center">
          {CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => toggleChip(c)}
              className={`px-4 py-2 rounded-full text-sm font-body font-semibold transition-all border ${
                chips.includes(c)
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface font-body block ml-1">
            Comments <span className="text-on-surface-variant font-normal">(optional)</span>
          </label>
          <div className="relative group">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us more about the interaction…"
              rows={4}
              className="w-full bg-surface-container-low border-none rounded-xl p-4 text-on-surface placeholder:text-on-surface-variant/40 focus:ring-0 focus:bg-surface-container-lowest transition-all duration-300 resize-none font-body text-sm"
            />
            <div className="absolute inset-0 rounded-xl pointer-events-none border border-primary/0 group-focus-within:border-primary/20 transition-all duration-300" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4 pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-5 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-xl shadow-primary/10 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 font-headline"
          >
            {submitting ? 'Submitting…' : 'Submit Feedback'}
            {!submitting && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
          </button>
          <button
            onClick={() => router.replace('/rider/home')}
            className="text-center text-sm font-bold text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
            Return to Home
          </button>
        </div>
      </main>
    </ScreenWrapper>
  )
}
