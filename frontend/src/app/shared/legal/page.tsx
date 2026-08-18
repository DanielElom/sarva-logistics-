/**
 * @page LegalPage
 * @description Terms of Service and legal information for Sarva.
 * @route /shared/legal
 */
'use client'

import { useRouter } from 'next/navigation'
import ScreenWrapper from '@/components/layout/ScreenWrapper'

const SECTIONS = [
  {
    title: 'Acceptance of Terms',
    body: 'By accessing or using the Sarva platform — including our mobile app, website, and related services — you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use our services.',
  },
  {
    title: 'Use of Services',
    body: 'Sarva provides a logistics dispatch platform connecting senders with verified motorcycle couriers in Abuja, Nigeria. You must be at least 18 years old to use our services. You agree to provide accurate information and to use the platform only for lawful purposes.',
  },
  {
    title: 'Rider Obligations',
    body: 'Riders must maintain valid documentation including a driver\'s license, vehicle registration, and insurance. Riders are responsible for the safe and timely delivery of all parcels. Sarva reserves the right to suspend accounts that violate these obligations.',
  },
  {
    title: 'Payments and Fees',
    body: 'Delivery fees are calculated based on distance and current pricing configuration. Riders receive payment directly to their registered bank accounts after delivery confirmation. Sarva does not charge commission during the V1 launch period.',
  },
  {
    title: 'Limitation of Liability',
    body: 'Sarva acts as an intermediary platform and is not liable for loss, damage, or delays caused by third parties, traffic conditions, natural events, or circumstances beyond reasonable control. Maximum liability is limited to the value of the delivery fee paid.',
  },
  {
    title: 'Termination',
    body: 'Sarva reserves the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or pose a risk to users or the platform. Users may close their account at any time by contacting support.',
  },
  {
    title: 'Governing Law',
    body: 'These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved through the courts of the Federal Capital Territory, Abuja.',
  },
  {
    title: 'Changes to Terms',
    body: 'We may update these Terms periodically. Continued use of the platform after changes are posted constitutes acceptance of the updated Terms. We will notify users of material changes via in-app notifications.',
  },
]

export default function LegalPage() {
  const router = useRouter()

  return (
    <ScreenWrapper>
      <header className="sticky top-0 z-30 bg-[#f8faf4]/90 backdrop-blur-lg flex items-center gap-4 px-6 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <button
          onClick={() => router.back()}
          className="p-2 text-primary hover:bg-surface-container-high rounded-full active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
            arrow_back
          </span>
        </button>
        <h1 className="font-['Manrope'] font-bold text-lg text-primary tracking-tight">
          Terms of Service
        </h1>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-8 pb-16 space-y-6">
        <div className="flex items-center gap-3 bg-primary/5 rounded-2xl p-4">
          <span
            className="material-symbols-outlined text-primary flex-shrink-0"
            style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}
          >
            gavel
          </span>
          <div>
            <p className="font-bold text-on-surface text-sm">Sarva Terms of Service</p>
            <p className="text-xs text-on-surface-variant mt-0.5">Last updated: June 2026 · Version 1.0</p>
          </div>
        </div>

        <div className="space-y-4">
          {SECTIONS.map((section, i) => (
            <div key={section.title} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <h3 className="font-['Manrope'] font-bold text-on-surface">{section.title}</h3>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed pl-9">{section.body}</p>
            </div>
          ))}
        </div>

        <footer className="text-center py-4 space-y-1">
          <p className="text-xs text-on-surface-variant/60">
            © 2026 Sarva Logistics. All rights reserved.
          </p>
          <p className="text-xs text-on-surface-variant/40">
            Questions? Contact us at support@sarvalogistics.ng
          </p>
        </footer>
      </main>
    </ScreenWrapper>
  )
}
