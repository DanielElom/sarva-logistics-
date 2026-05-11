/**
 * @page DeliveryCancelPage
 * @description Cancellation fee breakdown shown when a customer cancels an in-progress order.
 * @route /delivery/cancel
 */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

interface CancelData {
  orderId: string
  cancellationFee: number
  paymentMethod: string
  reason?: string
}

function maskPayment(method: string) {
  if (method === 'CASH') return 'Cash on Delivery'
  if (method === 'CARD') return 'Card •••• 4242'
  if (method === 'OPAY') return 'OPay'
  return method
}

export default function DeliveryCancelPage() {
  const router = useRouter()
  const { isAuthenticated, role } = useAuthStore((s) => ({ isAuthenticated: s.isAuthenticated, role: s.role }))
  const [data, setData] = useState<CancelData | null>(null)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role === 'RIDER' || role === 'ADMIN') { router.replace('/home'); return }

    const stored = localStorage.getItem('fair-ride-cancel-info')
    if (stored) {
      try { setData(JSON.parse(stored)) } catch { /* ignore */ }
    } else {
      setData({ orderId: 'UNKNOWN', cancellationFee: 300, paymentMethod: 'CARD' })
    }
  }, [isAuthenticated, role, router])

  async function handleBookAgain() {
    if (data?.orderId && data.orderId !== 'UNKNOWN') {
      try {
        await api.post(`/orders/${data.orderId}/rebook`)
      } catch { /* ignore */ }
    }
    router.push('/book/address')
  }

  const refId = data?.orderId?.slice(-6)?.toUpperCase() ?? 'EC-000'

  return (
    <div className="fixed inset-0 bg-surface-container-low overflow-hidden">
      {/* Map background */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full flex items-center justify-center opacity-10">
          <span className="material-symbols-outlined text-[300px] text-primary">map</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-transparent" />
      </div>

      {/* Header */}
      <header className="w-full sticky top-0 z-50 flex justify-between items-center px-6 py-4 bg-[#f8faf4]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.replace('/home')} className="text-primary">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-['Manrope'] font-extrabold text-[#003418] italic text-lg tracking-tight">
            Fair-Ride
          </span>
        </div>
        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant">account_circle</span>
        </div>
      </header>

      {/* Centered modal */}
      <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden">
          {/* Error bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-tertiary via-error to-tertiary" />

          <div className="p-8">
            {/* Icon + heading */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-error-container/30 flex items-center justify-center mb-6">
                <span
                  className="material-symbols-outlined text-error text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  cancel
                </span>
              </div>
              <h1 className="font-headline font-bold text-2xl text-on-surface tracking-tight mb-3">
                Order Canceled
              </h1>
              <p className="text-on-surface-variant leading-relaxed px-2 text-sm">
                Your order has been canceled. A cancellation fee has been applied because your rider was already en route.
              </p>
            </div>

            {/* Fee breakdown */}
            <div className="bg-surface-container-low rounded-lg p-5 mb-8 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant font-medium">Cancellation Fee</span>
                <span className="font-headline font-bold text-on-surface">
                  ₦{(data?.cancellationFee ?? 300).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant font-medium">Payment Method</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">payments</span>
                  <span className="font-medium text-on-surface text-sm">
                    {maskPayment(data?.paymentMethod ?? 'CARD')}
                  </span>
                </div>
              </div>
              <div className="pt-3 border-t border-outline-variant/30 flex items-start gap-3">
                <span className="material-symbols-outlined text-on-surface-variant text-lg shrink-0 mt-0.5">info</span>
                <p className="text-xs text-on-surface-variant italic leading-relaxed">
                  The rider was already en route to your location. This fee supports their time and fuel.
                </p>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleBookAgain}
              className="w-full py-4 px-6 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                add_circle
              </span>
              Book New Delivery
            </button>
          </div>

          {/* Reference footer */}
          <div className="bg-surface-container-highest/30 px-8 py-4 flex justify-center border-t border-outline-variant/10">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
              Reference ID: FR-{refId}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
