/**
 * @page TransitPage
 * @description Alternative transit tracking screen with live status updates.
 * @route /rider/delivery/transit
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import api from '@/lib/api'
import { io, Socket } from 'socket.io-client'

interface ActiveOrder {
  orderId: string
  pickupAddress: string
  dropoffAddress: string
  estimatedTime: string
  customerName?: string
  customerPhone?: string
}

export default function InTransitPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const token = useAuthStore((s) => s.token)

  const [order, setOrder] = useState<ActiveOrder | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const watchRef = useRef<number | null>(null)
  const lastEmitRef = useRef<number>(0)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
    const stored = localStorage.getItem('rider-active-order')
    if (!stored) { router.replace('/rider/home'); return }
    try { setOrder(JSON.parse(stored)) } catch { router.replace('/rider/home') }
  }, [isAuthenticated, role, router])

  useEffect(() => {
    if (!token || !order) return
    const socket = io('http://localhost:3001', { auth: { token }, transports: ['websocket'] })
    socketRef.current = socket
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now()
        if (now - lastEmitRef.current >= 5000) {
          socket.emit('location_update', { orderId: order.orderId, latitude: pos.coords.latitude, longitude: pos.coords.longitude })
          lastEmitRef.current = now
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 0 },
    )
    return () => {
      socket.disconnect()
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [token, order])

  async function handleArrivedAtDestination() {
    if (!order) return
    try {
      await api.patch(`/matching/orders/${order.orderId}/status`, { status: 'ARRIVED_AT_DELIVERY' })
    } catch {
      // proceed
    }
    router.replace('/rider/delivery/complete')
  }

  function openGoogleMaps() {
    if (!order) return
    const q = encodeURIComponent(order.dropoffAddress)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, '_blank')
  }

  if (!order) return null

  return (
    <ScreenWrapper className="bg-surface">
      {/* Map */}
      <div className="fixed inset-0 z-0 bg-surface-container-low">
        <div className="w-full h-full flex items-center justify-center opacity-10">
          <span className="material-symbols-outlined text-[200px] text-primary">map</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-surface/70" />
      </div>

      {/* Status banner */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
        <div className="bg-primary-container rounded-2xl p-4 shadow-xl flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-primary-container/70">In Transit</span>
              <span className="bg-primary text-on-primary text-[9px] font-bold px-2 py-0.5 rounded-full">ACTIVE</span>
            </div>
            <p className="font-body text-sm font-medium text-on-primary-container line-clamp-1">{order.dropoffAddress}</p>
          </div>
          <button
            onClick={openGoogleMaps}
            className="shrink-0 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold"
          >
            Maps
          </button>
        </div>
      </div>

      {/* Rider pin */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="relative">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-xl shadow-primary/40 z-10 relative">
            <span className="material-symbols-outlined text-on-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>delivery_dining</span>
          </div>
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
        </div>
      </div>

      {/* Call + Chat FABs */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3">
        {order.customerPhone && (
          <a
            href={`tel:${order.customerPhone}`}
            className="w-12 h-12 bg-surface-container-lowest rounded-full shadow-lg flex items-center justify-center border border-outline-variant/20"
          >
            <span className="material-symbols-outlined text-primary">call</span>
          </a>
        )}
        <button className="w-12 h-12 bg-surface-container-lowest rounded-full shadow-lg flex items-center justify-center border border-outline-variant/20">
          <span className="material-symbols-outlined text-primary">chat</span>
        </button>
      </div>

      {/* Bottom card */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-8">
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-2xl space-y-4">
          {/* Route dots */}
          <div className="flex items-start gap-3 px-1">
            <div className="flex flex-col items-center pt-1">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <div className="w-0.5 h-8 bg-outline-variant my-1" />
              <div className="w-3 h-3 rounded-full bg-error" />
            </div>
            <div className="space-y-3 flex-1">
              <p className="text-xs text-on-surface-variant line-clamp-1">{order.pickupAddress}</p>
              <p className="text-sm font-medium text-on-surface line-clamp-1">{order.dropoffAddress}</p>
            </div>
          </div>
          <button
            onClick={handleArrivedAtDestination}
            className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all duration-150"
          >
            Arrived at Destination
          </button>
        </div>
      </div>
    </ScreenWrapper>
  )
}
