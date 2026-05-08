'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import BottomNav from '@/components/ui/BottomNav'
import { useAuthStore } from '@/stores/auth.store'
import { useBookingStore } from '@/stores/booking.store'
import api from '@/lib/api'

interface OrderData {
  id: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  finalPrice: number
  estimatedPrice: number
  estimatedDistance: number
  deliveryType: string
  paymentMethod: string
  createdAt: string
  updatedAt: string
  rider?: {
    id: string
    user: { name: string; phone: string }
    rating?: number
    ratingCount?: number
  } | null
  rating?: { stars: number; comment?: string } | null
}

function RouteMap({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  return (
    <div className="relative w-full h-40 rounded-2xl overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: '#e8f0e8', filter: 'grayscale(50%) brightness(1.05)' }}
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="receiptGrid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#c8d8c8" strokeWidth="0.7" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#receiptGrid)" />
          <rect x="0" y="35%" width="100%" height="10" fill="#bccfbc" />
          <rect x="0" y="65%" width="100%" height="8" fill="#bccfbc" />
          <rect x="28%" y="0" width="9" height="100%" fill="#bccfbc" />
          <rect x="65%" y="0" width="10" height="100%" fill="#bccfbc" />
          <path
            d="M 80 130 Q 160 60 280 80 Q 340 90 370 50"
            stroke="#003418"
            strokeWidth="3"
            fill="none"
            strokeDasharray="8 5"
            strokeLinecap="round"
          />
          {/* pickup dot */}
          <circle cx="80" cy="130" r="7" fill="#003418" stroke="white" strokeWidth="2" />
          {/* dropoff dot */}
          <circle cx="370" cy="50" r="7" fill="#296b40" stroke="white" strokeWidth="2" />
        </svg>
      </div>
      {/* address labels */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-between">
        <span className="bg-white/90 text-[10px] font-bold text-on-surface px-2 py-1 rounded-full shadow-sm max-w-[45%] truncate">
          {pickup.split(',')[0]}
        </span>
        <span className="bg-primary/90 text-[10px] font-bold text-white px-2 py-1 rounded-full shadow-sm max-w-[45%] truncate">
          {dropoff.split(',')[0]}
        </span>
      </div>
    </div>
  )
}

function RiderAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 border-2 border-surface flex items-center justify-center flex-shrink-0">
      <span className="font-['Manrope'] font-extrabold text-sm text-primary">{initials}</span>
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDeliveryType(type: string) {
  return type === 'ON_DEMAND' ? 'On Demand' : type === 'SCHEDULED' ? 'Scheduled' : 'Same Day'
}

function formatPayment(method: string) {
  const map: Record<string, string> = {
    CASH: 'Cash on Delivery',
    CARD: 'Card Payment',
    OPAY: 'OPay',
    BANK_TRANSFER: 'Bank Transfer',
  }
  return map[method] ?? method
}

export default function ReceiptPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const router = useRouter()

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const setAddresses = useBookingStore((s) => s.setAddresses)
  const setDeliveryType = useBookingStore((s) => s.setDeliveryType)

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role === 'RIDER') { router.replace('/rider/home'); return }
    if (role === 'ADMIN') { router.replace('/admin/dashboard'); return }

    api
      .get(`/orders/${orderId}`)
      .then(({ data }) => setOrder(data))
      .catch(() => toast.error('Could not load receipt'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isAuthenticated) return null

  const orderRef = order?.id?.slice(-6)?.toUpperCase() ?? orderId.slice(-6).toUpperCase()
  const riderName = order?.rider?.user?.name ?? '—'
  const finalPrice = order?.finalPrice ?? 0
  const estimatedPrice = order?.estimatedPrice ?? finalPrice
  const discount = estimatedPrice - finalPrice > 0 ? estimatedPrice - finalPrice : 0
  const deliveryFee = Math.round(finalPrice * 0.08)
  const subtotal = finalPrice - deliveryFee

  async function handleShare() {
    const text = `Fair Ride Delivery Receipt\nOrder #${orderRef}\nAmount: ₦${finalPrice.toLocaleString()}\nFrom: ${order?.pickupAddress ?? ''}\nTo: ${order?.dropoffAddress ?? ''}`
    if (navigator.share) {
      await navigator.share({ title: 'Fair Ride Receipt', text }).catch(() => null)
    } else {
      await navigator.clipboard.writeText(text)
      toast.success('Receipt copied to clipboard')
    }
  }

  function handleBookAgain() {
    if (!order) return
    setAddresses(
      { latitude: 0, longitude: 0, address: order.pickupAddress },
      { latitude: 0, longitude: 0, address: order.dropoffAddress },
    )
    setDeliveryType('ON_DEMAND')
    router.push('/book/confirm')
  }

  return (
    <ScreenWrapper>
      {/* header */}
      <header className="sticky top-0 z-30 bg-[#f8faf4] flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.replace('/history')}
            className="text-[#003418] active:scale-95 duration-150 p-2"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
              arrow_back
            </span>
          </button>
          <h1 className="font-['Manrope'] font-bold text-lg tracking-tight text-[#003418]">
            Delivery Receipt
          </h1>
        </div>
        <button
          onClick={handleShare}
          className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 0", fontSize: '20px' }}>
            share
          </span>
        </button>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-4 pb-32 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* success hero */}
            <div className="flex flex-col items-center text-center pt-2 pb-4">
              <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center mb-4 shadow-[0_12px_32px_-8px_rgba(0,52,24,0.15)]">
                <span
                  className="material-symbols-outlined text-white"
                  style={{ fontVariationSettings: "'FILL' 1", fontSize: '40px' }}
                >
                  check_circle
                </span>
              </div>
              <h2 className="font-['Manrope'] font-extrabold text-2xl text-[#003418] italic mb-1">
                Delivery Complete
              </h2>
              <p className="text-on-surface-variant text-sm font-medium mb-3">
                {order?.createdAt ? formatDate(order.createdAt) : '—'}
              </p>
              <span className="inline-block px-4 py-1.5 bg-secondary-container rounded-full text-[10px] font-bold uppercase tracking-widest text-on-secondary-fixed-variant">
                Order #{orderRef}
              </span>
            </div>

            {/* route map */}
            {order && (
              <RouteMap pickup={order.pickupAddress} dropoff={order.dropoffAddress} />
            )}

            {/* bento: price + type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm col-span-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                  Total Paid
                </p>
                <p className="font-['Manrope'] font-extrabold text-2xl text-[#003418]">
                  ₦{finalPrice.toLocaleString()}
                </p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>Subtotal</span>
                    <span className="font-semibold text-on-surface">₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>Delivery fee</span>
                    <span className="font-semibold text-on-surface">₦{deliveryFee.toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-primary">Promo discount</span>
                      <span className="font-semibold text-primary">-₦{discount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-primary rounded-2xl p-5 col-span-1 flex flex-col justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-2">
                  Delivery Type
                </p>
                <p className="font-['Manrope'] font-bold text-white text-lg leading-tight">
                  {order ? formatDeliveryType(order.deliveryType) : '—'}
                </p>
                <span className="mt-4 inline-flex items-center gap-1">
                  <span
                    className="material-symbols-outlined text-white/80"
                    style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}
                  >
                    electric_moped
                  </span>
                  <span className="text-white/80 text-xs font-medium">Fair Ride Courier</span>
                </span>
              </div>
            </div>

            {/* payment row */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-on-surface-variant"
                      style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
                    >
                      payments
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Payment Method
                    </p>
                    <p className="font-semibold text-sm text-on-surface">
                      {order ? formatPayment(order.paymentMethod) : '—'}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide">
                  Paid
                </span>
              </div>

              {/* divider */}
              <div className="border-t border-outline-variant/20" />

              {/* rider row */}
              {order?.rider && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RiderAvatar name={riderName} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Your Rider
                      </p>
                      <p className="font-semibold text-sm text-on-surface">{riderName}</p>
                    </div>
                  </div>
                  {!order.rating ? (
                    <button
                      onClick={() => router.push(`/rate/${orderId}`)}
                      className="text-primary text-sm font-bold underline underline-offset-4 active:opacity-70"
                    >
                      Rate
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: order.rating.stars }).map((_, i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-primary"
                          style={{ fontVariationSettings: "'FILL' 1", fontSize: '14px' }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* distance + status info */}
            {order?.estimatedDistance && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Distance
                  </p>
                  <p className="font-['Manrope'] font-bold text-on-surface text-base">
                    {(order.estimatedDistance / 1000).toFixed(1)} km
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Status
                  </p>
                  <p className="font-['Manrope'] font-bold text-primary text-base capitalize">
                    {order.status.replace(/_/g, ' ').toLowerCase()}
                  </p>
                </div>
              </div>
            )}

            {/* action buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleBookAgain}
                className="w-full py-5 rounded-xl font-['Manrope'] font-bold text-lg text-white shadow-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)' }}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  replay
                </span>
                Book Again
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleShare}
                  className="py-4 rounded-xl border border-outline-variant/40 font-['Manrope'] font-bold text-sm text-on-surface active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0", fontSize: '18px' }}>
                    share
                  </span>
                  Share
                </button>
                <button
                  onClick={() => toast('PDF download coming soon', { icon: '📄' })}
                  className="py-4 rounded-xl border border-outline-variant/40 font-['Manrope'] font-bold text-sm text-on-surface active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0", fontSize: '18px' }}>
                    download
                  </span>
                  Download
                </button>
              </div>
              <button
                onClick={() => router.push('/history')}
                className="w-full py-3 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Back to Activity
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </ScreenWrapper>
  )
}
