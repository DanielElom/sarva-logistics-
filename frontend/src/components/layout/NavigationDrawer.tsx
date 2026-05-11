'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/auth.store'
import { useOrderStore } from '@/stores/order.store'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const ACTIVE_STATUSES = new Set([
  'PENDING',
  'ASSIGNED',
  'EN_ROUTE_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED_AT_DELIVERY',
  'DELIVERED_REQUESTED',
])

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="relative flex-shrink-0">
      <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-surface-container-low flex items-center justify-center shadow-sm">
        <span className="font-['Manrope'] font-black text-xl text-primary">{initials}</span>
      </div>
      <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full border-2 border-white flex items-center justify-center">
        <span
          className="material-symbols-outlined text-white"
          style={{ fontVariationSettings: "'FILL' 1", fontSize: '10px' }}
        >
          check
        </span>
      </div>
    </div>
  )
}

interface MenuItem {
  icon: string
  label: string
  action: () => void
  danger?: boolean
  badge?: React.ReactNode
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

export default function NavigationDrawer({ isOpen, onClose }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const activeOrder = useOrderStore((s) => s.activeOrder)

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // swipe-to-close
  const touchStartX = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (delta > 60) { onClose(); touchStartX.current = null }
    touchStartX.current = null
  }

  // lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // close on escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function navigate(path: string) {
    onClose()
    router.push(path)
  }

  function handleLogout() {
    clearAuth()
    onClose()
    router.replace('/welcome')
  }

  const hasActiveOrder = activeOrder && ACTIVE_STATUSES.has(activeOrder.status)

  const activeOrderBadge = hasActiveOrder ? (
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="text-[10px] font-bold text-primary">Live</span>
    </span>
  ) : null

  const displayName = user?.name ?? 'User'
  const displayPhone = user?.phone ?? ''
  const displayRole = (role ?? '').charAt(0).toUpperCase() + (role ?? '').slice(1).toLowerCase()

  const isIndividual = role === 'INDIVIDUAL'
  const isBusiness = role === 'VENDOR' || role === 'RESTAURANT' || role === 'CORPORATE'

  const individualSections: MenuSection[] = [
    {
      title: 'Account',
      items: [
        { icon: 'person', label: 'My Profile', action: () => navigate('/settings') },
        { icon: 'history', label: 'Trip History', action: () => navigate('/history') },
        { icon: 'location_on', label: 'Saved Addresses', action: () => navigate('/settings') },
        { icon: 'notifications', label: 'Notifications', action: () => navigate('/notifications') },
      ],
    },
    {
      title: 'Delivery',
      items: [
        { icon: 'local_shipping', label: 'Book a Delivery', action: () => navigate('/book/type') },
        {
          icon: 'gps_fixed',
          label: 'Active Order',
          badge: activeOrderBadge,
          action: () => {
            if (hasActiveOrder) navigate(`/tracking/${activeOrder.id}`)
            else toast('No active order right now', { icon: '📦' })
          },
        },
        { icon: 'receipt_long', label: 'Receipts', action: () => navigate('/history') },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'support_agent', label: 'Help & Support', action: () => navigate('/shared/support') },
        { icon: 'info', label: 'About Fair-Ride', action: () => navigate('/shared/about') },
        { icon: 'star', label: 'Rate the App', action: () => { onClose(); toast('Coming soon', { icon: '⭐' }) } },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        { icon: 'group_add', label: 'Refer a Friend', action: () => { onClose(); toast('Coming soon', { icon: '🎉' }) } },
        {
          icon: 'logout',
          label: 'Log Out',
          danger: true,
          action: () => setShowLogoutConfirm(true),
        },
      ],
    },
  ]

  const businessSections: MenuSection[] = [
    {
      title: 'Account',
      items: [
        { icon: 'business', label: 'Business Profile', action: () => navigate('/business/settings') },
        { icon: 'history', label: 'Delivery History', action: () => navigate('/history') },
        { icon: 'workspace_premium', label: 'Subscription Plan', action: () => navigate('/subscriptions') },
        { icon: 'notifications', label: 'Notifications', action: () => navigate('/notifications') },
      ],
    },
    {
      title: 'Delivery',
      items: [
        { icon: 'local_shipping', label: 'Book a Delivery', action: () => navigate('/book/type') },
        {
          icon: 'gps_fixed',
          label: 'Active Orders',
          badge: activeOrderBadge,
          action: () => {
            if (hasActiveOrder) navigate(`/tracking/${activeOrder.id}`)
            else navigate('/tracking')
          },
        },
        { icon: 'receipt_long', label: 'Receipts & Invoices', action: () => navigate('/history') },
      ],
    },
    {
      title: 'Business',
      items: [
        { icon: 'dashboard', label: 'Dashboard', action: () => navigate('/business/dashboard') },
        { icon: 'bar_chart', label: 'Usage & Analytics', action: () => navigate('/business/dashboard') },
        { icon: 'payments', label: 'Billing & Payments', action: () => { onClose(); toast('Coming soon', { icon: '💳' }) } },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'support_agent', label: 'Help & Support', action: () => navigate('/shared/support') },
        { icon: 'info', label: 'About Fair-Ride', action: () => navigate('/shared/about') },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        {
          icon: 'logout',
          label: 'Log Out',
          danger: true,
          action: () => setShowLogoutConfirm(true),
        },
      ],
    },
  ]

  const sections = isBusiness ? businessSections : individualSections

  return (
    <>
      {/* backdrop */}
      <div
        className={[
          'fixed inset-0 z-[55] bg-on-background/25 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* drawer */}
      <aside
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={[
          'fixed inset-y-0 left-0 z-[60] flex flex-col bg-white h-full w-80 rounded-r-2xl overflow-hidden shadow-[24px_0_48px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Navigation menu"
      >
        {/* ── Profile header ── */}
        <header className="px-6 pt-10 pb-6 flex items-start gap-4 bg-white">
          <Avatar name={displayName} />
          <div className="flex flex-col min-w-0">
            <h1 className="font-['Manrope'] font-black text-lg text-[#003418] truncate leading-tight">
              {displayName}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm font-medium text-on-surface-variant truncate">{displayPhone}</span>
            </div>
            <span className="mt-1.5 inline-block self-start px-2 py-0.5 rounded-full bg-secondary-container text-[10px] font-bold text-on-secondary-container uppercase tracking-wider">
              {displayRole}
            </span>
          </div>
        </header>

        <div className="w-full h-px bg-outline-variant/15" />

        {/* ── Nav items ── */}
        <nav className="flex-1 px-4 py-3 overflow-y-auto space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 px-4 mb-1">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.action.toString()
                  return (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className={[
                        'w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors text-sm font-medium text-left group',
                        item.danger
                          ? 'text-error hover:bg-error-container/20'
                          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'material-symbols-outlined transition-colors flex-shrink-0',
                          item.danger
                            ? 'text-error'
                            : 'text-on-surface-variant group-hover:text-primary',
                        ].join(' ')}
                        style={{ fontVariationSettings: "'FILL' 0", fontSize: '22px' }}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1 font-['Inter']">{item.label}</span>
                      {item.badge && item.badge}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Logout confirmation inline ── */}
        {showLogoutConfirm && (
          <div className="mx-4 mb-3 p-4 rounded-2xl bg-error-container/30 border border-error/20 space-y-3">
            <p className="text-sm font-semibold text-on-surface">Log out of Fair-Ride?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/40 text-sm font-bold text-on-surface active:opacity-70"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-error text-white text-sm font-bold active:opacity-80"
              >
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* ── Footer branding ── */}
        <footer className="p-4">
          <div className="bg-surface-container-low rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)' }}>
              <span
                className="material-symbols-outlined text-white"
                style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
              >
                electric_moped
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-['Manrope'] font-extrabold text-xs text-primary leading-tight truncate">
                Fair-Ride
              </span>
              <span className="text-[10px] text-on-surface-variant font-medium">Version 1.0.0</span>
            </div>
          </div>
        </footer>
      </aside>
    </>
  )
}
