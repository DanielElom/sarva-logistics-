'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { io, Socket } from 'socket.io-client'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import { useOrderStore } from '@/stores/order.store'
import api from '@/lib/api'

/* ── types ─────────────────────────────────────────────────────── */
interface OrderData {
  id: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  finalPrice: number
  distanceKm: number
  deliveryType: string
  paymentMethod: string
  rider?: {
    id: string
    userId: string
    rating?: number
    ratingCount?: number
    user: { name: string; phone: string }
  } | null
  createdAt: string
}

/* ── helpers ────────────────────────────────────────────────────── */
function fmt(n: number) {
  return '₦' + Math.round(n).toLocaleString('en-NG')
}

function paymentIcon(method: string) {
  if (method === 'CARD') return 'credit_card'
  if (method === 'OPAY') return 'account_balance_wallet'
  if (method === 'BANK_TRANSFER') return 'account_balance'
  return 'payments'
}

function deliveryLabel(type: string) {
  if (type === 'SCHEDULED') return 'Scheduled'
  if (type === 'SAME_DAY') return 'Same-Day'
  return 'On-Demand'
}

/* ── MapBackground ─────────────────────────────────────────────── */
function MapBackground({ riderPulse }: { riderPulse: boolean }) {
  return (
    <div className="absolute inset-0" style={{ background: '#e8f0e8' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="bgGrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#c8d8c8" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bgGrid)" />
        {/* road lines */}
        <line x1="0" y1="40%" x2="100%" y2="40%" stroke="#d0dbd0" strokeWidth="12" />
        <line x1="0" y1="65%" x2="100%" y2="65%" stroke="#d0dbd0" strokeWidth="8" />
        <line x1="25%" y1="0" x2="25%" y2="100%" stroke="#d0dbd0" strokeWidth="8" />
        <line x1="70%" y1="0" x2="70%" y2="100%" stroke="#d0dbd0" strokeWidth="12" />
        {/* route dashes */}
        <line
          x1="25%"
          y1="65%"
          x2="50%"
          y2="40%"
          stroke="#003418"
          strokeWidth="3"
          strokeDasharray="10 6"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>

      {/* gradient overlay — dark at bottom for panel readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f8faf4]/30 via-transparent to-[#f8faf4]/80 pointer-events-none" />

      {/* pickup pin */}
      <div className="absolute" style={{ left: '25%', top: '65%', transform: 'translate(-50%, -100%)' }}>
        <div className="w-4 h-4 rounded-full bg-primary-container ring-4 ring-primary-container/20 ring-offset-2 ring-offset-white shadow-md" />
      </div>

      {/* rider pin */}
      <div
        className="absolute flex flex-col items-center"
        style={{ left: '45%', top: '50%', transform: 'translate(-50%, -100%)' }}
      >
        <div className="relative">
          {riderPulse && (
            <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30 scale-150" />
          )}
          <div className="bg-primary p-2.5 rounded-full shadow-lg border-3 border-white relative z-10">
            <span
              className="material-symbols-outlined text-white block text-lg"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
            >
              electric_moped
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── RiderAvatar placeholder ────────────────────────────────────── */
function RiderAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="w-16 h-16 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center relative">
      <span className="font-['Manrope'] font-bold text-xl text-primary">{initials}</span>
      <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-lg">
        <span
          className="material-symbols-outlined block"
          style={{ fontVariationSettings: "'FILL' 1", fontSize: '12px' }}
        >
          verified
        </span>
      </div>
    </div>
  )
}

/* ── skeleton ────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-40 rounded-lg bg-surface-container-high" />
      <div className="h-4 w-56 rounded-lg bg-surface-container-high" />
      <div className="flex gap-3 mt-2">
        <div className="h-10 flex-1 rounded-xl bg-surface-container-high" />
        <div className="h-10 flex-1 rounded-xl bg-surface-container-high" />
      </div>
    </div>
  )
}

/* ── page ─────────────────────────────────────────────────────────── */
export default function RiderConfirmedPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const router = useRouter()

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const userId = useAuthStore((s) => s.user?.id)

  const activeOrder = useOrderStore((s) => s.activeOrder)
  const setActiveOrder = useOrderStore((s) => s.setActiveOrder)
  const setOrderStatus = useOrderStore((s) => s.setOrderStatus)
  const clearOrder = useOrderStore((s) => s.clearOrder)

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showCallSheet, setShowCallSheet] = useState(false)
  const [etaMins, setEtaMins] = useState(8)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const hasNavigated = useRef(false)

  /* ── fetch order ──────────────────────────────────────────────── */
  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${orderId}`)
      setOrder(data)
      setActiveOrder(data)
      return data as OrderData
    } catch {
      toast.error('Order not found')
      router.replace('/home')
      return null
    }
  }, [orderId, router, setActiveOrder])

  /* ── auto-advance ─────────────────────────────────────────────── */
  const checkAndAdvance = useCallback((status: string) => {
    if (status === 'EN_ROUTE_TO_PICKUP' && !hasNavigated.current) {
      hasNavigated.current = true
      router.replace(`/tracking/${orderId}`)
    }
  }, [orderId, router])

  /* ── polling ──────────────────────────────────────────────────── */
  const startPolling = useCallback(() => {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      const data = await fetchOrder()
      if (!data) return
      if (data.status !== 'PENDING') {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = null
      }
      checkAndAdvance(data.status)
    }, 5000)
  }, [fetchOrder, checkAndAdvance])

  /* ── mount ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role === 'RIDER') { router.replace('/rider/home'); return }
    if (role === 'ADMIN') { router.replace('/admin/dashboard'); return }
    if (!activeOrder && !orderId) { router.replace('/home'); return }

    // Initial fetch
    fetchOrder().then((data) => {
      setLoading(false)
      if (!data) return
      if (data.status === 'PENDING') startPolling()
      checkAndAdvance(data.status)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── socket ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!userId || !orderId) return

    const sock = io('http://localhost:3001', {
      auth: { userId },
      query: { userId },
      transports: ['websocket'],
    })
    socketRef.current = sock

    sock.on('connect', () => {
      sock.emit('join_order', { orderId })
      console.log(`Joined order room: order:${orderId}`)
    })

    sock.on('order_assigned', (data: any) => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      setOrder(data)
      setActiveOrder(data)
      toast.success('Rider found! On the way to you.')
    })

    sock.on('rider_location', (data: any) => {
      if (data.eta != null) setEtaMins(Math.round(data.eta))
      setOrderStatus(data.status ?? 'ASSIGNED')
      if (data.status) checkAndAdvance(data.status)
    })

    sock.on('no_riders_available', () => {
      toast('No riders nearby right now. Still searching…', { icon: '🛵' })
    })

    return () => {
      sock.disconnect()
      socketRef.current = null
    }
  }, [userId, orderId, setActiveOrder, setOrderStatus, checkAndAdvance])

  /* ── cleanup poll on unmount ──────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  /* ── cancel ───────────────────────────────────────────────────── */
  async function handleCancel() {
    setCancelling(true)
    try {
      await api.post(`/orders/${orderId}/cancel`, { reason: 'Cancelled by user' })
      clearOrder()
      toast.success('Order cancelled')
      router.replace('/home')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not cancel order'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setCancelling(false)
      setShowCancelDialog(false)
    }
  }

  /* ── guard render ─────────────────────────────────────────────── */
  if (!isAuthenticated) return null

  const isPending = !order || order.status === 'PENDING'
  const isAssigned = order?.status === 'ASSIGNED'
  const rider = order?.rider
  const riderName = rider?.user?.name ?? 'Finding rider…'
  const riderPhone = rider?.user?.phone ?? ''
  const riderRating = rider?.rating ?? 4.8
  const riderRatingCount = rider?.ratingCount ?? 0
  const orderRef = order?.id?.slice(-6)?.toUpperCase() ?? '------'

  return (
    <ScreenWrapper>
      {/* full-screen map */}
      <div className="absolute inset-0 z-0">
        <MapBackground riderPulse={isAssigned} />
      </div>

      {/* header */}
      <header className="relative z-30 w-full flex justify-between items-center px-6 py-4 bg-[#f8faf4]/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/home')}
            className="text-[#003418] active:scale-95 duration-150 p-1.5 hover:bg-surface-container-high rounded-full transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
              arrow_back
            </span>
          </button>
          <h1 className="font-['Manrope'] font-extrabold text-[#003418] italic text-lg tracking-tight">
            Fair Ride
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPending ? 'bg-amber-500 animate-pulse' : 'bg-primary animate-pulse'}`} />
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            {isPending ? 'Searching…' : 'Rider found'}
          </span>
        </div>
      </header>

      {/* main — spacer that allows bottom sheet to overlay */}
      <main className="relative z-10 flex-1" />

      {/* bottom panel */}
      <div className="relative z-20 mx-0">
        <div className="glass-panel rounded-t-2xl shadow-[0_-4px_32px_rgba(25,29,25,0.12)] overflow-hidden">

          {/* ── PENDING state ───────────────────────────────────── */}
          {isPending && (
            <div className="p-6 space-y-5">
              {loading ? (
                <Skeleton />
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    {/* spinning search indicator */}
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                      <div
                        className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="material-symbols-outlined text-primary"
                          style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}
                        >
                          electric_moped
                        </span>
                      </div>
                    </div>
                    <div>
                      <h2 className="font-['Manrope'] font-bold text-xl text-on-surface">
                        Looking for a rider…
                      </h2>
                      <p className="text-sm text-on-surface-variant mt-0.5">
                        We're matching you with the nearest available rider
                      </p>
                    </div>
                  </div>

                  {/* rider stub avatars */}
                  <div className="flex items-center gap-2 py-3 px-4 bg-surface-container-low rounded-xl">
                    <div className="flex items-center">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full bg-primary/15 border-2 border-white flex items-center justify-center"
                          style={{ marginLeft: i > 0 ? '-10px' : '0' }}
                        >
                          <span
                            className="material-symbols-outlined text-primary"
                            style={{ fontVariationSettings: "'FILL' 1", fontSize: '14px' }}
                          >
                            person
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-on-surface-variant ml-1">
                      <span className="font-bold text-on-surface">3 riders</span> nearby your pickup
                    </p>
                  </div>
                </>
              )}

              {/* order summary strip */}
              {order && (
                <div className="flex items-center gap-2 py-3 px-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
                  <span className="text-xs text-on-surface-variant font-medium truncate flex-1">
                    {order.pickupAddress.length > 25
                      ? order.pickupAddress.slice(0, 25) + '…'
                      : order.pickupAddress}
                  </span>
                  <span
                    className="material-symbols-outlined text-primary flex-shrink-0"
                    style={{ fontVariationSettings: "'FILL' 0", fontSize: '16px' }}
                  >
                    arrow_forward
                  </span>
                  <span className="text-xs text-on-surface-variant font-medium truncate flex-1 text-right">
                    {order.dropoffAddress.length > 25
                      ? order.dropoffAddress.slice(0, 25) + '…'
                      : order.dropoffAddress}
                  </span>
                </div>
              )}

              {/* cancel */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <button
                  onClick={() => setShowCancelDialog(true)}
                  className="text-error font-medium text-sm hover:underline decoration-2 underline-offset-4 active:opacity-70"
                >
                  Cancel Request
                </button>
                <p className="text-[10px] text-on-surface-variant text-center max-w-[260px] leading-snug">
                  Cancellations may incur a fee once a rider is assigned.
                </p>
              </div>
            </div>
          )}

          {/* ── ASSIGNED state ──────────────────────────────────── */}
          {isAssigned && rider && (
            <div>
              <div className="p-6 space-y-5">
                {/* rider row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <RiderAvatar name={riderName} />
                    <div>
                      <h2 className="font-['Manrope'] font-bold text-xl text-on-surface tracking-tight">
                        {riderName}
                      </h2>
                      <p className="text-on-surface-variant text-sm flex items-center gap-1 mt-0.5">
                        <span
                          className="material-symbols-outlined"
                          style={{ fontVariationSettings: "'FILL' 0", fontSize: '15px' }}
                        >
                          pedal_bike
                        </span>
                        Motorcycle
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className="material-symbols-outlined text-primary"
                          style={{ fontVariationSettings: "'FILL' 1", fontSize: '13px' }}
                        >
                          star
                        </span>
                        <span className="text-xs font-bold text-on-surface">
                          {Number(riderRating).toFixed(1)}
                        </span>
                        {riderRatingCount > 0 && (
                          <span className="text-xs text-on-surface-variant">
                            ({riderRatingCount.toLocaleString()} deliveries)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-primary font-['Manrope'] font-extrabold text-2xl tracking-tighter italic">
                      {etaMins} min
                    </span>
                    <span className="block text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">
                      Est. Arrival
                    </span>
                  </div>
                </div>

                {/* action buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowCallSheet(true)}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-surface-container-high text-on-surface font-semibold hover:bg-surface-container-highest transition-colors active:scale-[0.98] text-sm"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 0", fontSize: '20px' }}
                    >
                      call
                    </span>
                    Call
                  </button>
                  <button
                    onClick={() => router.push(`/tracking/${orderId}/chat`)}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-all active:scale-[0.98] text-sm"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
                    >
                      chat_bubble
                    </span>
                    Chat
                  </button>
                </div>

                {/* order summary strip */}
                <div className="flex items-center gap-2 py-3 px-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
                  <span
                    className="material-symbols-outlined text-on-surface-variant flex-shrink-0"
                    style={{ fontVariationSettings: "'FILL' 0", fontSize: '15px' }}
                  >
                    {paymentIcon(order?.paymentMethod ?? '')}
                  </span>
                  <span className="text-xs text-on-surface-variant truncate flex-1">
                    {order?.pickupAddress?.slice(0, 20)}…
                  </span>
                  <span
                    className="material-symbols-outlined text-primary flex-shrink-0"
                    style={{ fontVariationSettings: "'FILL' 0", fontSize: '14px' }}
                  >
                    arrow_forward
                  </span>
                  <span className="text-xs font-bold text-primary">
                    {fmt(order?.finalPrice ?? 0)}
                  </span>
                </div>

                {/* track live */}
                <button
                  onClick={() => router.push(`/tracking/${orderId}`)}
                  className="w-full py-3 rounded-xl border-2 border-primary text-primary font-bold text-sm flex items-center justify-center gap-2 active:bg-primary/5 transition-colors"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                  >
                    my_location
                  </span>
                  Track Live
                </button>

                {/* cancel */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    className="text-error font-medium text-sm hover:underline decoration-2 underline-offset-4 active:opacity-70"
                  >
                    Cancel Request
                  </button>
                  <p className="text-[10px] text-on-surface-variant text-center max-w-[260px] leading-snug">
                    A small fee may apply if you cancel after rider confirmation.
                  </p>
                </div>
              </div>

              {/* status bar */}
              <div className="px-6 py-3.5 bg-primary/8 flex items-center justify-between border-t border-primary/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    On the way to pick up your package
                  </span>
                </div>
                <span className="text-[10px] text-on-surface-variant font-medium">
                  #{orderRef}
                </span>
              </div>
            </div>
          )}

          {/* ── non-pending/assigned fallback (DELIVERED etc) ──── */}
          {order && !isPending && !isAssigned && (
            <div className="p-6 text-center space-y-3">
              <p className="font-bold text-on-surface">Order #{orderRef}</p>
              <p className="text-sm text-on-surface-variant capitalize">
                Status: {order.status.toLowerCase().replace(/_/g, ' ')}
              </p>
              <button
                onClick={() => router.replace(`/tracking/${orderId}`)}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm"
              >
                View Tracking
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Cancel confirmation dialog ──────────────────────────── */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCancelDialog(false)}
          />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
                <span
                  className="material-symbols-outlined text-error"
                  style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
                >
                  warning
                </span>
              </div>
              <div>
                <h3 className="font-['Manrope'] font-bold text-on-surface">Cancel this order?</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  A cancellation fee may apply if a rider is already assigned.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="py-3 rounded-xl border border-outline-variant/40 text-sm font-bold text-on-surface active:opacity-70"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="py-3 rounded-xl bg-error text-white text-sm font-bold active:opacity-80 disabled:opacity-60"
              >
                {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Call bottom sheet ───────────────────────────────────── */}
      {showCallSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCallSheet(false)}
          />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-['Manrope'] font-bold text-on-surface">Contact Rider</h3>
            <button
              onClick={() => {
                toast('In-app calling coming soon', { icon: '📞' })
                setShowCallSheet(false)
              }}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
                >
                  call
                </span>
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-on-surface">In-app call</p>
                <p className="text-xs text-on-surface-variant">Anonymous & free</p>
              </div>
            </button>
            {riderPhone && (
              <button
                onClick={() => {
                  window.open(`tel:${riderPhone}`)
                  setShowCallSheet(false)
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
                  >
                    phone_iphone
                  </span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-on-surface">Phone call</p>
                  <p className="text-xs text-on-surface-variant">{riderPhone}</p>
                </div>
              </button>
            )}
            <button
              onClick={() => setShowCallSheet(false)}
              className="w-full py-3 rounded-xl border border-outline-variant/40 text-sm font-bold text-on-surface-variant active:opacity-70"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </ScreenWrapper>
  )
}
