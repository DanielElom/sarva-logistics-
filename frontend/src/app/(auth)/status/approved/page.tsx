'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'

const ROLE_DESTINATIONS: Record<string, string> = {
  RIDER: '/rider/home',
  VENDOR: '/business/dashboard',
  RESTAURANT: '/business/dashboard',
  CORPORATE: '/business/dashboard',
  INDIVIDUAL: '/home',
}

const ROLE_MESSAGES: Record<string, string> = {
  RIDER: 'Welcome to the Fair-Ride fleet. You can now start accepting deliveries.',
  VENDOR: 'Your vendor account is active. Start booking deliveries for your business.',
  RESTAURANT: 'Your restaurant account is active. Book riders to deliver your orders.',
  CORPORATE: 'Your corporate account is active. Manage all your business deliveries.',
  INDIVIDUAL: 'Your account has been verified. You can now use all Fair-Ride features.',
}

export default function ApprovedPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  useEffect(() => {
    if (!isAuthenticated) router.replace('/welcome')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isAuthenticated) return null

  const destination = ROLE_DESTINATIONS[role ?? 'INDIVIDUAL']
  const message = ROLE_MESSAGES[role ?? 'INDIVIDUAL']
  function handleContinue() {
    router.replace(destination)
  }

  return (
    <ScreenWrapper>
      <header className="fixed top-0 w-full z-50 bg-[#f8faf4] flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-4">
          <span className="font-['Manrope'] font-bold text-lg text-primary">Application Status</span>
        </div>
        <span className="font-['Manrope'] font-extrabold text-xl text-primary tracking-tighter">Fair-Ride</span>
      </header>

      <main className="flex-grow flex items-center justify-center px-6 pt-20 pb-24">
        <div className="max-w-md w-full text-center">
          {/* hero icon */}
          <div className="relative mb-10 flex justify-center">
            <div className="absolute inset-0 scale-150 blur-3xl bg-secondary-container/30 rounded-full" />
            <div className="relative w-32 h-32 bg-surface-container-lowest rounded-full shadow-[0_24px_48px_rgba(0,52,24,0.08)] flex items-center justify-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)' }}
              >
                <span
                  className="material-symbols-outlined text-white"
                  style={{ fontVariationSettings: "'FILL' 1", fontSize: '48px' }}
                >
                  check_circle
                </span>
              </div>
            </div>
          </div>

          {/* content */}
          <div className="space-y-3 mb-10">
            <h1 className="font-['Manrope'] font-extrabold text-3xl tracking-tight text-on-surface">
              Application Approved!
            </h1>
            <p className="text-on-surface-variant leading-relaxed px-4">{message}</p>
          </div>

          {/* stat cards */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-surface-container-low p-5 rounded-xl text-left border-b-4 border-primary">
              <span
                className="material-symbols-outlined text-primary mb-2"
                style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}
              >
                {role === 'RIDER' ? 'electric_moped' : role === 'VENDOR' ? 'storefront' : role === 'RESTAURANT' ? 'restaurant' : role === 'CORPORATE' ? 'apartment' : 'verified_user'}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                {role === 'RIDER' ? 'Rider ID' : role === 'VENDOR' ? 'Vendor Account ID' : role === 'RESTAURANT' ? 'Restaurant Account ID' : role === 'CORPORATE' ? 'Corporate Account ID' : 'Account ID'}
              </p>
              <p className="text-base font-bold text-primary">FR-Active</p>
            </div>
            <div className="bg-surface-container-low p-5 rounded-xl text-left">
              <span
                className="material-symbols-outlined text-primary mb-2"
                style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}
              >
                verified_user
              </span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Status</p>
              <p className="text-base font-bold text-primary">Verified</p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleContinue}
            className="w-full py-5 px-8 rounded-xl font-['Manrope'] font-bold text-lg text-white shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)' }}
          >
            {role === 'RIDER' ? 'Go to Rider Dashboard' : role === 'VENDOR' ? 'Go to Vendor Dashboard' : role === 'RESTAURANT' ? 'Go to Restaurant Dashboard' : role === 'CORPORATE' ? 'Go to Corporate Dashboard' : 'Go to Home'}
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_forward</span>
          </button>

          {/* next step hint */}
          <div className="mt-6 bg-surface/80 backdrop-blur-md p-4 rounded-xl flex items-center gap-4 border border-outline-variant/20">
            <div className="bg-secondary-container w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>
                notifications_active
              </span>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-on-surface">Next Step</p>
              <p className="text-xs text-on-surface-variant">
                {role === 'RIDER' ? 'You can now go online and start accepting delivery requests.' : role === 'VENDOR' ? 'Your vendor account is ready. Start booking deliveries for your store.' : role === 'RESTAURANT' ? 'Your restaurant account is active. Start dispatching food deliveries.' : role === 'CORPORATE' ? 'Your corporate account is set up. Book bulk deliveries for your team.' : 'Your account is verified. Start booking deliveries.'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </ScreenWrapper>
  )
}
