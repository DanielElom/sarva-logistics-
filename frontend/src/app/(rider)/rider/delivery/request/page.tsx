/**
 * @page DeliveryRequestPage
 * @description Incoming job request card with pickup/dropoff details, fare, and accept/decline buttons.
 * @route /rider/delivery/request
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import api from '@/lib/api'

interface JobRequest {
  orderId: string
  pickupAddress?: string
  dropoffAddress?: string
  estimatedPayout?: number
  estimatedFare?: number
  estimatedDistance?: string
  estimatedTime?: string
  distanceKm?: number
  paymentMethod?: string
  isPremium?: boolean
}

const COUNTDOWN_SECONDS = 30

export default function DeliveryRequestPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  const [job, setJob] = useState<JobRequest | null>(null)
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS)
  const [responding, setResponding] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }

    const stored = localStorage.getItem('rider-active-job')
    if (!stored) { router.replace('/rider/home'); return }

    try {
      setJob(JSON.parse(stored))
    } catch {
      router.replace('/rider/home')
    }
  }, [isAuthenticated, role, router])

  useEffect(() => {
    if (!job) return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          handleDecline()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job])

  async function handleAccept() {
    if (!job || responding) return
    clearInterval(timerRef.current!)
    setResponding(true)
    try {
      await api.post('/matching/accept', { orderId: job.orderId })
      localStorage.setItem('rider-active-order', JSON.stringify({ ...job }))
      router.replace('/rider/delivery/navigate')
    } catch {
      setResponding(false)
    }
  }

  async function handleDecline() {
    if (!job || responding) return
    clearInterval(timerRef.current!)
    setResponding(true)
    try {
      await api.post('/matching/reject', { orderId: job.orderId })
    } catch {
      // proceed anyway
    }
    localStorage.removeItem('rider-active-job')
    router.replace('/rider/home')
  }

  const progress = (timeLeft / COUNTDOWN_SECONDS) * 100
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (progress / 100) * circumference

  if (!job) return null

  // Derive safe display values after the null guard — avoids TS strict-null errors in JSX
  const displayPayout = (job.estimatedPayout ?? job.estimatedFare ?? 0).toLocaleString()
  const displayTime = job.estimatedTime ?? '—'
  const displayDistance = job.estimatedDistance ?? (job.distanceKm != null ? `${job.distanceKm.toFixed(1)} km` : '—')
  const displayPickup = job.pickupAddress ?? 'Pickup location'
  const displayDropoff = job.dropoffAddress ?? 'Dropoff location'

  return (
    <ScreenWrapper className="bg-surface">
      {/* Map background */}
      <div className="fixed inset-0 z-0 bg-surface-container-low">
        <div className="w-full h-full flex items-center justify-center opacity-10">
          <span className="material-symbols-outlined text-[200px] text-primary">map</span>
        </div>
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Modal backdrop */}
      <div className="fixed inset-0 z-[100] flex items-end justify-center pb-0">
        <div className="w-full max-w-lg bg-surface-container-lowest rounded-t-3xl shadow-2xl">
          {/* Countdown ring */}
          <div className="flex justify-center pt-8 pb-2">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" width="128" height="128">
                <circle
                  cx="64" cy="64" r={radius}
                  fill="none"
                  stroke="#e0e3dd"
                  strokeWidth="8"
                />
                <circle
                  cx="64" cy="64" r={radius}
                  fill="none"
                  stroke="#003418"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="text-center z-10">
                <p className="font-headline font-extrabold text-3xl text-primary">{timeLeft}</p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">secs</p>
              </div>
            </div>
          </div>

          <div className="px-6 pb-2">
            <div className="text-center mb-6">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                New Delivery Request
              </p>
              <h2 className="font-headline font-extrabold text-2xl text-on-surface">
                Incoming Order
              </h2>
            </div>

            {/* Payout + Time bento */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-surface-container-low rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                  Est. Payout
                </p>
                <p className="font-headline font-extrabold text-xl text-primary">
                  ₦{displayPayout}
                </p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                  Est. Time
                </p>
                <p className="font-headline font-extrabold text-xl text-on-surface">
                  {displayTime}
                </p>
              </div>
            </div>

            {/* Route visual */}
            <div className="bg-surface-container-low rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center pt-1">
                  <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary" />
                  <div className="w-0.5 h-10 bg-outline-variant my-1" />
                  <div className="w-3 h-3 rounded-full bg-error border-2 border-error" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-[10px] uppercase text-on-surface-variant font-bold">Pickup</p>
                    <p className="text-sm font-medium text-on-surface line-clamp-1">{displayPickup}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-on-surface-variant font-bold">Dropoff</p>
                    <p className="text-sm font-medium text-on-surface line-clamp-1">{displayDropoff}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-outline-variant/30">
                <p className="text-xs text-on-surface-variant">Distance: {displayDistance}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-10">
              <button
                onClick={handleDecline}
                disabled={responding}
                className="flex-1 h-14 bg-error-container text-on-error-container font-headline font-bold rounded-xl active:scale-95 transition-all disabled:opacity-60"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                disabled={responding}
                className="flex-[2] h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-60"
              >
                {responding ? 'Accepting…' : 'Accept Job'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ScreenWrapper>
  )
}
