'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import { useOrderStore } from '@/stores/order.store'
import api from '@/lib/api'

interface OrderData {
  id: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  finalPrice: number
  rider?: {
    id: string
    userId: string
    rating?: number
    user: { name: string; phone: string }
  } | null
}

function MapUnderlay() {
  return (
    <div className="absolute inset-0" style={{ background: '#dce8dc', filter: 'grayscale(60%) brightness(1.05)' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="arrivedGrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#b8ccb8" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#arrivedGrid)" />
        <rect x="0" y="38%" width="100%" height="12" fill="#c8d8c8" />
        <rect x="0" y="62%" width="100%" height="10" fill="#c8d8c8" />
        <rect x="30%" y="0" width="10" height="100%" fill="#c8d8c8" />
        <rect x="68%" y="0" width="12" height="100%" fill="#c8d8c8" />
      </svg>
    </div>
  )
}

function RiderAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center p-1">
      <div className="w-full h-full rounded-full border-4 border-surface bg-primary/10 flex items-center justify-center overflow-hidden">
        <span className="font-['Manrope'] font-extrabold text-3xl text-primary">{initials}</span>
      </div>
    </div>
  )
}

export default function RiderArrivedPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const router = useRouter()

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const userId = useAuthStore((s) => s.user?.id)
  const activeOrder = useOrderStore((s) => s.activeOrder)

  const [order, setOrder] = useState<OrderData | null>(
    activeOrder as unknown as OrderData | null,
  )
  const [showCallSheet, setShowCallSheet] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasNavigated = useRef(false)

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${orderId}`)
      setOrder(data)
      return data as OrderData
    } catch {
      return null
    }
  }, [orderId])

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role === 'RIDER') { router.replace('/rider/home'); return }
    if (role === 'ADMIN') { router.replace('/admin/dashboard'); return }

    fetchOrder()

    pollRef.current = setInterval(async () => {
      const data = await fetchOrder()
      if (!data || hasNavigated.current) return
      if (data.status === 'DELIVERED_REQUESTED' || data.status === 'DELIVERED_CONFIRMED') {
        hasNavigated.current = true
        clearInterval(pollRef.current!)
        router.replace(`/tracking/${orderId}/confirm-delivery`)
      }
    }, 5000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isAuthenticated) return null

  const riderName = order?.rider?.user?.name ?? 'Your rider'
  const riderPhone = order?.rider?.user?.phone ?? ''
  const riderRating = order?.rider?.rating != null ? Number(order.rider.rating).toFixed(1) : null
  const dropoff = order?.dropoffAddress ?? '—'

  return (
    <ScreenWrapper>
      {/* map underlay */}
      <div className="absolute inset-0 z-0 opacity-50">
        <MapUnderlay />
      </div>

      {/* backdrop blur overlay */}
      <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-4">
        <div className="absolute inset-0 bg-on-surface/20 backdrop-blur-[3px]" />

        {/* card */}
        <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-[2rem] shadow-[0_24px_48px_-12px_rgba(25,29,25,0.12)] overflow-hidden flex flex-col items-center text-center p-8 z-10">
          {/* drag handle */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-outline-variant/30 rounded-full md:hidden" />

          {/* rider avatar */}
          <div className="mb-5 mt-2">
            <RiderAvatar name={riderName} />
          </div>

          {/* status badge + headline */}
          <div className="space-y-2 mb-6">
            <span className="inline-block px-4 py-1 rounded-full bg-primary-container text-white text-[10px] uppercase tracking-widest font-bold">
              Rider Nearby
            </span>
            <h2 className="font-['Manrope'] font-extrabold text-3xl text-primary tracking-tight leading-tight">
              Your Rider has Arrived!
            </h2>
            <p className="text-on-surface-variant text-base">
              <span className="font-semibold text-on-surface">{riderName}</span> is waiting at your delivery location.
            </p>
            {riderRating && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}>star</span>
                <span className="text-sm font-bold text-on-surface">{riderRating}</span>
                <span className="text-xs text-on-surface-variant">rating</span>
              </div>
            )}
          </div>

          {/* delivery info card */}
          <div className="w-full p-5 bg-surface-container-low rounded-2xl mb-6 flex items-center gap-4 text-left">
            <div className="bg-primary/8 p-3 rounded-xl flex-shrink-0">
              <span
                className="material-symbols-outlined text-primary text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                package_2
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-0.5">
                Delivery Location
              </p>
              <p className="text-sm font-semibold text-on-surface leading-snug">
                {dropoff.length > 60 ? dropoff.slice(0, 60) + '…' : dropoff}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                Please collect your package from the rider.
              </p>
            </div>
          </div>

          {/* action buttons */}
          <div className="grid grid-cols-2 gap-3 w-full mb-3">
            <button
              onClick={() => setShowCallSheet(true)}
              className="flex items-center justify-center gap-2 py-4 bg-surface-container-high text-on-surface font-['Manrope'] font-bold rounded-xl active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>call</span>
              Call
            </button>
            <button
              onClick={() => router.push(`/tracking/${orderId}/chat`)}
              className="flex items-center justify-center gap-2 py-4 bg-surface-container-high text-on-surface font-['Manrope'] font-bold rounded-xl active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>chat_bubble</span>
              Chat
            </button>
          </div>
          <button
            onClick={() => router.push(`/tracking/${orderId}/confirm-delivery`)}
            className="w-full py-5 rounded-xl font-['Manrope'] font-extrabold text-lg text-white shadow-[0_8px_24px_rgba(0,52,24,0.2)] active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg, #003418 0%, #296b40 100%)' }}
          >
            Confirm I&apos;m Ready
          </button>
        </div>
      </div>

      {/* call sheet */}
      {showCallSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCallSheet(false)} />
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
            <button onClick={() => setShowCallSheet(false)} className="w-full py-3 rounded-xl border border-outline-variant/40 text-sm font-bold text-on-surface-variant active:opacity-70">
              Cancel
            </button>
          </div>
        </div>
      )}
    </ScreenWrapper>
  )
}
