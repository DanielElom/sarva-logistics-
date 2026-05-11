/**
 * @page DeliverySuccessPage
 * @description Success screen after delivery confirmation — shows earnings for the trip.
 * @route /rider/delivery/success
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'

interface LastOrder {
  orderId: string
  estimatedPayout: number
  estimatedDistance?: string
  estimatedTime?: string
}

export default function DeliverySuccessPage() {
  const router = useRouter()
  const { isAuthenticated, role } = useAuthStore((s) => ({
    isAuthenticated: s.isAuthenticated,
    role: s.role,
  }))

  const [order, setOrder] = useState<LastOrder | null>(null)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
    const stored = localStorage.getItem('rider-last-order')
    if (stored) {
      try { setOrder(JSON.parse(stored)) } catch {}
    }
    // Clear active order
    localStorage.removeItem('rider-active-order')
    localStorage.removeItem('rider-active-job')
  }, [isAuthenticated, role, router])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          router.replace('/rider/home')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [router])

  const baseFare = order ? Math.round(order.estimatedPayout * 0.85) : 0
  const commission = order ? order.estimatedPayout - baseFare : 0

  return (
    <ScreenWrapper>
      <main className="min-h-screen flex flex-col">
        {/* Hero gradient */}
        <div className="bg-gradient-to-br from-primary to-primary-container px-6 pt-16 pb-12 flex flex-col items-center text-center relative overflow-hidden">
          {/* Decorative dots */}
          <div className="absolute top-8 left-8 w-3 h-3 bg-on-primary/20 rounded-full" />
          <div className="absolute top-16 right-12 w-2 h-2 bg-on-primary/30 rounded-full" />
          <div className="absolute bottom-8 left-16 w-4 h-4 bg-on-primary/10 rounded-full" />
          <div className="absolute bottom-4 right-8 w-2 h-2 bg-on-primary/20 rounded-full" />

          <div className="w-24 h-24 bg-on-primary/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm">
            <span
              className="material-symbols-outlined text-on-primary text-5xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </div>

          <h1 className="font-headline font-extrabold text-3xl text-on-primary mb-2">
            Delivery Successful!
          </h1>
          <p className="text-on-primary/70 font-body text-sm">
            Returning to home in {countdown}s…
          </p>
        </div>

        {/* Stats */}
        <div className="px-6 -mt-4 space-y-4 pb-10 flex-1">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Time Taken', value: order?.estimatedTime ?? '—', icon: 'schedule' },
              { label: 'Distance', value: order?.estimatedDistance ?? '—', icon: 'route' },
            ].map((s) => (
              <div key={s.label} className="bg-surface-container-lowest rounded-xl p-5 shadow-sm text-center">
                <span className="material-symbols-outlined text-primary mb-1">{s.icon}</span>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">{s.label}</p>
                <p className="font-headline font-extrabold text-lg text-on-surface mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Earnings card */}
          <div className="bg-primary rounded-2xl p-6 shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="material-symbols-outlined text-[80px] text-on-primary">payments</span>
            </div>
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-widest text-on-primary/70 font-bold mb-1">
                Earning Summary
              </p>
              <h2 className="font-headline font-extrabold text-4xl text-on-primary mb-4">
                ₦{(order?.estimatedPayout ?? 0).toLocaleString()}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-on-primary/10 rounded-lg">
                  <p className="text-[10px] uppercase text-on-primary/60 font-bold">Your Share</p>
                  <p className="font-bold text-on-primary text-lg">₦{baseFare.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-on-primary/10 rounded-lg">
                  <p className="text-[10px] uppercase text-on-primary/60 font-bold">Commission</p>
                  <p className="font-bold text-on-primary text-lg">₦{commission.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Premium bonus */}
          <div className="bg-gradient-to-br from-primary to-primary-container rounded-xl p-5 flex items-start gap-3 shadow-lg shadow-primary/10">
            <span className="material-symbols-outlined text-primary-fixed text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
            <div>
              <h3 className="font-headline font-bold text-on-primary leading-tight mb-0.5">Top Tier Rider</h3>
              <p className="font-body text-xs text-on-primary/80">Keep up the excellent completion rate to maintain your status!</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            {order && (
              <button
                onClick={() => router.push(`/rider/rate/${order.orderId}`)}
                className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
              >
                Rate Customer
              </button>
            )}
            <button
              onClick={() => router.replace('/rider/home')}
              className="w-full h-12 bg-surface-container-low text-on-surface font-headline font-bold rounded-xl active:scale-95 transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    </ScreenWrapper>
  )
}
