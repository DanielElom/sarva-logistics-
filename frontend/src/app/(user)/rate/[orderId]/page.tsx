'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import { useOrderStore } from '@/stores/order.store'
import api from '@/lib/api'

const FEEDBACK_CHIPS = [
  'On time',
  'Friendly',
  'Careful with package',
  'Professional',
  'Fast delivery',
  'Above & beyond',
]

const TIP_OPTS = [100, 200, 500] as const

interface OrderData {
  id: string
  pickupAddress: string
  dropoffAddress: string
  finalPrice: number
  rider?: { id: string; rating?: number; ratingCount?: number; user: { name: string } } | null
}

function StarRating({ rating, onRate }: { rating: number; onRate: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= (hover || rating)
        return (
          <button
            key={n}
            onClick={() => onRate(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="transition-all active:scale-90 duration-100"
          >
            <span
              className="material-symbols-outlined transition-colors duration-150"
              style={{
                fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
                fontSize: '40px',
                color: filled ? '#004d26' : '#c0c9be',
              }}
            >
              star
            </span>
          </button>
        )
      })}
    </div>
  )
}

function RiderAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="relative mb-4">
      <div className="w-24 h-24 rounded-full border-4 border-surface bg-primary/10 flex items-center justify-center shadow-md">
        <span className="font-['Manrope'] font-extrabold text-3xl text-primary">{initials}</span>
      </div>
      <div className="absolute bottom-0 right-0 bg-primary p-1.5 rounded-full border-2 border-surface">
        <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1", fontSize: '12px' }}>verified</span>
      </div>
    </div>
  )
}

