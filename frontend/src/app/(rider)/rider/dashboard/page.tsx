/**
 * @page RiderDashboardPage
 * @description Rider performance dashboard — earnings, trips completed, rating, and support card.
 * @route /rider/dashboard
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import BottomNav from '@/components/ui/BottomNav'
import api from '@/lib/api'

interface RiderProfile {
  name: string
  rating: number
  acceptanceRate: number
  completionRate: number
  totalTrips: number
  todayEarnings: number
  weekEarnings: number
  activeOrder?: {
    id: string
    status: string
    pickupAddress: string
    dropoffAddress: string
  } | null
}

export default function RiderDashboardPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  const [profile, setProfile] = useState<RiderProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
  }, [isAuthenticated, role, router])

  useEffect(() => {
    if (!isAuthenticated || role !== 'RIDER') return
    api.get('/riders/me/profile')
      .then(({ data }) => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isAuthenticated, role])

  if (loading) {
    return (
      <ScreenWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <span className="material-symbols-outlined text-primary animate-spin text-4xl">progress_activity</span>
        </div>
      </ScreenWrapper>
    )
  }

  const statusColor: Record<string, string> = {
    EN_ROUTE_TO_PICKUP: 'bg-primary-fixed text-on-primary-fixed',
    IN_TRANSIT: 'bg-primary text-on-primary',
    ARRIVED_AT_PICKUP: 'bg-secondary-container text-on-secondary-container',
  }

  function resumeDelivery() {
    const active = profile?.activeOrder
    if (!active) return
    const statusRoutes: Record<string, string> = {
      EN_ROUTE_TO_PICKUP: '/rider/delivery/navigate-pickup',
      ARRIVED_AT_PICKUP: '/rider/delivery/arrived',
      PICKED_UP: '/rider/delivery/verify',
      IN_TRANSIT: '/rider/delivery/in-transit',
      ARRIVED_AT_DELIVERY: '/rider/delivery/complete',
    }
    router.push(statusRoutes[active.status] ?? '/rider/home')
  }

  return (
    <ScreenWrapper>
      <header className="bg-emerald-950/80 backdrop-blur-lg shadow-xl shadow-emerald-950/20 sticky top-0 z-50">
        <div className="flex justify-between items-center px-6 h-16">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/rider/home')} className="text-emerald-50">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-lg font-extrabold tracking-tighter text-emerald-50 font-headline">
              Dashboard
            </h1>
          </div>
        </div>
      </header>

      <main className="pt-6 pb-28 px-6 max-w-lg mx-auto space-y-6">
        {profile?.activeOrder && (
          <div
            className="relative rounded-2xl overflow-hidden shadow-xl cursor-pointer"
            onClick={resumeDelivery}
          >
            <div className="absolute inset-0 bg-primary-container opacity-90" />
            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
                  Active Delivery
                </span>
                <span
                  className={`text-[10px] font-bold px-3 py-1 rounded-full ${statusColor[profile.activeOrder.status] ?? 'bg-primary text-on-primary'}`}
                >
                  {profile.activeOrder.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-on-primary-container text-sm mt-0.5">location_on</span>
                  <p className="text-sm text-on-primary-container font-medium line-clamp-1">
                    {profile.activeOrder.pickupAddress}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-on-primary-container text-sm mt-0.5">flag</span>
                  <p className="text-sm text-on-primary-container font-medium line-clamp-1">
                    {profile.activeOrder.dropoffAddress}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-on-primary-container">
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                <span className="text-xs font-bold">Resume Delivery</span>
              </div>
            </div>
          </div>
        )}

        {/* Earnings card */}
        <div className="bg-primary rounded-2xl p-6 shadow-xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-[80px] text-on-primary">payments</span>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-widest text-on-primary/70 font-bold mb-1">
              Today&apos;s Earnings
            </p>
            <h2 className="font-headline font-extrabold text-4xl text-on-primary mb-4">
              ₦{(profile?.todayEarnings ?? 0).toLocaleString()}
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-on-primary/60">This Week</p>
                <p className="font-bold text-on-primary">₦{(profile?.weekEarnings ?? 0).toLocaleString()}</p>
              </div>
              <button
                onClick={() => router.push('/rider/earnings')}
                className="px-4 py-2 bg-white/20 text-on-primary font-bold text-sm rounded-xl backdrop-blur-sm active:scale-95 transition-all"
              >
                Cash Out
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-on-primary/80">
                12 Deliveries
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-on-primary/80">
                6.5 hrs active
              </span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Total Trips', value: profile?.totalTrips ?? 0, icon: 'local_shipping' },
            { label: 'Rating', value: `${(profile?.rating ?? 5).toFixed(1)} ★`, icon: 'star' },
          ].map((s) => (
            <div key={s.label} className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-primary">{s.icon}</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                {s.label}
              </p>
              <p className="font-headline font-extrabold text-2xl text-on-surface mt-1">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Performance */}
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
          <h3 className="font-headline font-bold text-on-surface mb-4">Performance</h3>
          {[
            { label: 'Acceptance Rate', value: profile?.acceptanceRate ?? 95 },
            { label: 'Completion Rate', value: profile?.completionRate ?? 98 },
          ].map((p) => (
            <div key={p.label} className="mb-4 last:mb-0">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-body text-on-surface-variant">{p.label}</span>
                <span className="text-sm font-bold text-primary">{p.value}%</span>
              </div>
              <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${p.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: 'history', label: 'History', href: '/rider/history' },
            { icon: 'payments', label: 'Earnings', href: '/rider/earnings' },
            { icon: 'settings', label: 'Settings', href: '/rider/settings' },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => router.push(a.href)}
              className="bg-surface-container-lowest rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-primary">{a.icon}</span>
              <span className="text-xs font-bold text-on-surface-variant">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Support card */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-secondary-container">support_agent</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline font-bold text-on-surface text-sm">Need Help?</p>
            <p className="text-xs text-on-surface-variant">Talk to our support team 24/7</p>
          </div>
          <button
            onClick={() => router.push('/shared/support')}
            className="px-4 py-2 bg-surface-container-high text-on-surface font-bold text-xs rounded-full active:scale-95 transition-all"
          >
            Contact
          </button>
        </div>
      </main>

      <BottomNav />
    </ScreenWrapper>
  )
}
