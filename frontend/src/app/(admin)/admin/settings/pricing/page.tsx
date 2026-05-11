/**
 * @page AdminPricingSettingsPage
 * @description Pricing rules and zone-based overrides for dispatch regions.
 * @route /admin/settings/pricing
 */
'use client'

import Link from 'next/link'

export default function AdminSettingsPricingPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-primary text-4xl">payments</span>
        </div>
        <h2 className="font-headline font-extrabold text-3xl text-primary mb-2">Pricing Settings</h2>
        <p className="text-on-surface-variant mb-8">Manage base fares, surge rules, and commission rates from the dedicated Pricing module.</p>
        <Link
          href="/admin/pricing"
          className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined">arrow_forward</span>
          Go to Pricing & Surge
        </Link>
      </div>
    </div>
  )
}
