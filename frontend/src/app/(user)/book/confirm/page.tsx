'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import { useBookingStore, type PaymentMethod } from '@/stores/booking.store'
import { useOrderStore } from '@/stores/order.store'
import api from '@/lib/api'

/* ── helpers ────────────────────────────────────────────────────── */
function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

function deliveryLabel(type: string | null) {
  if (type === 'SCHEDULED') return 'Scheduled'
  if (type === 'SAME_DAY') return 'Same-Day'
  return 'On-Demand'
}

function deliverySubtext(type: string | null) {
  if (type === 'SCHEDULED') return 'Booked ahead'
  if (type === 'SAME_DAY') return 'Delivered today'
  return 'Delivery in 30–45 mins'
}

function deliveryIcon(type: string | null) {
  if (type === 'SCHEDULED') return 'event'
  if (type === 'SAME_DAY') return 'local_shipping'
  return 'electric_moped'
}

/* ── MapRoute underlay ───────────────────────────────────────────── */
function MapRouteUnderlay() {
  return (
    <div className="absolute inset-0" style={{ background: '#e8f0e8' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="routeGrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#c8d8c8" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#routeGrid)" />
        {/* route line */}
        <polyline
          points="30,160 80,120 160,80 240,60 320,80 380,130"
          fill="none"
          stroke="#296b40"
          strokeWidth="3.5"
          strokeDasharray="8 4"
          strokeLinecap="round"
        />
        {/* pickup dot */}
        <circle cx="30" cy="160" r="7" fill="#003418" />
        {/* dropoff dot */}
        <circle cx="380" cy="130" r="7" fill="#296b40" stroke="#fff" strokeWidth="2" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-[#003418]/20 to-transparent" />
    </div>
  )
}

/* ── payment option data ──────────────────────────────────────────── */
const PAYMENT_OPTIONS: { method: PaymentMethod; label: string; sub: string; icon: string }[] = [
  { method: 'CARD', label: 'Card (Paystack)', sub: 'Visa / Mastercard', icon: 'credit_card' },
  { method: 'OPAY', label: 'Opay Wallet', sub: 'Instant debit', icon: 'account_balance_wallet' },
  { method: 'BANK_TRANSFER', label: 'Bank Transfer', sub: 'Pay via bank', icon: 'account_balance' },
  { method: 'CASH', label: 'Cash on Delivery', sub: 'Pay the rider', icon: 'payments' },
]

/* ── page ─────────────────────────────────────────────────────────── */
export default function BookConfirmPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  const {
    deliveryType,
    scheduledFor,
    pickupAddress,
    dropoffAddress,
    pickupLatitude,
    pickupLongitude,
    dropoffLatitude,
    dropoffLongitude,
    paymentMethod,
    estimatedPrice,
    estimatedDistance,
    estimatedEta,
    packageDescription,
    promoCode,
    setPaymentMethod,
    setPromoCode,
    clearBooking,
  } = useBookingStore()

  const setActiveOrder = useOrderStore((s) => s.setActiveOrder)

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(
    paymentMethod ?? 'CASH',
  )
  const [promoInput, setPromoInput] = useState(promoCode ?? '')
  const [promoOpen, setPromoOpen] = useState(false)
  const [promoStatus, setPromoStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [confirming, setConfirming] = useState(false)

  /* auth + flow guard — all hooks above this */
  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role === 'RIDER') { router.replace('/rider/home'); return }
    if (role === 'ADMIN') { router.replace('/admin/dashboard'); return }
    if (!deliveryType) { router.replace('/book/type'); return }
    if (!pickupAddress || !dropoffAddress) { router.replace('/book/address'); return }
  }, [isAuthenticated, role, deliveryType, pickupAddress, dropoffAddress, router])

  if (!isAuthenticated || !deliveryType || !pickupAddress || !dropoffAddress) return null

  /* price breakdown */
  const BASE_FARE = 300
  const PER_KM = 120
  const dist = estimatedDistance ?? 0
  const distCharge = Math.round(dist * PER_KM)
  const total = estimatedPrice ?? Math.round(BASE_FARE + distCharge)

  /* formatted scheduled display */
  let scheduledDisplay = ''
  if (deliveryType === 'SCHEDULED' && scheduledFor) {
    const d = new Date(scheduledFor)
    scheduledDisplay = d.toLocaleString('en-NG', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  /* handlers */
  function handleSelectPayment(m: PaymentMethod) {
    setSelectedPayment(m)
    setPaymentMethod(m)
  }

  function handleApplyPromo() {
    const code = promoInput.trim().toUpperCase()
    if (!code) return
    setPromoCode(code)
    // MVP: hardcoded valid codes
    if (code === 'LAUNCH50' || code === 'FAIRRIDE') {
      setPromoStatus('valid')
    } else {
      setPromoStatus('invalid')
    }
  }

  async function handleConfirm() {
    if (!selectedPayment) {
      toast.error('Please select a payment method')
      return
    }
    setConfirming(true)
    try {
      const payload = {
        pickupLatitude: pickupLatitude ?? 6.5244,
        pickupLongitude: pickupLongitude ?? 3.3792,
        pickupAddress: pickupAddress!,
        dropoffLatitude: dropoffLatitude ?? 6.4698,
        dropoffLongitude: dropoffLongitude ?? 3.5852,
        dropoffAddress: dropoffAddress!,
        deliveryType,
        paymentMethod: selectedPayment,
        scheduledFor: scheduledFor ?? undefined,
        packageDescription: packageDescription ?? undefined,
      }
      const { data } = await api.post('/orders', payload)
      setActiveOrder(data)
      clearBooking()
      router.replace(`/tracking/${data.id}/confirmed`)
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.message ?? 'Something went wrong'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <ScreenWrapper>
      {/* TopAppBar */}
      <header className="w-full sticky top-0 z-50 bg-[#f8faf4] flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/book/address')}
            className="text-[#003418] active:scale-95 duration-150"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
              arrow_back
            </span>
          </button>
          <div>
            <h1 className="font-['Manrope'] font-bold text-lg tracking-tight text-[#003418] leading-none">
              Confirm Order
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-0.5">
              Step 03 of 03
            </p>
          </div>
        </div>
        {/* step pills */}
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-4 rounded-full bg-primary/40" />
          <div className="h-2 w-4 rounded-full bg-primary/40" />
          <div className="h-2 w-8 rounded-full bg-primary" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow px-6 pt-4 pb-36 space-y-5 max-w-md mx-auto w-full">

        {/* Map Preview */}
        <section className="relative h-44 w-full rounded-xl overflow-hidden shadow-sm">
          <MapRouteUnderlay />
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
            <span
              className="material-symbols-outlined text-primary text-base"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
            >
              distance
            </span>
            <span className="text-xs font-semibold text-on-surface">
              {dist > 0 ? `${dist.toFixed(1)} km` : 'Calculating…'}
            </span>
          </div>
          {deliveryType === 'SCHEDULED' && scheduledDisplay && (
            <div className="absolute top-3 right-3 bg-primary text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Scheduled
            </div>
          )}
        </section>

        {/* Route Details */}
        <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
          <div className="relative pl-7 space-y-6">
            {/* Vertical Connector */}
            <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-outline-variant/40" />

            {/* Pickup */}
            <div className="relative">
              <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full border-2 border-primary bg-surface-container-lowest" />
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                Pickup
              </p>
              <p className="font-['Manrope'] font-bold text-on-surface text-sm leading-snug mt-0.5">
                {pickupAddress}
              </p>
            </div>

            {/* Drop-off */}
            <div className="relative">
              <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                Drop-off
              </p>
              <p className="font-['Manrope'] font-bold text-on-surface text-sm leading-snug mt-0.5">
                {dropoffAddress}
              </p>
            </div>
          </div>

          {/* ETA strip */}
          {estimatedEta != null && (
            <div className="mt-4 pt-4 border-t border-outline-variant/20 flex items-center gap-2">
              <span
                className="material-symbols-outlined text-primary text-base"
                style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
              >
                schedule
              </span>
              <span className="text-sm text-on-surface-variant">
                Estimated delivery time:{' '}
                <span className="font-bold text-on-surface">{estimatedEta} mins</span>
              </span>
            </div>
          )}
        </section>

        {/* Service + Package grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Delivery Type Card */}
          <div className="bg-surface-container-low rounded-xl p-4 flex flex-col justify-between aspect-square">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {deliveryIcon(deliveryType)}
              </span>
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                Service
              </p>
              <p className="font-['Manrope'] font-bold text-primary text-sm">
                {deliveryLabel(deliveryType)}
              </p>
              <p className="text-[11px] text-on-surface-variant leading-tight mt-0.5">
                {deliveryType === 'SCHEDULED' && scheduledDisplay
                  ? scheduledDisplay
                  : deliverySubtext(deliveryType)}
              </p>
            </div>
          </div>

          {/* Package Card */}
          <div className="bg-surface-container-low rounded-xl p-4 flex flex-col justify-between aspect-square">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                inventory_2
              </span>
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                Package
              </p>
              {packageDescription ? (
                <p className="font-['Manrope'] font-bold text-on-surface text-sm leading-tight">
                  {packageDescription.length > 40
                    ? packageDescription.slice(0, 40) + '…'
                    : packageDescription}
                </p>
              ) : (
                <p className="text-[11px] text-on-surface-variant italic leading-tight">
                  No description added
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <section className="bg-surface-container-low rounded-xl p-5 shadow-sm">
          <h3 className="font-['Manrope'] font-bold text-on-surface mb-4">Payment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-on-surface-variant">Base fare</span>
              <span className="text-sm font-medium text-on-surface">{fmt(BASE_FARE)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-on-surface-variant">
                Distance ({dist > 0 ? `${dist.toFixed(1)} km` : '—'})
              </span>
              <span className="text-sm font-medium text-on-surface">{fmt(distCharge)}</span>
            </div>
            {promoStatus === 'valid' && (
              <div className="flex justify-between items-center text-green-700">
                <span className="text-sm font-medium">Promo ({promoCode})</span>
                <span className="text-sm font-bold">-50%</span>
              </div>
            )}
            <div className="pt-3 mt-1 border-t border-outline-variant/20 flex justify-between items-center">
              <span className="font-['Manrope'] font-extrabold text-on-surface">Total</span>
              <span className="font-['Manrope'] font-extrabold text-xl text-primary">
                {promoStatus === 'valid' ? fmt(Math.round(total * 0.5)) : fmt(total)}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-3 leading-tight">
            Price may vary slightly based on actual route.
          </p>
        </section>

        {/* Payment Method */}
        <section>
          <h3 className="font-['Manrope'] font-bold text-on-surface mb-3 text-sm uppercase tracking-wider">
            Payment Method
          </h3>
          <div className="space-y-2.5">
            {PAYMENT_OPTIONS.map(({ method, label, sub, icon }) => {
              const selected = selectedPayment === method
              return (
                <button
                  key={method}
                  onClick={() => handleSelectPayment(method)}
                  className={[
                    'w-full flex items-center justify-between p-4 rounded-xl transition-all duration-150 active:scale-[0.98]',
                    selected
                      ? 'border-2 border-primary bg-primary/5 shadow-sm'
                      : 'border border-outline-variant/40 bg-surface-container-lowest',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-xl ${selected ? 'text-primary' : 'text-on-surface-variant'}`}
                      style={{ fontVariationSettings: selected ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {icon}
                    </span>
                    <div className="text-left">
                      <p className={`font-bold text-sm ${selected ? 'text-primary' : 'text-on-surface'}`}>
                        {label}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">{sub}</p>
                    </div>
                  </div>
                  {selected ? (
                    <span
                      className="material-symbols-outlined text-primary text-xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-outline-variant/60" />
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* Promo Code */}
        <section>
          <button
            onClick={() => setPromoOpen(!promoOpen)}
            className="w-full flex items-center justify-between py-3 text-sm font-bold text-primary active:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-base"
                style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
              >
                local_offer
              </span>
              Have a promo code?
            </div>
            <span
              className="material-symbols-outlined text-outline text-base transition-transform duration-200"
              style={{
                fontVariationSettings: "'FILL' 0",
                fontSize: '18px',
                transform: promoOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              expand_more
            </span>
          </button>

          {promoOpen && (
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value.toUpperCase())
                  setPromoStatus('idle')
                }}
                placeholder="Enter code"
                className="flex-1 px-4 py-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-sm font-medium uppercase tracking-wider focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={handleApplyPromo}
                className="px-5 py-3 bg-primary text-white rounded-xl text-sm font-bold active:opacity-80 transition-opacity"
              >
                Apply
              </button>
            </div>
          )}

          {promoStatus === 'valid' && (
            <p className="mt-2 text-xs font-bold text-green-700 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}>
                check_circle
              </span>
              {promoCode} applied — 50% off!
            </p>
          )}
          {promoStatus === 'invalid' && (
            <p className="mt-2 text-xs font-bold text-red-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}>
                cancel
              </span>
              Invalid or expired code
            </p>
          )}
        </section>
      </main>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 w-full p-5 glass-nav rounded-t-2xl z-40">
        <div className="max-w-md mx-auto space-y-3">
          {/* Rider availability hint */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              {/* rider avatar stubs */}
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full bg-primary/20 border-2 border-white flex items-center justify-center"
                  style={{ marginLeft: i > 0 ? '-8px' : '0' }}
                >
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 1", fontSize: '14px' }}
                  >
                    person
                  </span>
                </div>
              ))}
              <span className="text-[11px] text-on-surface-variant font-medium ml-1">
                3 riders nearby
              </span>
            </div>
            <div className="h-3 w-px bg-outline-variant/40" />
            <span className="text-[11px] text-on-surface-variant font-medium">
              Est. wait: <span className="font-bold text-on-surface">5–10 mins</span>
            </span>
          </div>

          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full py-4 rounded-xl font-['Manrope'] font-bold text-lg shadow-[0_8px_30px_rgb(0,52,24,0.2)] active:opacity-80 transition-all hover:scale-[1.01] disabled:opacity-60 disabled:scale-100 text-white"
            style={{
              background: confirming
                ? '#296b40'
                : 'linear-gradient(135deg, #003418 0%, #296b40 100%)',
            }}
          >
            {confirming ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full inline-block animate-spin" />
                Finding your rider…
              </span>
            ) : (
              'Confirm & Book'
            )}
          </button>

          <p className="text-center text-[10px] text-on-surface-variant px-4 leading-tight">
            By confirming, you agree to our Terms of Service and Privacy Policy regarding courier operations.
          </p>
        </div>
      </div>
    </ScreenWrapper>
  )
}
