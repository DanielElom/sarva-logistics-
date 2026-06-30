/**
 * @page UserHomePage
 * @description Customer home — booking entry point with address search and delivery type selector.
 * @route /home
 */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import BottomNav from '@/components/ui/BottomNav'
import StatusBadge from '@/components/ui/StatusBadge'
import NavigationDrawer from '@/components/layout/NavigationDrawer'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

interface Order {
  id: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  finalPrice: string | number
}

function getGreeting(name: string | null): string {
  const h = new Date().getHours()
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  const first = name?.split(' ')[0] ?? 'there'
  return `Good ${part}, ${first}`
}

export default function HomePage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  const [orders, setOrders] = useState<Order[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role === 'RIDER') { router.replace('/rider/home'); return }
    if (role === 'ADMIN') { router.replace('/admin/dashboard'); return }
    if (['VENDOR', 'RESTAURANT', 'CORPORATE'].includes(role ?? '')) {
      router.replace('/business/dashboard'); return
    }
  }, [isAuthenticated, role, router])

  // Fetch data
  useEffect(() => {
    if (!isAuthenticated || role === 'RIDER' || role === 'ADMIN' || ['VENDOR','RESTAURANT','CORPORATE'].includes(role ?? '')) return
    Promise.all([
      api.get('/orders?page=1&limit=3'),
      api.get('/notifications/unread-count'),
    ])
      .then(([ordersRes, countRes]) => {
        setOrders(ordersRes.data.data ?? [])
        setUnreadCount(countRes.data.count ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoadingOrders(false))
  }, [isAuthenticated, role])

  if (!isAuthenticated || role === 'RIDER' || role === 'ADMIN' || ['VENDOR','RESTAURANT','CORPORATE'].includes(role ?? '')) return null

  return (
    <ScreenWrapper>
      {/* ── Fixed Header ── */}
      <header className="fixed top-0 w-full max-w-107.5 z-50 flex justify-between items-center px-6 py-4 bg-[#f8faf4]/80 backdrop-blur-lg shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 text-primary hover:bg-surface-container-high rounded-full active:scale-95 transition-transform"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>menu</span>
          </button>
          <span className="font-headline font-black text-xl text-primary tracking-tight">Fair-Ride</span>
        </div>

        <button
          onClick={() => router.push('/notifications')}
          className="relative p-2 text-primary hover:bg-surface-container-high rounded-full active:scale-95 transition-transform"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-error text-on-error text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* ── Map Canvas ── */}
      <main className="relative h-screen w-full overflow-hidden">
        {/* Map background */}
        <div className="absolute inset-0 z-0">
          {MAPS_KEY ? (
            <iframe
              title="Google Maps"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://www.google.com/maps/embed/v1/view?key=${MAPS_KEY}&center=6.5244,3.3792&zoom=14`}
            />
          ) : (
            <MapPlaceholder />
          )}
        </div>

        {/* Gradient scrim — heavier at bottom for panel contrast */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(248,250,244,0.15) 0%, transparent 30%, rgba(248,250,244,0.65) 70%, rgba(248,250,244,0.90) 100%)',
          }}
        />

        {/* Center pin — positioned at 33% so it's above the bottom panel */}
        <div className="absolute top-[33%] inset-x-0 z-[2] flex flex-col items-center pointer-events-none">
          <div className="mb-3 px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-outline-variant/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest">
              Auto-detecting location
            </span>
          </div>
          <div className="relative">
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-on-surface/20 blur-sm rounded-full" />
            <span
              className="material-symbols-outlined text-primary drop-shadow-md"
              style={{ fontSize: '48px', fontVariationSettings: "'FILL' 1" }}
            >
              location_on
            </span>
          </div>
        </div>

        {/* ── Bottom Floating Panel ── */}
        <div className="absolute inset-x-0 bottom-0 z-[20] px-4 pb-24 flex flex-col gap-3">

          {/* Greeting pill */}
          <div className="flex items-center">
            <div className="px-4 py-2 bg-white/85 backdrop-blur-md rounded-full shadow-sm border border-white/30 flex items-center gap-2">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
              >
                waving_hand
              </span>
              <span className="text-sm font-bold text-on-surface">
                {getGreeting(user?.name ?? null)}
              </span>
            </div>
          </div>

          {/* Recent orders card */}
          <div className="w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,52,24,0.12)] border border-white/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                Recent Deliveries
              </span>
              {orders.length > 0 && (
                <button
                  onClick={() => router.push('/history')}
                  className="text-[11px] font-bold text-primary active:opacity-60 transition-opacity"
                >
                  See all
                </button>
              )}
            </div>

            {loadingOrders ? (
              <div className="px-4 pb-3 flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-on-surface-variant"
                  style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}
                >
                  progress_activity
                </span>
                <span className="text-xs text-on-surface-variant">Loading…</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="px-4 pb-4 pt-1 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-on-surface-variant"
                    style={{ fontSize: '18px' }}
                  >
                    package_2
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant leading-snug">
                  No deliveries yet. Book your first one!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/20">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => router.push(`/receipt/${order.id}`)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 active:bg-surface-container transition-colors text-left"
                  >
                    <StatusBadge status={order.status} />
                    <p className="min-w-0 flex-1 text-xs text-on-surface-variant truncate">
                      {order.pickupAddress} → {order.dropoffAddress}
                    </p>
                    <span className="text-xs font-bold text-on-surface shrink-0">
                      ₦{Number(order.finalPrice).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="w-full bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-[0_24px_48px_rgba(0,52,24,0.12)] border border-white/40 flex items-center">
            <div className="pl-4 pr-2 text-primary">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
            </div>
            <input
              readOnly
              onClick={() => router.push('/book/address')}
              className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface-variant font-medium placeholder:text-on-surface-variant/60 text-base py-3 cursor-pointer"
              placeholder="Where to deliver?"
            />
          </div>

          {/* Book Delivery CTA — the most important button */}
          <button
            onClick={() => router.push('/book/type')}
            className="w-full py-5 rounded-[1.5rem] font-headline font-extrabold text-lg text-on-primary shadow-[0_12px_32px_rgba(0,77,38,0.30)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 editorial-gradient"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>two_wheeler</span>
            BOOK NEW DELIVERY
          </button>
        </div>
      </main>

      <BottomNav />
      <NavigationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }
      `}</style>
    </ScreenWrapper>
  )
}

/* ── Map Placeholder ── */
function MapPlaceholder() {
  return (
    <div className="relative w-full h-full" style={{ backgroundColor: '#e8f0e8' }}>
      {/* Street grid via SVG patterns */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="grid-minor" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#c5d4c5" strokeWidth="0.8" />
          </pattern>
          <pattern id="grid-major" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M 120 0 L 0 0 0 120" fill="none" stroke="#adc4ad" strokeWidth="2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-minor)" />
        <rect width="100%" height="100%" fill="url(#grid-major)" />
        {/* Horizontal roads */}
        <rect y="22%" width="100%" height="10" fill="#b8ccb8" opacity="0.95" />
        <rect y="50%" width="100%" height="14" fill="#b0c4b0" opacity="0.95" />
        <rect y="75%" width="100%" height="10" fill="#b8ccb8" opacity="0.95" />
        {/* Vertical roads */}
        <rect x="18%" y="0" width="10" height="100%" fill="#b8ccb8" opacity="0.95" />
        <rect x="50%" y="0" width="14" height="100%" fill="#b0c4b0" opacity="0.95" />
        <rect x="80%" y="0" width="10" height="100%" fill="#b8ccb8" opacity="0.95" />
        {/* City blocks */}
        <rect x="2%" y="2%" width="15%" height="18%" fill="#d4e4d4" rx="3" opacity="0.7" />
        <rect x="28%" y="2%" width="20%" height="18%" fill="#cce0cc" rx="3" opacity="0.7" />
        <rect x="60%" y="2%" width="18%" height="18%" fill="#d4e4d4" rx="3" opacity="0.7" />
        <rect x="2%" y="26%" width="14%" height="22%" fill="#cce0cc" rx="3" opacity="0.7" />
        <rect x="28%" y="26%" width="20%" height="22%" fill="#d8e8d8" rx="3" opacity="0.7" />
        <rect x="60%" y="26%" width="18%" height="22%" fill="#cce0cc" rx="3" opacity="0.7" />
        <rect x="2%" y="54%" width="14%" height="19%" fill="#d4e4d4" rx="3" opacity="0.7" />
        <rect x="28%" y="54%" width="20%" height="19%" fill="#cce0cc" rx="3" opacity="0.7" />
        <rect x="60%" y="54%" width="18%" height="19%" fill="#d4e4d4" rx="3" opacity="0.7" />
      </svg>
    </div>
  )
}
