'use client'

import Link from 'next/link'

const SETTINGS_CATEGORIES = [
  { href: '/admin/settings/general', label: 'General', sub: 'Platform identity, timezone, support contact', icon: 'settings_suggest', color: 'bg-primary-container text-on-primary' },
  { href: '/admin/settings/dispatch', label: 'Dispatch Logic', sub: 'Matching radius, algorithm, timeouts', icon: 'alt_route', color: 'bg-secondary-container text-on-secondary-container' },
  { href: '/admin/settings/analytics', label: 'Analytics & Reports', sub: 'Refresh intervals, metrics tracking, exports', icon: 'analytics', color: 'bg-surface-container-highest text-on-surface-variant' },
  { href: '/admin/settings/payments', label: 'Payments & Wallet', sub: 'Gateways, payout schedule, refund rules', icon: 'account_balance_wallet', color: 'bg-primary-fixed text-on-primary-fixed' },
  { href: '/admin/settings/pricing', label: 'Pricing & Commissions', sub: 'Base fare, surge tiers, commission rates', icon: 'payments', color: 'bg-secondary-fixed text-on-secondary-fixed' },
  { href: '/admin/settings/notifications', label: 'Notifications', sub: 'Push, SMS, email — channel config', icon: 'notifications_active', color: 'bg-surface-container-highest text-on-surface-variant' },
  { href: '/admin/settings/integrations', label: 'Integrations', sub: 'Payment gateways, maps, comms APIs', icon: 'hub', color: 'bg-tertiary-fixed text-on-tertiary-fixed' },
  { href: '/admin/settings/users', label: 'User Governance', sub: 'Rider requirements, fraud detection', icon: 'person_search', color: 'bg-primary-container text-on-primary' },
  { href: '/admin/settings/support', label: 'Support & SLA', sub: 'Ticket categories, refund protocols, SLA', icon: 'contact_support', color: 'bg-secondary-container text-on-secondary-container' },
  { href: '/admin/settings/advanced', label: 'Advanced', sub: 'API keys, feature flags, danger zone', icon: 'developer_mode', color: 'bg-error-container text-on-error-container' },
]

export default function AdminSettingsHubPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface px-8 py-4 sticky top-0 z-40">
        <h1 className="font-headline font-extrabold text-2xl text-primary">System Settings</h1>
        <p className="text-xs text-on-surface-variant">Configure all platform parameters</p>
      </header>

      <div className="p-8">
        <div className="mb-8">
          <h2 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight mb-2">Configuration Hub</h2>
          <p className="text-on-surface-variant">Select a category to configure system parameters.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {SETTINGS_CATEGORIES.map(cat => (
            <Link
              key={cat.href}
              href={cat.href}
              className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10 hover:shadow-md hover:border-outline-variant/30 transition-all group flex items-start gap-4"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${cat.color}`}>
                <span className="material-symbols-outlined">{cat.icon}</span>
              </div>
              <div className="flex-1">
                <p className="font-headline font-bold text-on-surface group-hover:text-primary transition-colors">{cat.label}</p>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{cat.sub}</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">chevron_right</span>
            </Link>
          ))}
        </div>

        {/* Roles & Permissions table */}
        <div className="mt-8 bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
            <h3 className="font-headline font-bold text-on-surface">Roles & Permissions</h3>
            <button className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold">Add Role</button>
          </div>
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant/10">
              <tr>
                {['Role', 'Users', 'Dashboard', 'Riders', 'Pricing', 'Payments', 'Settings'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {[
                { role: 'Super Admin', users: 2, dash: true, riders: true, pricing: true, payments: true, settings: true },
                { role: 'Operations Manager', users: 4, dash: true, riders: true, pricing: false, payments: false, settings: false },
                { role: 'Finance Admin', users: 3, dash: true, riders: false, pricing: true, payments: true, settings: false },
                { role: 'Support Agent', users: 8, dash: false, riders: false, pricing: false, payments: false, settings: false },
              ].map(row => (
                <tr key={row.role} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-on-surface">{row.role}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{row.users}</td>
                  {[row.dash, row.riders, row.pricing, row.payments, row.settings].map((has, i) => (
                    <td key={i} className="px-4 py-3">
                      <span className={`material-symbols-outlined text-sm ${has ? 'text-secondary' : 'text-on-surface-variant opacity-30'}`}>
                        {has ? 'check_circle' : 'cancel'}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
