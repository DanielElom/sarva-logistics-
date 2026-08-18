/**
 * @page TrackingPage
 * @description Live tracking map showing rider location, ETA, and order status.
 * @route /tracking/[orderId]
 */
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

/* ── status config ──────────────────────────────────────────────── */
const STATUS_STEPS = [
  { key: 'ORDER_CONFIRMED', label: 'Order Confirmed', icon: 'check_circle' },
  { key: 'EN_ROUTE_TO_PICKUP', label: 'Rider En Route', icon: 'electric_moped' },
  { key: 'ARRIVED_AT_PICKUP', label: 'Arrived at Pickup', icon: 'trip_origin' },
  { key: 'PICKED_UP', label: 'Package Picked Up', icon: 'inventory_2' },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: 'two_wheeler' },
  { key: 'ARRIVED_AT_DELIVERY', label: 'Arrived at Delivery', icon: 'location_on' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'task_alt' },
]

const STATUS_INDEX: Record<string, number> = {
  PENDING: 0,
  ASSIGNED: 0,
  EN_ROUTE_TO_PICKUP: 1,
  ARRIVED_AT_PICKUP: 2,
  PICKED_UP: 3,
  IN_TRANSIT: 4,
  ARRIVED_AT_DELIVERY: 5,
  DELIVERED_REQUESTED: 6,
  DELIVERED_CONFIRMED: 6,
  CANCELLED: -1,
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Searching for rider…',
  ASSIGNED: 'Rider assigned',
  EN_ROUTE_TO_PICKUP: 'Heading to pickup',
  ARRIVED_AT_PICKUP: 'At pickup location',
  PICKED_UP: 'Package collected',
  IN_TRANSIT: 'In Transit',
  ARRIVED_AT_DELIVERY: 'Rider has arrived!',
  DELIVERED_REQUESTED: 'Delivered',
  DELIVERED_CONFIRMED: 'Delivered ✓',
  CANCELLED: 'Cancelled',
}

const STATUS_RIDER_TEXT: Record<string, string> = {
  EN_ROUTE_TO_PICKUP: 'Heading to pickup location',
  ARRIVED_AT_PICKUP: 'Arrived at pickup — handing over package',
  PICKED_UP: 'Package collected — heading to you',
  IN_TRANSIT: 'On the way to your location',
  ARRIVED_AT_DELIVERY: 'Rider has arrived at your location',
  DELIVERED_REQUESTED: 'Package delivered successfully',
}

/* ── helpers ────────────────────────────────────────────────────── */
function fmt(n: number) {
  return '₦' + Math.round(n).toLocaleString('en-NG')
}

