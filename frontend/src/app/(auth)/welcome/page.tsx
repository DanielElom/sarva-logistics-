/**
 * @page WelcomePage
 * @description Landing screen with app intro and CTA to register or log in.
 * @route /welcome
 */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/stores/auth.store'

function homeForRole(role: UserRole): string {
  if (role === 'RIDER') return '/rider/home'
  if (role === 'ADMIN') return '/admin/dashboard'
  return '/home'
}

export default function WelcomePage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  useEffect(() => {
    if (isAuthenticated && role) {
      router.replace(homeForRole(role))
    }
  }, [isAuthenticated, role, router])

  // Don't flash the welcome screen while redirecting
  if (isAuthenticated && role) return null

  return (
    <ScreenWrapper>
      <div className="relative h-screen w-full flex flex-col justify-end overflow-hidden">

        <div
          className="absolute inset-0 z-0"
          style={{
            background: 'linear-gradient(180deg, #000c06 0%, #001a0d 25%, #002a14 60%, #003c1d 85%, #004d26 100%)',
          }}
        />
        <div
          className="absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 80%, #004d26 0%, transparent 50%), radial-gradient(circle at 80% 20%, #003418 0%, transparent 50%)',
          }}
        />

        <div className="absolute top-0 left-0 w-full px-8 py-10 z-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 editorial-gradient rounded-xl flex items-center justify-center shadow-lg shadow-emerald-950/20">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                two_wheeler
              </span>
            </div>
            <h1 className="font-headline font-extrabold text-2xl tracking-tighter text-white">Courier</h1>
          </div>
        </div>

        <div className="relative z-10 px-8 pb-16 w-full">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-primary-container/30 backdrop-blur-md text-primary-fixed text-xs font-semibold tracking-widest uppercase">
                Fair-Ride Logistics
              </span>
              <h2 className="font-headline text-5xl font-bold text-white leading-[1.1] tracking-tight">
                Architectural <br /> Delivery.
              </h2>
              <p className="text-surface-variant font-body text-lg max-w-md opacity-90 leading-relaxed">
                Experience a new standard in logistics. Reliable, precise, and built for the modern enterprise.
              </p>
            </div>

            <div className="flex flex-col gap-4 pt-4">
              <button
                onClick={() => router.push('/login')}
                className="editorial-gradient text-on-primary font-headline font-bold py-5 px-8 rounded-xl shadow-2xl shadow-emerald-950/40 transform active:scale-95 transition-all duration-200 text-center text-lg"
              >
                Log In
              </button>
              <button
                onClick={() => router.push('/select-role')}
                className="bg-white/10 backdrop-blur-xl border border-white/10 text-white font-headline font-bold py-5 px-8 rounded-xl hover:bg-white/20 transform active:scale-95 transition-all duration-200 text-center text-lg"
              >
                Create Account
              </button>
            </div>

            <div className="pt-6 flex items-center gap-6">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-[#191d19] bg-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary-container" style={{ fontSize: '18px' }}>person</span>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-[#191d19] bg-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-secondary" style={{ fontSize: '18px' }}>person</span>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-[#191d19] bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface">
                  15k+
                </div>
              </div>
              <p className="text-sm text-surface-variant/80 font-medium">
                Trusted by <span className="text-white">15,000+</span> fleet partners globally.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full flex justify-center pb-4 opacity-30">
          <div className="w-32 h-1.5 bg-white rounded-full" />
        </div>

        <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves={3} stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noiseFilter)" />
          </svg>
        </div>

      </div>
    </ScreenWrapper>
  )
}
