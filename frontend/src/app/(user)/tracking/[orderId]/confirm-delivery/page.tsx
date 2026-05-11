/**
 * @page ConfirmDeliveryPage
 * @description Customer enters 4-digit security code to confirm they received the package.
 * @route /tracking/[orderId]/confirm-delivery
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import { useOrderStore } from '@/stores/order.store'
import api from '@/lib/api'

const DISPUTE_OPTIONS = [
  { key: 'not_received', label: 'Package not received', icon: 'package_2' },
  { key: 'wrong_item', label: 'Wrong item delivered', icon: 'error' },
  { key: 'damaged', label: 'Package damaged', icon: 'broken_image' },
  { key: 'other', label: 'Other issue', icon: 'help' },
]

interface OrderData {
  id: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  finalPrice: number
  createdAt: string
  rider?: { id: string; user: { name: string; phone: string } } | null
}

export default function ConfirmDeliveryPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const router = useRouter()

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const activeOrder = useOrderStore((s) => s.activeOrder)
  const clearOrder = useOrderStore((s) => s.clearOrder)

  const [order, setOrder] = useState<OrderData | null>(
    activeOrder as unknown as OrderData | null,
  )
  const [confirming, setConfirming] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [showDisputeSheet, setShowDisputeSheet] = useState(false)
  const [disputeIssue, setDisputeIssue] = useState<string | null>(null)
  const [disputeDesc, setDisputeDesc] = useState('')
  const [raisingDispute, setRaisingDispute] = useState(false)
  const autoConfirmRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasActed = useRef(false)

  /* guard + fetch */
  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role === 'RIDER') { router.replace('/rider/home'); return }
    if (role === 'ADMIN') { router.replace('/admin/dashboard'); return }

    api.get(`/orders/${orderId}`).then(({ data }) => setOrder(data)).catch(() => null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* auto-confirm countdown */
  useEffect(() => {
    autoConfirmRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(autoConfirmRef.current!)
          if (!hasActed.current) doConfirm()
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => { if (autoConfirmRef.current) clearInterval(autoConfirmRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function doConfirm() {
    if (hasActed.current) return
    hasActed.current = true
    if (autoConfirmRef.current) clearInterval(autoConfirmRef.current)
    setConfirming(true)
    try {
      await api.post(`/orders/${orderId}/confirm-delivery`)
      clearOrder()
      router.replace(`/rate/${orderId}`)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not confirm delivery'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
      hasActed.current = false
    } finally {
      setConfirming(false)
    }
  }

  async function doDispute() {
    if (!disputeIssue) { toast.error('Please select an issue type'); return }
    hasActed.current = true
    if (autoConfirmRef.current) clearInterval(autoConfirmRef.current)
    setRaisingDispute(true)
    try {
      await api.post(`/orders/${orderId}/dispute`, {
        issueType: disputeIssue,
        description: disputeDesc || disputeIssue.replace(/_/g, ' '),
      })
      clearOrder()
      toast.success('Dispute raised. Admin will review within 24 hours.')
      router.replace('/home')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not raise dispute'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
      hasActed.current = false
    } finally {
      setRaisingDispute(false)
      setShowDisputeSheet(false)
    }
  }

  if (!isAuthenticated) return null

  const riderName = order?.rider?.user?.name ?? '—'
  const deliveryTime = order?.createdAt
    ? new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
    : '—'
  const orderRef = order?.id?.slice(-6)?.toUpperCase() ?? '------'
  const dropoff = order?.dropoffAddress ?? '—'

  const pad = (n: number) => String(n).padStart(2, '0')
  const countdownDisplay = `0:${pad(countdown)}`

  return (
    <ScreenWrapper>
      {/* header */}
      <header className="sticky top-0 z-30 bg-[#f8faf4] flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-[#003418] active:scale-95 duration-150 p-1"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_back</span>
          </button>
          <h1 className="font-['Manrope'] font-extrabold text-[#003418] italic text-lg tracking-tight">
            Fair Ride
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>account_circle</span>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-6 pb-10 max-w-lg mx-auto w-full">
        {/* icon + badge */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4 shadow-[0_24px_48px_-12px_rgba(25,29,25,0.08)]">
            <span
              className="material-symbols-outlined text-white"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '40px' }}
            >
              local_shipping
            </span>
          </div>
          <div className="px-4 py-1.5 bg-secondary-container rounded-full">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-secondary-fixed-variant">
              Order #{orderRef}
            </span>
          </div>
        </div>

        {/* main card */}
        <div className="bg-surface-container-lowest rounded-xl w-full shadow-[0_24px_48px_-12px_rgba(25,29,25,0.08)] relative overflow-hidden border border-outline-variant/10">
          {/* gradient top accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-container" />

          <div className="text-center px-8 pt-8 pb-6">
            <h2 className="font-['Manrope'] text-2xl font-bold text-on-surface mb-2">
              Delivery Status
            </h2>
            <p className="text-on-surface-variant leading-relaxed text-sm">
              Has your delivery been successfully completed?
            </p>
            {/* auto-confirm timer */}
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold text-primary">
                Auto-confirming in {countdownDisplay}
              </span>
            </div>
          </div>

          {/* bento grid */}
          <div className="grid grid-cols-2 gap-3 px-8 mb-6">
            <div className="bg-surface-container-low p-4 rounded-lg">
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant block mb-1 font-bold">Time</span>
              <span className="font-semibold text-on-surface text-sm">{deliveryTime}</span>
            </div>
            <div className="bg-surface-container-low p-4 rounded-lg">
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant block mb-1 font-bold">Rider</span>
              <span className="font-semibold text-on-surface text-sm">{riderName}</span>
            </div>
          </div>

          {/* action buttons */}
          <div className="flex flex-col gap-3 px-8 pb-8">
            <button
              onClick={doConfirm}
              disabled={confirming}
              className="w-full py-4 rounded-xl font-['Manrope'] font-bold text-white flex items-center justify-center gap-2 shadow-[0_24px_48px_-12px_rgba(25,29,25,0.08)] active:scale-[0.98] transition-all disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #003418 0%, #296b40 100%)' }}
            >
              {confirming ? (
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              )}
              {confirming ? 'Confirming…' : 'Yes, Confirm Delivery'}
            </button>
            <button
              onClick={() => {
                hasActed.current = true
                if (autoConfirmRef.current) clearInterval(autoConfirmRef.current)
                setShowDisputeSheet(true)
              }}
              className="w-full py-4 bg-surface-container-high text-error font-['Manrope'] font-semibold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 0" }}>report</span>
              There&apos;s a Problem
            </button>
          </div>
        </div>

        {/* delivery address */}
        <div className="mt-6 w-full bg-surface-container-low rounded-xl p-5 border border-outline-variant/20">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-white rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            </div>
            <div>
              <h4 className="font-['Manrope'] font-bold text-on-surface text-sm">Delivery Location</h4>
              <p className="text-xs text-on-surface-variant mt-1 leading-snug">{dropoff}</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-on-surface-variant text-sm font-medium text-center">
          Need help?{' '}
          <button className="text-primary font-bold underline underline-offset-4">
            Contact Support
          </button>
        </p>
      </main>

      {/* dispute bottom sheet */}
      {showDisputeSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDisputeSheet(false)} />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 space-y-4 shadow-2xl">
            <div>
              <h3 className="font-['Manrope'] font-bold text-on-surface text-lg">What went wrong?</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Select the issue and we'll investigate immediately.</p>
            </div>
            <div className="space-y-2">
              {DISPUTE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setDisputeIssue(opt.key)}
                  className={[
                    'w-full flex items-center gap-3 p-3.5 rounded-xl transition-all active:scale-[0.98]',
                    disputeIssue === opt.key
                      ? 'border-2 border-primary bg-primary/5'
                      : 'border border-outline-variant/30 bg-surface-container-low',
                  ].join(' ')}
                >
                  <span
                    className={`material-symbols-outlined ${disputeIssue === opt.key ? 'text-primary' : 'text-on-surface-variant'}`}
                    style={{ fontVariationSettings: disputeIssue === opt.key ? "'FILL' 1" : "'FILL' 0", fontSize: '20px' }}
                  >
                    {opt.icon}
                  </span>
                  <span className={`text-sm font-bold ${disputeIssue === opt.key ? 'text-primary' : 'text-on-surface'}`}>
                    {opt.label}
                  </span>
                  {disputeIssue === opt.key && (
                    <span className="ml-auto material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}>check_circle</span>
                  )}
                </button>
              ))}
            </div>
            <textarea
              value={disputeDesc}
              onChange={(e) => setDisputeDesc(e.target.value)}
              placeholder="Add more details (optional)…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-outline-variant/30 bg-surface-container-low text-sm resize-none focus:outline-none focus:border-primary transition-colors"
            />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowDisputeSheet(false)} className="py-3 rounded-xl border border-outline-variant/40 text-sm font-bold text-on-surface active:opacity-70">
                Back
              </button>
              <button
                onClick={doDispute}
                disabled={raisingDispute || !disputeIssue}
                className="py-3 rounded-xl bg-error text-white text-sm font-bold active:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {raisingDispute ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                {raisingDispute ? 'Submitting…' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenWrapper>
  )
}