/* ── MapCanvas ──────────────────────────────────────────────────── */
function MapCanvas({ status }: { status: string }) {
  const isMoving = ['EN_ROUTE_TO_PICKUP', 'IN_TRANSIT'].includes(status)
  return (
    <div className="absolute inset-0" style={{ background: '#e8f0e8' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="trackGrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#c8d8c8" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#trackGrid)" />
        {/* roads */}
        <rect x="0" y="35%" width="100%" height="14" fill="#d0dbd0" />
        <rect x="0" y="60%" width="100%" height="10" fill="#d0dbd0" />
        <rect x="20%" y="0" width="10" height="100%" fill="#d0dbd0" />
        <rect x="65%" y="0" width="14" height="100%" fill="#d0dbd0" />
        {/* city blocks */}
        <rect x="0" y="0" width="19%" height="34%" fill="#dce8dc" opacity="0.5" />
        <rect x="21%" y="0" width="43%" height="34%" fill="#dce8dc" opacity="0.5" />
        <rect x="66%" y="0" width="34%" height="34%" fill="#dce8dc" opacity="0.5" />
        <rect x="0" y="50%" width="19%" height="49%" fill="#dce8dc" opacity="0.5" />
        <rect x="21%" y="50%" width="43%" height="49%" fill="#dce8dc" opacity="0.5" />
        <rect x="66%" y="50%" width="34%" height="49%" fill="#dce8dc" opacity="0.5" />
        {/* route polyline */}
        <polyline
          points="20%,60% 20%,40% 45%,40% 45%,60% 65%,60%"
          fill="none"
          stroke="#003418"
          strokeWidth="3"
          strokeDasharray="10 5"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>

      {/* map gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(248,250,244,0.7) 0%, rgba(248,250,244,0) 20%, rgba(248,250,244,0) 60%, rgba(248,250,244,1) 100%)',
        }}
      />

      {/* pickup pin — top-left */}
      <div
        className="absolute z-10"
        style={{ left: '20%', top: '60%', transform: 'translate(-50%, -100%)' }}
      >
        <div className="flex flex-col items-center">
          <div className="w-5 h-5 rounded-full bg-primary-container border-3 border-white shadow-md ring-4 ring-primary-container/20" />
          <div className="mt-1 bg-white/90 px-2 py-0.5 rounded-full shadow-sm">
            <span className="text-[9px] font-bold text-on-surface uppercase tracking-wide">Pickup</span>
          </div>
        </div>
      </div>

      {/* rider pin — middle, animated */}
      <div
        className="absolute z-10"
        style={{ left: '45%', top: '40%', transform: 'translate(-50%, -100%)' }}
      >
        <div className="flex flex-col items-center">
          {isMoving && (
            <div className="absolute inset-0 -m-3 rounded-full bg-primary/20 animate-ping" />
          )}
          <div className="relative bg-primary p-2 rounded-full shadow-lg border-2 border-white z-10">
            <span
              className="material-symbols-outlined text-white block"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
            >
              electric_moped
            </span>
          </div>
          <div className="mt-1 bg-white px-2.5 py-0.5 rounded-full shadow-sm">
            <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Rider</span>
          </div>
        </div>
      </div>

      {/* dropoff pin — right */}
      <div
        className="absolute z-10"
        style={{ left: '65%', top: '60%', transform: 'translate(-50%, -100%)' }}
      >
        <div className="flex flex-col items-center">
          <div className="bg-[#531620] p-1.5 rounded-full shadow-lg border-2 border-white">
            <span
              className="material-symbols-outlined text-white block"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}
            >
              location_on
            </span>
          </div>
          <div className="mt-1 bg-white/90 px-2 py-0.5 rounded-full shadow-sm">
            <span className="text-[9px] font-bold text-on-surface uppercase tracking-wide">Drop-off</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── StepDot ───────────────────────────────────────────────────── */
function StepDot({ done, active }: { done: boolean; active: boolean }) {
  if (done) {
    return (
      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary/30">
        <span
          className="material-symbols-outlined text-white"
          style={{ fontVariationSettings: "'FILL' 1", fontSize: '12px' }}
        >
          check
        </span>
      </div>
    )
  }
  if (active) {
    return (
      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30 ring-4 ring-primary/20">
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    )
  }
  return (
    <div className="w-5 h-5 rounded-full border-2 border-outline-variant bg-surface flex-shrink-0" />
  )
}

/* ── RiderAvatar ────────────────────────────────────────────────── */
function RiderAvatar({ name, size = 14 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="rounded-full bg-primary/10 border-2 border-primary-container flex items-center justify-center flex-shrink-0 relative"
      style={{ width: size * 4, height: size * 4 }}
    >
      <span className="font-['Manrope'] font-bold text-primary" style={{ fontSize: size }}>
        {initials}
      </span>
    </div>
  )
}

/* ── Skeleton ───────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="p-6 animate-pulse space-y-4">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-surface-container-high" />
          <div className="h-12 w-20 rounded-lg bg-surface-container-high" />
        </div>
        <div className="h-12 w-24 rounded-lg bg-surface-container-high" />
      </div>
      <div className="h-px bg-surface-container-low" />
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-surface-container-high" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-32 rounded bg-surface-container-high" />
          <div className="h-3 w-24 rounded bg-surface-container-high" />
        </div>
      </div>
    </div>
  )
}

/* ── page ─────────────────────────────────────────────────────────── */
export default function LiveTrackingPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const router = useRouter()

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const token = useAuthStore((s) => s.token)

  const activeOrder = useOrderStore((s) => s.activeOrder)
  const setActiveOrder = useOrderStore((s) => s.setActiveOrder)
  const setOrderStatus = useOrderStore((s) => s.setOrderStatus)
  const clearOrder = useOrderStore((s) => s.clearOrder)

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [eta, setEta] = useState<number | null>(null)
  const [distanceRemaining, setDistanceRemaining] = useState<number | null>(null)
  const [showCallSheet, setShowCallSheet] = useState(false)
  const [showArrivedBanner, setShowArrivedBanner] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const hasNavigated = useRef(false)

  /* ── fetch order ──────────────────────────────────────────────── */
  const fetchOrder = useCallback(async (): Promise<OrderData | null> => {
    try {
      const { data } = await api.get(`/orders/${orderId}`)
      setOrder(data)
      setActiveOrder(data)
      return data
    } catch {
      return null
    }
  }, [orderId, setActiveOrder])

  /* ── status transition handler ─────────────────────────────────── */
  const handleStatusChange = useCallback(
    (status: string) => {
      setOrderStatus(status)
      if (hasNavigated.current) return

      if (status === 'ARRIVED_AT_DELIVERY') {
        hasNavigated.current = true
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        router.replace(`/tracking/${orderId}/arrived`)
      }
      if (status === 'DELIVERED_REQUESTED') {
        hasNavigated.current = true
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        router.replace(`/delivery/confirm`)
      }
      if (status === 'CANCELLED') {
        hasNavigated.current = true
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        clearOrder()
        toast.error('Order was cancelled')
        router.replace('/home')
      }
    },
    [router, setOrderStatus, clearOrder],
  )

  /* ── mount ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role === 'RIDER') { router.replace('/rider/home'); return }
    if (role === 'ADMIN') { router.replace('/admin/dashboard'); return }

    // Bootstrap from order store if available
    if (activeOrder) setOrder(activeOrder as unknown as OrderData)

    fetchOrder().then((data) => {
      setLoading(false)
      if (data) handleStatusChange(data.status)
    })

    // Poll every 10 seconds
    pollRef.current = setInterval(async () => {
      const data = await fetchOrder()
      if (data) handleStatusChange(data.status)
    }, 10_000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── socket ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!token || !orderId) return

    const sock = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001', {
      auth: { token },
      query: { token },
      transports: ['websocket'],
    })
    socketRef.current = sock

    sock.on('connect', () => {
      sock.emit('join_order', { orderId })
      console.log(`Joined order room: order:${orderId}`)
    })

    sock.on('rider_location', (data: any) => {
      if (data.eta != null) setEta(Math.round(data.eta))
      if (data.distanceRemaining != null) setDistanceRemaining(Math.round(data.distanceRemaining * 10) / 10)
      if (data.status) handleStatusChange(data.status)
    })

    sock.on('order_assigned', (data: any) => {
      setOrder(data)
      setActiveOrder(data)
    })

    sock.on('no_riders_available', () => {
      toast('Still searching for a nearby rider…', { icon: '🛵' })
    })

    return () => {
      sock.disconnect()
      socketRef.current = null
    }
  }, [token, orderId, setActiveOrder, handleStatusChange])

  /* ── cancel ───────────────────────────────────────────────────── */
  async function handleCancel() {
    setCancelling(true)
    try {
      await api.post(`/orders/${orderId}/cancel`, { reason: 'Cancelled by user' })
      if (pollRef.current) clearInterval(pollRef.current)
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

  const status = order?.status ?? 'PENDING'
  const statusIndex = STATUS_INDEX[status] ?? 0
  const rider = order?.rider
  const riderName = rider?.user?.name ?? '—'
  const riderPhone = rider?.user?.phone ?? ''
  const riderRating = rider ? Number(rider.rating ?? 4.8).toFixed(1) : '—'
  const orderRef = order?.id?.slice(-6)?.toUpperCase() ?? '------'
  const canCancel = statusIndex < 3 // before PICKED_UP
  const statusBadgeLabel = STATUS_LABEL[status] ?? status.replace(/_/g, ' ')
  const riderStatusText = STATUS_RIDER_TEXT[status] ?? ''

  return (
    <ScreenWrapper>
      {/* full-screen map */}
      <div className="absolute inset-0 z-0">
        <MapCanvas status={status} />
      </div>

      {/* header */}
      <header className="relative z-30 w-full bg-[#f8faf4]/90 backdrop-blur-sm flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/home')}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[#003418]" style={{ fontVariationSettings: "'FILL' 0" }}>
              arrow_back
            </span>
          </button>
          <h1 className="font-['Manrope'] font-bold text-lg tracking-tight text-[#003418]">
            Tracking #{orderRef}
          </h1>
        </div>
        <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden">
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
          >
            account_circle
          </span>
        </div>
      </header>

      {/* floating status badge */}
      <div className="relative z-10 px-6 pt-3 pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-2.5 bg-surface-container-lowest/85 backdrop-blur-xl rounded-xl px-4 py-2.5 shadow-md">
          <div
            className={`w-2 h-2 rounded-full ${status === 'ARRIVED_AT_DELIVERY' ? 'bg-primary-fixed animate-pulse' : 'bg-primary animate-pulse'}`}
          />
          <span className="font-['Manrope'] font-bold text-on-surface text-[11px] uppercase tracking-[0.18em]">
            {statusBadgeLabel}
          </span>
        </div>
      </div>

      {/* main spacer */}
      <main className="relative z-10 flex-1 min-h-[120px]" />

      {/* bottom sheet */}
      <div className="relative z-20">
        <div className="bg-surface-container-lowest rounded-t-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.08)] overflow-hidden">

          {/* ETA row */}
          <div className="px-6 pt-6 pb-4 flex justify-between items-end border-b border-surface-container-low">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant mb-1">
                {status === 'IN_TRANSIT' || status === 'ARRIVED_AT_DELIVERY'
                  ? 'Estimated Arrival'
                  : status === 'PICKED_UP'
                  ? 'Estimated Arrival'
                  : 'Rider Arrives In'}
              </p>
              {loading ? (
                <div className="h-12 w-24 rounded-lg bg-surface-container-high animate-pulse" />
              ) : (
                <h2 className="font-['Manrope'] text-5xl font-extrabold text-primary tracking-tight leading-none">
                  {eta ?? '—'}
                  <span className="text-xl font-bold ml-1">mins</span>
                </h2>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-on-surface-variant mb-1">Distance remaining</p>
              <p className="font-['Manrope'] text-lg font-bold text-on-surface">
                {distanceRemaining != null ? `${distanceRemaining} km` : `${order?.distanceKm ?? '—'} km`}
              </p>
            </div>
          </div>

          {/* rider row + actions */}
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <RiderAvatar name={riderName} size={14} />
                    <div className="absolute -bottom-1 -right-1 bg-surface-container-lowest rounded-full p-0.5 shadow-sm">
                      <div className="flex items-center gap-0.5 bg-surface-container-high px-1.5 py-0.5 rounded-full">
                        <span
                          className="material-symbols-outlined text-primary"
                          style={{ fontVariationSettings: "'FILL' 1", fontSize: '11px' }}
                        >
                          star
                        </span>
                        <span className="text-[10px] font-bold">{riderRating}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-['Manrope'] font-bold text-lg text-on-surface leading-tight">
                      {riderName}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                      {riderStatusText || 'Motorcycle'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShowCallSheet(true)}
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-all active:scale-95"
                  >
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontVariationSettings: "'FILL' 0", fontSize: '20px' }}
                    >
                      call
                    </span>
                  </button>
                  <button
                    onClick={() => router.push(`/tracking/${orderId}/chat`)}
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-all active:scale-95"
                  >
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontVariationSettings: "'FILL' 0", fontSize: '20px' }}
                    >
                      chat
                    </span>
                  </button>
                </div>
              </div>

              {/* delivery status stepper */}
              <div className="space-y-0">
                {STATUS_STEPS.map((step, i) => {
                  const isDone = statusIndex > i
                  const isActive = statusIndex === i
                  const isLast = i === STATUS_STEPS.length - 1

                  return (
                    <div key={step.key} className="flex gap-3">
                      {/* line + dot column */}
                      <div className="flex flex-col items-center">
                        <StepDot done={isDone} active={isActive} />
                        {!isLast && (
                          <div
                            className={`w-0.5 flex-1 min-h-[20px] my-0.5 ${isDone ? 'bg-primary' : 'bg-outline-variant/30'}`}
                          />
                        )}
                      </div>

                      {/* label */}
                      <div className={`pt-0.5 pb-3 ${isLast ? 'pb-0' : ''}`}>
                        <p
                          className={`text-[11px] font-bold uppercase tracking-widest ${
                            isDone
                              ? 'text-primary'
                              : isActive
                              ? 'text-primary'
                              : 'text-on-surface-variant/50'
                          }`}
                        >
                          {step.label}
                        </p>
                        {isActive && riderStatusText && (
                          <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">
                            {riderStatusText}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* footer action */}
          <div className="px-6 py-4 bg-surface-container-low">
            {canCancel ? (
              <button
                onClick={() => setShowCancelDialog(true)}
                className="w-full py-3.5 rounded-xl border border-error/40 text-error font-bold text-sm active:opacity-70 transition-opacity"
              >
                Cancel Order
              </button>
            ) : (
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Fair Ride — Live Tracking',
                      url: window.location.href,
                    }).catch(() => null)
                  } else {
                    navigator.clipboard.writeText(window.location.href).then(() =>
                      toast.success('Tracking link copied!')
                    )
                  }
                }}
                className="w-full py-4 rounded-xl font-['Manrope'] font-bold text-sm uppercase tracking-widest shadow-[0_8px_20px_rgba(0,52,24,0.2)] active:scale-[0.98] transition-all text-white"
                style={{ background: 'linear-gradient(135deg, #003418 0%, #296b40 100%)' }}
              >
                Share Live Tracking
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Rider arrived banner ────────────────────────────────── */}
      {showArrivedBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-surface-container-lowest rounded-2xl p-8 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: "'FILL' 1", fontSize: '36px' }}
              >
                location_on
              </span>
            </div>
            <h2 className="font-['Manrope'] font-extrabold text-2xl text-on-surface">
              Rider has arrived!
            </h2>
            <p className="text-sm text-on-surface-variant">
              Your rider is at the delivery location. Please collect your package.
            </p>
            <button
              onClick={() => setShowArrivedBanner(false)}
              className="w-full py-4 rounded-xl font-['Manrope'] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #003418 0%, #296b40 100%)' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ── Cancel dialog ───────────────────────────────────────── */}
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
                  A cancellation fee may apply. This cannot be undone.
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

      {/* ── Call sheet ──────────────────────────────────────────── */}
      {showCallSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCallSheet(false)}
          />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 space-y-3 shadow-2xl">
            <h3 className="font-['Manrope'] font-bold text-on-surface">Contact Rider</h3>
            <button
              onClick={() => { toast('In-app calling coming soon', { icon: '📞' }); setShowCallSheet(false) }}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>call</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-on-surface">In-app call</p>
                <p className="text-xs text-on-surface-variant">Anonymous & free</p>
              </div>
            </button>
            {riderPhone && (
              <button
                onClick={() => { window.open(`tel:${riderPhone}`); setShowCallSheet(false) }}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>phone_iphone</span>
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
