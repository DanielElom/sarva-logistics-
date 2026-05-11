/**
 * @page DeliveryCompletePage
 * @description Delivery completion screen — 4-digit security code entry with recipient hint.
 * @route /rider/delivery/complete
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import api from '@/lib/api'

interface ActiveOrder {
  orderId: string
  dropoffAddress: string
  customerName?: string
  estimatedPayout?: number
}

export default function CompleteDeliveryPage() {
  const router = useRouter()
  const { isAuthenticated, role } = useAuthStore((s) => ({
    isAuthenticated: s.isAuthenticated,
    role: s.role,
  }))

  const [order, setOrder] = useState<ActiveOrder | null>(null)
  const [code, setCode] = useState(['', '', '', ''])
  const [photo, setPhoto] = useState<string | null>(null)
  const [delivering, setDelivering] = useState(false)
  const [error, setError] = useState('')
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
    const stored = localStorage.getItem('rider-active-order')
    if (!stored) { router.replace('/rider/home'); return }
    try { setOrder(JSON.parse(stored)) } catch { router.replace('/rider/home') }
  }, [isAuthenticated, role, router])

  function handleCodeInput(i: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[i] = digit
    setCode(next)
    if (digit && i < 3) inputRefs[i + 1].current?.focus()
  }

  function handleCodeKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputRefs[i - 1].current?.focus()
    }
  }

  async function handleDeliver() {
    if (!order || delivering) return
    const fullCode = code.join('')
    if (fullCode.length < 4) { setError('Enter the 4-digit delivery code.'); return }
    setError('')
    setDelivering(true)
    try {
      await api.patch(`/matching/orders/${order.orderId}/status`, {
        status: 'DELIVERED_REQUESTED',
        deliveryCode: fullCode,
        ...(photo ? { photoProof: photo } : {}),
      })
      localStorage.setItem('rider-last-order', JSON.stringify(order))
      router.replace('/rider/delivery/success')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? 'Delivery failed. Check the code and try again.')
      setDelivering(false)
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result as string)
    reader.readAsDataURL(file)
  }

  if (!order) return null

  return (
    <ScreenWrapper>
      {/* Header */}
      <header className="bg-primary px-6 py-8">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => router.back()} className="text-on-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-on-primary/70 font-bold mb-1">Complete Delivery</p>
        <h1 className="font-headline font-extrabold text-2xl text-on-primary">
          Order #{order.orderId.slice(-6).toUpperCase()}
        </h1>
      </header>

      <main className="pb-12 px-6 max-w-lg mx-auto space-y-6 pt-6">
        {/* Recipient card */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-3">Recipient</p>
          <div className="flex items-start gap-3 mb-3">
            <span className="material-symbols-outlined text-primary mt-0.5">location_on</span>
            <div>
              <p className="text-sm font-medium text-on-surface">{order.dropoffAddress}</p>
            </div>
          </div>
          {order.customerName && (
            <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/20">
              <div className="w-9 h-9 bg-surface-container-low rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant">person</span>
              </div>
              <p className="text-sm font-medium text-on-surface">{order.customerName}</p>
            </div>
          )}
        </div>

        {/* 4-digit OTP */}
        <div className="space-y-3">
          <h2 className="font-headline font-bold text-on-surface px-1">Delivery Code</h2>
          <div className="flex gap-3 justify-center">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={inputRefs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeInput(i, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(i, e)}
                className="w-16 h-16 text-center text-2xl font-headline font-extrabold bg-surface-container-low rounded-xl border-2 border-outline-variant focus:border-primary focus:ring-0 text-on-surface transition-colors"
              />
            ))}
          </div>
          <p className="text-sm text-on-surface-variant italic text-center mt-2">Ask the recipient for the 4-digit security code</p>
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

        {error && <p className="text-error text-sm font-body text-center">{error}</p>}

        <button
          onClick={handleDeliver}
          disabled={delivering || code.join('').length < 4}
          className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all duration-150 disabled:opacity-40"
        >
          {delivering ? 'Processing…' : 'Mark as Delivered'}
        </button>

        <button
          onClick={() => router.push('/shared/support')}
          className="w-full text-center text-sm font-body text-on-surface-variant"
        >
          Report an Issue
        </button>
      </main>
    </ScreenWrapper>
  )
}
