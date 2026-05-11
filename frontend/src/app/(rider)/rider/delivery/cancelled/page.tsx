/**
 * @page DeliveryCancelledPage
 * @description Screen shown when an assigned order is cancelled by the customer.
 * @route /rider/delivery/cancelled
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'

interface CancelledInfo {
  reason?: string
  cancellationFee?: number
}

export default function OrderCancelledPage() {
  const router = useRouter()
  const { isAuthenticated, role } = useAuthStore((s) => ({
    isAuthenticated: s.isAuthenticated,
    role: s.role,
  }))

  const [info, setInfo] = useState<CancelledInfo>({})

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
    const stored = localStorage.getItem('rider-cancelled-info')
    if (stored) { try { setInfo(JSON.parse(stored)) } catch {} }
    // Clear active order
    localStorage.removeItem('rider-active-order')
    localStorage.removeItem('rider-active-job')
    localStorage.removeItem('rider-cancelled-info')
  }, [isAuthenticated, role, router])

  return (
    <ScreenWrapper className="bg-surface">
      {/* Map bg */}
      <div className="fixed inset-0 z-0 bg-surface-container-low opacity-40 grayscale">
        <div className="w-full h-full flex items-center justify-center">
          <span className="material-symbols-outlined text-[200px] text-primary opacity-20">map</span>
        </div>
      </div>
      <div className="fixed inset-0 z-[1] bg-on-background/20 backdrop-blur-sm" />

      {/* Alert Dialog */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
        <div className="w-full max-w-sm bg-surface-container-lowest rounded-[2rem] overflow-hidden shadow-2xl">
          {/* Icon */}
          <div className="p-8 pb-4 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-error-container text-error rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
            </div>
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface mb-3">
              Order Canceled
            </h1>
            <p className="text-on-surface-variant font-body leading-relaxed px-2 text-sm">
              {info.reason
                ? `The order was canceled: ${info.reason}.`
                : 'The customer has canceled this request.'}
              {info.cancellationFee && info.cancellationFee > 0
                ? ` Compensation of ₦${info.cancellationFee.toLocaleString()} has been added to your wallet.`
                : ''}
            </p>
          </div>

          {/* Compensation card */}
          {info.cancellationFee && info.cancellationFee > 0 && (
            <div className="mx-6 mb-6 p-4 bg-surface-container-low rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-container rounded-xl flex items-center justify-center text-on-primary-container">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">
                  Compensation Added
                </span>
                <span className="text-lg font-headline font-extrabold text-primary">
                  +₦{info.cancellationFee.toLocaleString()} Credit
                </span>
              </div>
            </div>
          )}

          {/* Action */}
          <div className="px-6 pb-8">
            <button
              onClick={() => router.replace('/rider/home')}
              className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all duration-150"
            >
              Back to Online
            </button>
          </div>
        </div>
      </div>
    </ScreenWrapper>
  )
}
