/**
 * @page SharedMenuPage
 * @description Cross-role navigation menu with profile card, services, account, and help sections.
 * @route /shared/menu
 */
'use client'

import { useRouter } from 'next/navigation'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import BottomNav from '@/components/ui/BottomNav'

const MENU_ITEMS = [
  { icon: 'local_shipping', label: 'Book Delivery', href: '/book/address', section: 'Services' },
  { icon: 'history', label: 'Trip History', href: '/history', section: 'Services' },
  { icon: 'payments', label: 'Wallet & Payments', href: '/home', section: 'Services' },
  { icon: 'notifications', label: 'Notifications', href: '/notifications', section: 'Account' },
  { icon: 'settings', label: 'Account Settings', href: '/settings', section: 'Account' },
  { icon: 'subscriptions', label: 'Subscriptions', href: '/subscriptions', section: 'Account' },
  { icon: 'support_agent', label: 'Support Center', href: '/shared/support', section: 'Help' },
  { icon: 'info', label: 'About Fair-Ride', href: '/shared/about', section: 'Help' },
]

const SECTIONS = ['Services', 'Account', 'Help']

export default function MenuPage() {
  const router = useRouter()
  const { user, clearAuth } = useAuthStore((s) => ({ user: s.user, clearAuth: s.clearAuth }))

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'FR'

  return (
    <ScreenWrapper>
      <header className="fixed top-0 w-full z-50 bg-[#f8faf4] flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-primary p-2 -ml-2">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-['Manrope'] font-bold text-lg text-primary">Menu</h1>
        </div>
      </header>

      <main className="pt-20 pb-28 px-6 max-w-lg mx-auto space-y-6">
        <div className="bg-primary rounded-2xl p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center shrink-0">
            <span className="font-headline font-bold text-xl text-on-primary">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline font-bold text-on-primary text-lg truncate">{user?.name ?? 'Fair Ride User'}</p>
            <p className="text-on-primary/60 text-sm truncate">{user?.phone ?? ''}</p>
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-on-primary text-sm">edit</span>
          </button>
        </div>

        {SECTIONS.map((section) => (
          <div key={section}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">{section}</p>
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
              {MENU_ITEMS.filter((item) => item.section === section).map((item, i, arr) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-container-low active:bg-surface-container transition-colors ${i < arr.length - 1 ? 'border-b border-outline-variant/10' : ''}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[18px]">{item.icon}</span>
                  </div>
                  <span className="text-sm font-medium text-on-surface flex-1 text-left">{item.label}</span>
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">chevron_right</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={() => { clearAuth(); router.replace('/welcome') }}
          className="w-full flex items-center gap-4 px-5 py-4 bg-error-container/20 rounded-xl active:scale-95 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-error-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-error text-[18px]">logout</span>
          </div>
          <span className="text-sm font-medium text-error flex-1 text-left">Sign Out</span>
        </button>
      </main>

      <BottomNav />
    </ScreenWrapper>
  )
}
