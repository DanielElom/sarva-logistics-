/**
 * @page VerifyDeliveryPage
 * @description Rider enters or captures the 4-digit delivery verification code from recipient.
 * @route /rider/delivery/verify
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import api from '@/lib/api'

interface ActiveOrder {
  orderId: string
  pickupAddress: string
  dropoffAddress: string
  estimatedPayout: number
  customerName?: string
}

const CHECKLIST = [
  'Package is sealed and intact',
  'Package matches order details',
  'Correct quantity / items',
  'Fragile items handled properly',
]

export default function VerifyPickupPage() {
  const router = useRouter()
  const { isAuthenticated, role } = useAuthStore((s) => ({
    isAuthenticated: s.isAuthenticated,
    role: s.role,
  }))

  const [order, setOrder] = useState<ActiveOrder | null>(null)
  const [checked, setChecked] = useState<boolean[]>(new Array(CHECKLIST.length).fill(false))
  const [photo, setPhoto] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
    const stored = localStorage.getItem('rider-active-order')
    if (!stored) { router.replace('/rider/home'); return }
    try { setOrder(JSON.parse(stored)) } catch { router.replace('/rider/home') }
  }, [isAuthenticated, role, router])

  function toggleCheck(i: number) {
    setChecked((prev) => { const n = [...prev]; n[i] = !n[i]; return n })
  }

  async function handlePickedUp() {
    if (!order || picking) return
    setPicking(true)
    try {
      await api.patch(`/matching/orders/${order.orderId}/status`, { status: 'PICKED_UP', ...(photo ? { photoProof: photo } : {}) })
    } catch {
      // proceed
    }
    router.replace('/rider/delivery/transit')
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result as string)
    reader.readAsDataURL(file)
  }

  const allChecked = checked.every(Boolean)

  if (!order) return null

  return (
    <ScreenWrapper>
      <header className="bg-emerald-950/80 backdrop-blur-lg shadow-xl shadow-emerald-950/20 sticky top-0 z-50">
        <div className="flex items-center gap-4 px-6 h-16">
          <button onClick={() => router.back()} className="text-emerald-50">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-extrabold tracking-tighter text-emerald-50 font-headline">Verify Pickup</h1>
        </div>
      </header>

      <main className="pt-6 pb-12 px-6 max-w-lg mx-auto space-y-6">
        {/* Order header */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Order</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
            </div>
            <div>
              <p className="font-headline font-bold text-on-surface">
                {order.customerName ?? 'Package'}
              </p>
              <p className="text-xs text-on-surface-variant">Payout: ₦{order.estimatedPayout?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-3">
          <h2 className="font-headline font-bold text-on-surface px-1">Package Checklist</h2>
          {CHECKLIST.map((item, i) => (
            <button
              key={item}
              onClick={() => toggleCheck(i)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                checked[i]
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant/30 bg-surface-container-lowest'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  checked[i] ? 'border-primary bg-primary' : 'border-outline-variant'
                }`}
              >
                {checked[i] && (
                  <span className="material-symbols-outlined text-on-primary text-sm" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>check</span>
                )}
              </div>
              <span className={`font-body text-sm ${checked[i] ? 'text-primary font-semibold' : 'text-on-surface'}`}>
                {item}
              </span>
            </button>
          ))}
        </div>

        {/* Photo proof */}
        <div className="space-y-2">
          <h2 className="font-headline font-bold text-on-surface px-1">
            Photo Proof <span className="text-on-surface-variant font-normal text-sm">(optional)</span>
          </h2>
          <button
            onClick={() => photoRef.current?.click()}
            className={`w-full p-5 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-colors ${
              photo ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'
            }`}
          >
            {photo ? (
              <img src={photo} alt="Proof" className="w-full h-32 object-cover rounded-lg" />
            ) : (
              <>
                <span className="material-symbols-outlined text-3xl text-on-surface-variant">add_a_photo</span>
                <span className="text-sm text-on-surface-variant font-body">Tap to add photo</span>
              </>
            )}
          </button>
          <input ref={photoRef} type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
        </div>

        <button
          onClick={handlePickedUp}
          disabled={!allChecked || picking}
          className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all duration-150 disabled:opacity-40"
        >
          {picking ? 'Updating…' : allChecked ? 'Package Picked Up' : `Check all items (${checked.filter(Boolean).length}/${CHECKLIST.length})`}
        </button>
      </main>
    </ScreenWrapper>
  )
}
