/**
 * @page RiderHistoryPage
 * @description Rider delivery history with date filter and trip detail cards.
 * @route /rider/history
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import BottomNav from '@/components/ui/BottomNav'
import api from '@/lib/api'

type FilterTab = 'All' | 'Completed' | 'Cancelled'

interface TripRecord {
  id: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  fare: number
  commission: number
  net: number
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  DELIVERED_CONFIRMED: 'bg-primary-fixed text-on-primary-fixed',
  CANCELLED: 'bg-error-container text-on-error-container',
  DISPUTED: 'bg-tertiary-fixed text-on-tertiary-fixed',
}

const BORDER_COLORS: Record<string, string> = {
  DELIVERED_CONFIRMED: 'border-l-primary',
  CANCELLED: 'border-l-error',
  DISPUTED: 'border-l-tertiary',
}

export default function RiderHistoryPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  const [tab, setTab] = useState<FilterTab>('All')
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
  }, [isAuthenticated, role, router])

  useEffect(() => {
    if (!isAuthenticated || role !== 'RIDER') return
    api.get('/riders/me/trips')
      .then(({ data }) => setTrips(data ?? []))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false))
  }, [isAuthenticated, role])

  const filtered = trips.filter((t) => {
    if (tab === 'All') return true
    if (tab === 'Completed') return t.status === 'DELIVERED_CONFIRMED'
    if (tab === 'Cancelled') return t.status === 'CANCELLED'
    return true
  })

  return (
    <ScreenWrapper>
      <header className="bg-white/80 backdrop-blur-md shadow-sm shadow-emerald-900/5 sticky top-0 z-50 flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-emerald-900 cursor-pointer">menu</span>
          <h1 className="font-headline font-extrabold text-emerald-900 text-lg tracking-tight">Trip History</h1>
        </div>
        <span className="material-symbols-outlined text-emerald-900">account_circle</span>
      </header>

      <main className="pt-6 pb-28 px-4 max-w-lg mx-auto">
        <div className="mb-6 px-2">
          <h2 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight mb-1">Trip History</h2>
          <p className="font-body text-on-surface-variant">Detailed record of your service cycles.</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(['All', 'Completed', 'Cancelled'] as FilterTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full font-label font-semibold text-sm transition-all active:scale-95 whitespace-nowrap ${
                tab === t
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'bg-surface-container-low text-on-surface-variant'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined text-primary animate-spin text-4xl">progress_activity</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant">history</span>
            <p className="font-body text-on-surface-variant">No {tab.toLowerCase()} trips yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((trip) => (
              <div
                key={trip.id}
                className={`bg-surface-container-lowest rounded-xl p-5 shadow-sm border-l-4 ${BORDER_COLORS[trip.status] ?? 'border-l-outline-variant'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-0.5">
                      Trip #{trip.id.slice(-6).toUpperCase()}
                    </p>
                    <p className="text-sm text-on-surface-variant font-body">
                      {new Date(trip.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${STATUS_COLORS[trip.status] ?? 'bg-surface-container-low text-on-surface-variant'}`}>
                    {trip.status === 'DELIVERED_CONFIRMED' ? 'Completed' : trip.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-base mt-0.5">location_on</span>
                    <div>
                      <p className="text-[10px] uppercase text-on-surface-variant font-semibold">Pickup</p>
                      <p className="text-sm font-body font-medium text-on-surface line-clamp-1">{trip.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="w-px h-3 bg-outline-variant ml-[9px]" />
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-secondary text-base mt-0.5">flag</span>
                    <div>
                      <p className="text-[10px] uppercase text-on-surface-variant font-semibold">Drop-off</p>
                      <p className="text-sm font-body font-medium text-on-surface line-clamp-1">{trip.dropoffAddress}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-4 border-t border-surface-container-low">
                  <div className="space-y-0.5">
                    <div className="flex gap-3 text-xs text-on-surface-variant">
                      <span>Fare: ₦{trip.fare.toLocaleString()}</span>
                      <span>Commission: ₦{trip.commission.toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] uppercase text-on-surface-variant font-bold">Net Earned</p>
                    <p className={`font-headline font-extrabold text-xl ${trip.status === 'CANCELLED' ? 'text-error' : 'text-primary'}`}>
                      ₦{trip.net.toLocaleString()}
                    </p>
                  </div>
                  <button className="p-2 bg-surface-container-low rounded-lg">
                    <span className="material-symbols-outlined text-primary">chevron_right</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </ScreenWrapper>
  )
}
