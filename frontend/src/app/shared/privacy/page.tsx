/**
 * @page PrivacyPage
 * @description Privacy Policy for Sarva — how we collect, use, and protect your data.
 * @route /shared/privacy
 */
'use client'

import { useRouter } from 'next/navigation'
import ScreenWrapper from '@/components/layout/ScreenWrapper'

const SECTIONS = [
  {
    icon: 'database',
    title: 'Information We Collect',
    body: 'We collect information you provide directly: name, phone number, email address, profile photo, government ID, driver\'s license, BVN/NIN, bank account details, and vehicle documents. We also collect usage data including GPS location during active deliveries, delivery history, and device identifiers.',
  },
  {
    icon: 'manage_accounts',
    title: 'How We Use Your Information',
    body: 'We use your information to operate the dispatch platform, match riders with delivery requests, process payments, verify rider identities, provide customer support, improve our services, and comply with legal obligations. We do not sell your personal data to third parties.',
  },
  {
    icon: 'location_on',
    title: 'Location Data',
    body: 'GPS location is collected from riders during active deliveries to provide real-time tracking to senders. Location data is not collected when you are offline or outside an active delivery session. Historical location data is retained for dispute resolution purposes.',
  },
  {
    icon: 'share',
    title: 'Data Sharing',
    body: 'We share your data only as necessary to operate the service: with payment processors (Paystack, Opay) to process transactions, with riders to facilitate deliveries, and with authorities when required by law. We use industry-standard encryption for all data transmission.',
  },
  {
    icon: 'lock',
    title: 'Data Security',
    body: 'We implement technical and organizational measures to protect your data including encrypted storage, access controls, and regular security reviews. However, no internet transmission is 100% secure. Please report any security concerns to security@sarvalogistics.ng.',
  },
  {
    icon: 'accessibility',
    title: 'Your Rights',
    body: 'You have the right to access, correct, or delete your personal data. You may request a copy of your data or ask us to delete your account by contacting support. Some data may be retained for legal and compliance purposes even after account deletion.',
  },
  {
    icon: 'child_care',
    title: 'Children\'s Privacy',
    body: 'Sarva is not intended for users under 18 years of age. We do not knowingly collect data from minors. If you believe we have collected data from a minor, please contact us immediately.',
  },
  {
    icon: 'update',
    title: 'Policy Updates',
    body: 'We may update this Privacy Policy to reflect changes in our practices or legal requirements. We will notify you of material changes via in-app notification. Continued use of the platform after changes are posted constitutes acceptance.',
  },
]

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-8 pb-16 space-y-6">
        <div className="flex items-center gap-3 bg-primary/5 rounded-2xl p-4">
          <span
            className="material-symbols-outlined text-primary flex-shrink-0"
            style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}
          >
            privacy_tip
          </span>
          <div>
            <p className="font-bold text-on-surface text-sm">Sarva Privacy Policy</p>
            <p className="text-xs text-on-surface-variant mt-0.5">Last updated: June 2026 · Version 1.0</p>
          </div>
        </div>

        <div className="space-y-4">
          {SECTIONS.map((section) => (
            <div key={section.title} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                  >
                    {section.icon}
                  </span>
                </div>
                <h3 className="font-['Manrope'] font-bold text-on-surface mt-1">{section.title}</h3>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed pl-12">{section.body}</p>
            </div>
          ))}
        </div>

        <footer className="text-center py-4 space-y-1">
          <p className="text-xs text-on-surface-variant/60">
            © 2026 Sarva Logistics. All rights reserved.
          </p>
          <p className="text-xs text-on-surface-variant/40">
            Privacy questions? Contact privacy@sarvalogistics.ng
          </p>
        </footer>
      </main>
    </ScreenWrapper>
  )
}
