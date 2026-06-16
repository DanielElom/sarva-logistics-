/**
 * @page RiderArrivedPage
 * @description Screen shown when rider marks arrival at pickup — prompts package collection.
 * @route /rider/delivery/arrived
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import api from '@/lib/api'

interface ActiveOrder {
  orderId: string
  pickupAddress: string
  customerName?: string
  customerPhone?: string
}

export default function ArrivedAtPickupPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  const [order, setOrder] = useState<ActiveOrder | null>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
    const stored = localStorage.getItem('rider-active-order')
    if (!stored) { router.replace('/rider/home'); return }
    try { setOrder(JSON.parse(stored)) } catch { router.replace('/rider/home') }
  }, [isAuthenticated, role, router])

  async function handleMarkArrived() {
    if (!order || marking) return
    setMarking(true)
    try {
      await api.patch(`/matching/orders/${order.orderId}/status`, { status: 'ARRIVED_AT_PICKUP' })
    } catch {
      // proceed
    }
    router.replace('/rider/delivery/verify')
  }

  if (!order) return null

  return (
    <ScreenWrapper>
      {/* Map bg */}
      <div className="fixed inset-0 z-0 bg-surface-container-low opacity-40">
        <div className="w-full h-full flex items-center justify-center">
          <span className="material-symbols-outlined text-[200px] text-primary opacity-20">map</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen px-6 py-8">
        {/* Arrived banner */}
        <div className="bg-primary-container rounded-2xl p-6 mb-6 flex items-center gap-4 shadow-xl shadow-primary/10">
          <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-on-primary-container/70 font-bold mb-0.5">
              You Have Arrived
            </p>
            <h1 className="font-headline font-extrabold text-xl text-on-primary-container">
              At Pickup Location
            </h1>
            <p className="text-sm text-on-primary-container/70 font-body mt-0.5 line-clamp-1">
              {order.pickupAddress}
            </p>
          </div>
        </div>

        {/* Rider pin on map */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-2xl shadow-primary/40">
              <span className="material-symbols-outlined text-on-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>person_pin_circle</span>
            </div>
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse scale-150" />
          </div>
        </div>

        {/* Order info card */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xl mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Pickup Point</p>
              <p className="font-body text-sm font-medium text-on-surface mt-0.5 line-clamp-2">{order.pickupAddress}</p>
            </div>
          </div>
          {order.customerName && (
            <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-surface-container-low rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant">person</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-on-surface-variant font-bold">Merchant</p>
                  <p className="text-sm font-medium text-on-surface">{order.customerName}</p>
                </div>
              </div>
              {order.customerPhone && (
                <a
                  href={`tel:${order.customerPhone}`}
                  className="w-10 h-10 bg-primary-fixed rounded-full flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-on-primary-fixed text-sm">call</span>
                </a>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleMarkArrived}
          disabled={marking}
          className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all duration-150 disabled:opacity-60"
        >
          {marking ? 'Updating…' : 'Mark Arrived'}
        </button>
      </div>
    </ScreenWrapper>
  )
}