export default function RateRiderPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const router = useRouter()

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const activeOrder = useOrderStore((s) => s.activeOrder)

  const [order, setOrder] = useState<OrderData | null>(
    activeOrder as unknown as OrderData | null,
  )
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [tip, setTip] = useState<number | null>(null)
  const [customTip, setCustomTip] = useState('')
  const [showCustomTip, setShowCustomTip] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    api.get(`/orders/${orderId}`).then(({ data }) => setOrder(data)).catch(() => null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleChip(chip: string) {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip],
    )
    // append chip text to comment
    setComment((prev) => {
      const chipText = chip
      if (prev.includes(chipText)) return prev
      return prev ? `${prev}, ${chipText}` : chipText
    })
  }

  async function handleSubmit() {
    if (rating === 0) { toast.error('Please select a star rating'); return }
    setSubmitting(true)
    try {
      await api.post(`/orders/${orderId}/rate`, {
        stars: rating,
        comment: comment.trim() || null,
      })
      toast.success('Rating submitted — thank you!')
      router.replace(`/receipt/${orderId}`)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not submit rating'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAuthenticated) return null

  const riderName = order?.rider?.user?.name ?? 'Your Rider'
  const ratingCount = order?.rider?.ratingCount ?? 0
  const orderRef = order?.id?.slice(-6)?.toUpperCase() ?? orderId.slice(-6).toUpperCase()
  const finalTip = showCustomTip ? parseInt(customTip || '0', 10) : tip

  return (
    <ScreenWrapper>
      {/* header */}
      <header className="sticky top-0 z-30 bg-[#f8faf4] flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.replace(`/receipt/${orderId}`)}
            className="text-[#003418] active:scale-95 duration-150 p-2"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>close</span>
          </button>
          <h1 className="font-['Manrope'] font-bold text-lg tracking-tight text-[#003418]">
            Rate Your Experience
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>account_circle</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-6 pb-28 space-y-8">
        {/* heading */}
        <section className="text-center">
          <p className="font-['Manrope'] font-extrabold text-[#003418] italic text-2xl mb-1">
            Delivery Completed
          </p>
          <p className="text-on-surface-variant font-medium text-sm">
            Order #{orderRef} • Just now
          </p>
        </section>

        {/* rider profile card */}
        <div className="bg-surface-container-lowest shadow-[0_24px_48px_-12px_rgba(25,29,25,0.06)] rounded-xl p-6 flex flex-col items-center">
          <RiderAvatar name={riderName} />
          <h2 className="font-['Manrope'] font-bold text-xl text-on-surface">{riderName}</h2>
          <p className="text-on-surface-variant text-sm mb-5">
            {ratingCount > 0 ? `${ratingCount.toLocaleString()}+ Deliveries` : 'Fair Ride Courier'}
          </p>

          {/* star rating */}
          <StarRating rating={rating} onRate={setRating} />
          <p className="text-on-surface-variant font-medium text-sm mt-2">
            {rating === 0 && 'Tap to rate your experience'}
            {rating === 1 && 'Poor experience'}
            {rating === 2 && 'Below average'}
            {rating === 3 && 'Okay'}
            {rating === 4 && 'Good experience'}
            {rating === 5 && 'Excellent! ⭐'}
          </p>
        </div>

        {/* tip section */}
        <section>
          <h3 className="font-['Manrope'] font-bold text-on-surface mb-3">
            Add a tip for {riderName.split(' ')[0]}
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {TIP_OPTS.map((amt) => {
              const selected = tip === amt && !showCustomTip
              return (
                <button
                  key={amt}
                  onClick={() => { setTip(amt); setShowCustomTip(false) }}
                  className={[
                    'py-4 rounded-xl font-bold text-sm transition-all active:scale-95',
                    selected
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-surface-container-high text-on-surface hover:bg-primary hover:text-white',
                  ].join(' ')}
                >
                  ₦{amt}
                </button>
              )
            })}
            <button
              onClick={() => { setShowCustomTip(true); setTip(null) }}
              className={[
                'py-4 rounded-xl font-bold text-sm transition-all active:scale-95',
                showCustomTip
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-surface-container-high text-on-surface hover:bg-primary hover:text-white',
              ].join(' ')}
            >
              Custom
            </button>
          </div>
          {showCustomTip && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-on-surface font-bold">₦</span>
              <input
                type="number"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                placeholder="Enter amount"
                min={0}
                className="flex-1 px-4 py-3 rounded-xl border border-outline-variant/40 bg-surface-container-low text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}
          <p className="text-[11px] text-on-surface-variant mt-2 text-center uppercase tracking-widest font-medium">
            100% of tips go to your courier
          </p>
        </section>

        {/* feedback section */}
        <section>
          <div className="flex justify-between items-end mb-3">
            <h3 className="font-['Manrope'] font-bold text-on-surface">Any specific feedback?</h3>
            <span className="text-on-surface-variant text-xs">{comment.length}/200</span>
          </div>
          <div className="bg-surface-container-low rounded-xl p-4 border border-transparent focus-within:border-primary/20 focus-within:bg-surface-container-lowest transition-all">
            <textarea
              value={comment}
              onChange={(e) => { if (e.target.value.length <= 200) setComment(e.target.value) }}
              placeholder={`${riderName.split(' ')[0]} was careful with the package and arrived on time…`}
              className="w-full bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline text-sm p-0 resize-none min-h-[100px]"
            />
          </div>

          {/* quick chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {FEEDBACK_CHIPS.map((chip) => {
              const active = selectedChips.includes(chip)
              return (
                <button
                  key={chip}
                  onClick={() => toggleChip(chip)}
                  className={[
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors active:scale-95',
                    active
                      ? 'bg-primary text-white'
                      : 'bg-surface-container-high text-on-surface hover:bg-secondary-fixed',
                  ].join(' ')}
                >
                  {chip}
                </button>
              )
            })}
          </div>
        </section>
      </main>

      {/* fixed footer */}
      <div className="fixed bottom-0 left-0 w-full px-6 pb-8 pt-4 glass-nav z-30">
        <div className="max-w-xl mx-auto space-y-3">
          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full py-5 rounded-xl font-['Manrope'] font-bold text-lg text-white shadow-xl active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)' }}
          >
            {submitting && <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {submitting ? 'Submitting…' : finalTip ? `Submit Review + ₦${finalTip} Tip` : 'Submit Review'}
          </button>
          <button
            onClick={() => router.replace(`/receipt/${orderId}`)}
            className="w-full py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Skip rating
          </button>
        </div>
      </div>
    </ScreenWrapper>
  )
}
