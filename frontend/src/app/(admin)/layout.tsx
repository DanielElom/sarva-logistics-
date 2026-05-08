'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/operations', label: 'Live Operations', icon: 'map' },
  { href: '/admin/riders', label: 'Riders', icon: 'people' },
  { href: '/admin/trips', label: 'Trips', icon: 'local_shipping' },
  { href: '/admin/payments', label: 'Payments', icon: 'account_balance_wallet' },
  { href: '/admin/pricing', label: 'Pricing', icon: 'payments' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings_suggest' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, role, clearAuth } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'ADMIN') { router.replace(role === 'RIDER' ? '/rider/home' : '/home'); return }
  }, [isAuthenticated, role, router])

  if (!isAuthenticated || role !== 'ADMIN') return null

  function handleLogout() {
    clearAuth()
    router.replace('/welcome')
  }

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <aside className="h-screen w-64 fixed left-0 top-0 border-r border-outline-variant/20 bg-surface-container-low flex flex-col p-4 z-50">
        <div className="flex items-center gap-3 px-2 py-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary">architecture</span>
          </div>
          <div>
            <h2 className="font-headline font-extrabold text-primary text-sm leading-tight">Admin Panel</h2>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Fair-Ride</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map((item) => {
            const active = item.href === '/admin/settings'
              ? pathname.startsWith('/admin/settings')
              : pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-high font-medium'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="pt-4 border-t border-outline-variant/20 space-y-1">
          <a
            href="mailto:support@fair-ride.com"
            className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg text-sm transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">contact_support</span>
            Support
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-error hover:bg-error-container/20 rounded-lg text-sm transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <div className="ml-64 flex-1 min-h-screen">
        {children}
      </div>
    </div>
  )
}
