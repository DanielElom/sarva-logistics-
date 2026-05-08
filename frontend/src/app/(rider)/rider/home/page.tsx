'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import BottomNav from '@/components/ui/BottomNav'
import api from '@/lib/api'
import { io, Socket } from 'socket.io-client'

interface JobRequest {
  orderId: string
  pickupAddress: string
  dropoffAddress: string
  estimatedPayout: number
  estimatedDistance: string
  estimatedTime: string
}

interface RiderStats {
  todayEarnings: number
  todayTrips: number
  isOnline: boolean
}

export default function RiderHomePage() {
  const router = useRouter()
  const { isAuthenticated, role, token } = useAuthStore((s) => ({
    isAuthenticated: s.isAuthenticated,
    role: s.role,
    token: s.token,
  }))

  const [isOnline, setIsOnline] = useState(false)
  const [stats, setStats] = useState<RiderStats>({ todayEarnings: 0, todayTrips: 0, isOnline: false })
  const [toggling, setToggling] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
  }, [isAuthenticated, role, router])

  useEffect(() => {
    if (!isAuthenticated || role !== 'RIDER') return

    api.get('/riders/me/profile')
      .then(({ data }) => {
        setIsOnline(data.isOnline ?? false)
        setStats({
          todayEarnings: data.todayEarnings ?? 0,
          todayTrips: data.todayTrips ?? 0,
          isOnline: data.isOnline ?? false,
        })

        if (data.verificationStatus !== 'APPROVED') {
          router.replace('/status/under-review')
        }
      })
      .catch(() => {})
  }, [isAuthenticated, role, router])

  useEffect(() => {
    if (!token || !isAuthenticated || role !== 'RIDER') return

    const socket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('job_request', (data: JobRequest) => {
      localStorage.setItem('rider-active-job', JSON.stringify(data))
      router.push('/rider/delivery/request')
    })

    return () => { socket.disconnect() }
  }, [token, isAuthenticated, role, router])

  async function toggleOnline() {
    setToggling(true)
    const next = !isOnline
    try {
      await api.patch('/riders/me/status', { isOnline: next })
      setIsOnline(next)
    } catch {
      // revert on failure
    } finally {
      setToggling(false)
    }
  }

  return (
    <ScreenWrapper className="bg-surface">
      {/* Map background */}
      <div className="fixed inset-0 z-0 bg-surface-container-low">
        <div className="w-full h-full flex items-center justify-center opacity-20">
          <span className="material-symbols-outlined text-[200px] text-primary">map</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface/60" />
      </div>

      {/* Hamburger button */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed top-6 left-4 z-50 w-10 h-10 bg-surface-container-lowest/90 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center border border-outline-variant/20 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-on-surface">menu</span>
      </button>

      {/* Online/Offline toggle pill */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={toggleOnline}
          disabled={toggling}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-headline font-bold text-sm shadow-xl transition-all duration-300 active:scale-95 ${
            isOnline
              ? 'bg-primary text-on-primary shadow-primary/30'
              : 'bg-surface-container-lowest text-on-surface border border-outline-variant'
          }`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-on-primary animate-pulse' : 'bg-outline-variant'}`}
          />
          {toggling ? 'Updating…' : isOnline ? 'Online' : 'Go Online'}
        </button>
      </div>

      {/* Location pin with pulse */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
        <div className="relative">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-xl shadow-primary/40 z-10 relative">
            <span className="material-symbols-outlined text-on-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              person_pin_circle
            </span>
          </div>
          {isOnline && (
            <>
              <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
              <div className="absolute -inset-3 bg-primary/10 rounded-full animate-pulse" />
            </>
          )}
        </div>
      </div>

      {/* Bottom content */}
      <div className="fixed bottom-20 left-0 right-0 px-4 space-y-3 z-30">
        {/* Status card */}
        <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl p-5 shadow-xl border border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOnline ? 'bg-primary' : 'bg-surface-container-high'}`}>
              <span className={`material-symbols-outlined ${isOnline ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                {isOnline ? 'sensors' : 'sensors_off'}
              </span>
            </div>
            <div>
              <p className="font-headline font-bold text-on-surface">
                {isOnline ? 'Waiting for requests…' : 'You are offline'}
              </p>
              <p className="text-xs text-on-surface-variant font-body">
                {isOnline ? 'Stay in range to receive jobs' : 'Go online to start earning'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats bento */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-outline-variant/20">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
              Today&rsquo;s Earnings
            </p>
            <p className="font-headline font-extrabold text-2xl text-primary">
              ₦{stats.todayEarnings.toLocaleString()}
            </p>
          </div>
          <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-outline-variant/20">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
              Trips Today
            </p>
            <p className="font-headline font-extrabold text-2xl text-on-surface">
              {stats.todayTrips}
            </p>
          </div>
        </div>
      </div>

      {/* FABs */}
      <div className="fixed right-4 bottom-36 z-30 flex flex-col gap-3">
        <button className="w-12 h-12 bg-surface-container-lowest rounded-full shadow-lg flex items-center justify-center border border-outline-variant/20">
          <span className="material-symbols-outlined text-primary">my_location</span>
        </button>
        <button className="w-12 h-12 bg-surface-container-lowest rounded-full shadow-lg flex items-center justify-center border border-outline-variant/20">
          <span className="material-symbols-outlined text-on-surface-variant">layers</span>
        </button>
      </div>

      {/* Side drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[100] flex" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-on-background/30 backdrop-blur-sm" />
          <div className="relative w-72 bg-surface h-full shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-primary p-6 pt-14">
              <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center mb-3">
                <span className="font-headline font-bold text-xl text-on-primary">RD</span>
              </div>
              <p className="font-headline font-bold text-on-primary">Rider Driver</p>
              <span className={`mt-1 inline-block px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-widest ${isOnline ? 'bg-primary-fixed/20 text-primary-fixed' : 'bg-white/10 text-on-primary/60'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {[
                { icon: 'person', label: 'Profile Settings', href: '/rider/settings' },
                { icon: 'description', label: 'Vehicle Docs', href: '/rider/settings' },
                { icon: 'payments', label: 'Earnings', href: '/rider/earnings' },
                { icon: 'support_agent', label: 'Support', href: '/shared/support' },
                { icon: 'gavel', label: 'Legal', href: '/shared/about' },
              ].map((link) => (
                <button
                  key={link.label}
                  onClick={() => { setDrawerOpen(false); router.push(link.href) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container-low transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-on-surface-variant">{link.icon}</span>
                  <span className="text-sm font-medium text-on-surface">{link.label}</span>
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-outline-variant/20">
              <button
                onClick={() => { useAuthStore.getState().clearAuth(); router.replace('/welcome') }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-error-container transition-colors"
              >
                <span className="material-symbols-outlined text-error">logout</span>
                <span className="text-sm font-medium text-error">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </ScreenWrapper>
  )
}
