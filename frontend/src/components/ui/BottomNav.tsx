'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  History,
  Settings,
  DollarSign,
  Clock,
  Bell,
  User,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const userNav: NavItem[] = [
  { href: '/home', label: 'Home', icon: <Home size={22} /> },
  { href: '/history', label: 'History', icon: <Clock size={22} /> },
  { href: '/notifications', label: 'Notifications', icon: <Bell size={22} /> },
  { href: '/settings', label: 'Profile', icon: <User size={22} /> },
]

const riderNav: NavItem[] = [
  { href: '/rider/home', label: 'Home', icon: <Home size={22} /> },
  { href: '/rider/earnings', label: 'Earnings', icon: <DollarSign size={22} /> },
  { href: '/rider/history', label: 'History', icon: <History size={22} /> },
  { href: '/rider/settings', label: 'Settings', icon: <Settings size={22} /> },
]

export default function BottomNav() {
  const pathname = usePathname()
  const role = useAuthStore((s) => s.role)

  const items = role === 'RIDER' ? riderNav : userNav

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant/30"
      style={{
        background: 'rgba(248,250,244,0.80)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <ul className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {items.map((item) => {
          const active =
            item.href === '/home' || item.href === '/rider/home'
              ? pathname === item.href
              : pathname.startsWith(item.href)

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-1 rounded-xl transition-colors duration-150 ${
                  active
                    ? 'text-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-medium font-body">
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
