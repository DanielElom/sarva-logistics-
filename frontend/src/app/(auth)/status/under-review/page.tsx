/**
 * @page StatusUnderReviewPage
 * @description Waiting screen shown while rider KYC documents are being reviewed.
 * @route /status/under-review
 */
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

const ROLE_MESSAGES: Record<string, string> = {
  VENDOR: 'Your vendor account is under review',
  RESTAURANT: 'Your restaurant account is under review',
  CORPORATE: 'Your corporate account is under review',
  RIDER: 'Your rider application is under review',
  INDIVIDUAL: 'Your account is under review',
}

const DOCS: Record<string, Array<{ icon: string; label: string; status: 'received' | 'pending' | 'active' }>> = {
  RIDER: [
    { icon: 'badge', label: "Driver's License", status: 'received' },
    { icon: 'policy', label: 'Vehicle Insurance', status: 'received' },
    { icon: 'shield_person', label: 'Background Check', status: 'active' },
  ],
  default: [
    { icon: 'business', label: 'Business Details', status: 'received' },
    { icon: 'gavel', label: 'CAC Document', status: 'received' },
    { icon: 'shield_person', label: 'Identity Verification', status: 'active' },
  ],
}

export default function UnderReviewPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }

    pollRef.current = setInterval(() => {
      api.get('/users/me').then(({ data }) => {
        if (data?.status === 'ACTIVE' || data?.verificationStatus === 'VERIFIED') {
          clearInterval(pollRef.current!)
          const dest = data.role === 'RIDER' ? '/rider/home'
            : data.role === 'INDIVIDUAL' ? '/home'
            : '/business/dashboard'
          router.replace(dest)
        }
      }).catch(() => null)
    }, 30000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isAuthenticated) return null

  const roleMessage = ROLE_MESSAGES[role ?? 'INDIVIDUAL']
  const docs = DOCS[role === 'RIDER' ? 'RIDER' : 'default']

  return (
    <ScreenWrapper>
      <header className="fixed top-0 w-full z-50 bg-[#f8faf4] flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-primary active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_back</span>
          </button>
          <h1 className="font-['Manrope'] font-bold text-lg text-primary">Fair-Ride</h1>
        </div>
        <button
          onClick={() => alert('Options coming soon')}
          className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>more_vert</span>
        </button>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-lg mx-auto space-y-8">
        {/* hero */}
        <section className="relative overflow-hidden rounded-2xl bg-surface-container-low p-8 text-center">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center mb-6 shadow-xl">
              <span
                className="material-symbols-outlined text-white"
                style={{ fontVariationSettings: "'FILL' 1", fontSize: '40px' }}
              >
                pending_actions
              </span>
            </div>
            <h2 className="font-['Manrope'] font-extrabold text-2xl text-on-surface tracking-tight mb-2">
              Application Under Review
            </h2>
            <p className="text-on-surface-variant font-medium leading-relaxed text-sm">
              {roleMessage}. Our team is verifying your documents. This usually takes 24–48 hours.
            </p>
            <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold text-primary">Verification in progress</span>
            </div>
          </div>
        </section>

        {/* document status */}
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 px-1">
            Verification Status
          </h3>
          <div className="space-y-3">
            {docs.map((doc) => (
              <div
                key={doc.label}
                className={`bg-surface-container-lowest rounded-xl p-5 flex items-center justify-between shadow-sm ${doc.status === 'active' ? 'border-l-4 border-primary' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${doc.status === 'active' ? 'bg-primary/10' : 'bg-surface-container-high'}`}>
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontVariationSettings: "'FILL' 0", fontSize: '22px' }}
                    >
                      {doc.icon}
                    </span>
                  </div>
                  <div>
                    <p className="font-['Manrope'] font-bold text-on-surface text-sm">{doc.label}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {doc.status === 'active' ? 'In Progress' : 'Submitted'}
                    </p>
                  </div>
                </div>
                {doc.status === 'received' ? (
                  <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase rounded-full">
                    Received
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-primary animate-pulse" style={{ fontSize: '22px' }}>
                    schedule
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* info box */}
        <section className="bg-surface-container-high rounded-xl p-5 flex items-start gap-4">
          <span
            className="material-symbols-outlined text-tertiary flex-shrink-0"
            style={{ fontVariationSettings: "'FILL' 0", fontSize: '22px' }}
          >
            info
          </span>
          <div>
            <h4 className="font-['Manrope'] font-bold text-on-surface text-sm mb-1">What's next?</h4>
            <p className="text-sm text-on-surface-variant leading-snug">
              Once your documents are approved, you will receive a notification to access your dashboard. We'll also send a confirmation to your registered email.
            </p>
          </div>
        </section>

        {/* support link */}
        <p className="text-center text-sm text-on-surface-variant">
          Have questions?{' '}
          <button
            onClick={() => router.push('/shared/support')}
            className="text-primary font-bold underline underline-offset-4"
          >
            Contact Support
          </button>
        </p>
      </main>
    </ScreenWrapper>
  )
}
