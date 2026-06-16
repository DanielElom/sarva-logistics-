/**
 * @page NavigatePage
 * @description Map navigation screen guiding rider to dropoff location.
 * @route /rider/delivery/navigate
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { io, Socket } from 'socket.io-client'

interface ActiveOrder {
  orderId: string
  pickupAddress: string
  dropoffAddress: string
  estimatedTime: string
  customerName?: string
  customerPhone?: string
}

export default function NavigateToPickupPage() {
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

  async function handleArrived() {
    if (!order) return
    router.replace('/rider/delivery/arrived')
  }

  function openGoogleMaps() {
    if (!order) return
    const q = encodeURIComponent(order.pickupAddress)
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

      {/* Turn instruction banner */}
      <div className="fixed top-[65px] left-0 right-0 z-30 bg-surface-container-lowest/95 backdrop-blur-sm border-b border-outline-variant/10 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary">navigation</span>
        </div>
        <div>
          <p className="font-bold text-sm text-on-surface">Head towards pickup location</p>
          <p className="text-xs text-on-surface-variant">Follow the route to the pickup address</p>
        </div>
      </div>

      {/* Top nav bar */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
        <div className="bg-primary rounded-2xl p-4 shadow-xl shadow-primary/30 flex items-center gap-3">
          <div className="w-10 h-10 bg-on-primary/20 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary">turn_right</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-on-primary/70 font-bold">Navigating to Pickup</p>
            <p className="font-headline font-bold text-on-primary text-sm line-clamp-1">{order.pickupAddress}</p>
          </div>
          <button
            onClick={openGoogleMaps}
            className="shrink-0 px-3 py-1.5 bg-on-primary/20 rounded-lg text-on-primary text-xs font-bold"
          >
            Maps
          </button>
        </div>
      </div>

      {/* Rider pin */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="relative">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-xl shadow-primary/40 z-10 relative">
            <span className="material-symbols-outlined text-on-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person_pin_circle</span>
          </div>
          <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">ETA</p>
              <p className="font-headline font-extrabold text-2xl text-on-surface">{order.estimatedTime}</p>
            </div>
            {order.customerName && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Customer</p>
                <p className="text-sm font-medium text-on-surface">{order.customerName}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleArrived}
            className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all duration-150"
          >
            I&apos;ve Arrived at Pickup
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to cancel this trip?')) router.replace('/rider/home')
            }}
            className="w-full text-center text-sm font-body text-on-surface-variant py-1"
          >
            Cancel Trip
          </button>
        </div>
      </div>
    </ScreenWrapper>
  )
}
