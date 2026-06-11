/**
 * @page SelectRolePage
 * @description Role picker — customer (Individual/Vendor/Restaurant/Corporate) or Rider.
 * @route /select-role
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore, type UserRole } from '@/stores/auth.store'

interface RoleOption {
  id: UserRole
  label: string
  icon: string
  description: string
}

const ROLES: RoleOption[] = [
  {
    id: 'INDIVIDUAL',
    label: 'Individual',
    icon: 'person',
    description: 'Ship personal items, track packages, and manage your home deliveries with ease.',
  },
  {
    id: 'RIDER',
    label: 'Rider',
    icon: 'moped',
    description: 'Earn by delivering items. Join our fleet of couriers and define your own schedule.',
  },
]

/* V2_FEATURE: BUSINESS_ROLES
const BUSINESS_ROLES: RoleOption[] = [
  { id: 'VENDOR',     label: 'Vendor',     icon: 'storefront', description: 'Retail shop logistics. Manage inventory movement and last-mile fulfillment.' },
  { id: 'RESTAURANT', label: 'Restaurant', icon: 'restaurant', description: 'Kitchen & food delivery. Streamline takeout orders with professional logistics.' },
  { id: 'CORPORATE',  label: 'Corporate',  icon: 'apartment',  description: 'Enterprise fleet solutions. Custom dashboards and bulk delivery optimization.' },
]
*/

export default function SelectRolePage() {
  const router = useRouter()
  const setSelectedRole = useAuthStore((s) => s.setSelectedRole)
  const [selected, setSelected] = useState<UserRole | null>(null)

  function handleContinue() {
    if (!selected) {
      toast.error('Please select a role to continue')
      return
    }
    setSelectedRole(selected)
    router.push('/register/profile')
  }

  return (
    <ScreenWrapper>
      {/* Fixed glass header */}
      <header className="fixed top-0 z-50 w-full max-w-107.5 glass-nav flex items-center gap-3 px-6 py-4">
        <button
          onClick={() => router.push('/welcome')}
          className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>
            arrow_back
          </span>
        </button>
        <h1 className="font-headline font-extrabold text-primary tracking-tighter">Courier</h1>
      </header>

      {/* Scrollable content */}
      <main className="pt-20 pb-36 px-5">

        {/* Section header */}
        <section className="mb-6 pt-4">
          <span className="font-headline text-primary font-bold tracking-widest text-[11px] uppercase mb-3 block">
            Registration Flow
          </span>
          <h2 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight mb-2 leading-snug">
            Who are you <br />signing up as?
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Select the profile that best matches your logistics needs. You can add more roles later.
          </p>
        </section>

        {/* Role cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ROLES.map((role) => {
            const isSelected = selected === role.id
            return (
              <button
                key={role.id}
                onClick={() => setSelected(role.id)}
                className={[
                  'group relative flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-200 active:scale-[0.98]',
                  isSelected
                    ? 'bg-surface-container-lowest border-2 border-primary shadow-sm'
                    : 'bg-surface-container-lowest editorial-shadow border-2 border-transparent hover:border-outline-variant/30 hover:bg-surface-container-high',
                ].join(' ')}
              >
                {/* Icon circle */}
                <div
                  className={[
                    'w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200',
                    isSelected ? 'bg-primary' : 'bg-surface-container',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'material-symbols-outlined text-2xl',
                      isSelected ? 'text-on-primary' : 'text-primary',
                    ].join(' ')}
                  >
                    {role.icon}
                  </span>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={[
                      'font-headline font-bold text-base mb-0.5',
                      isSelected ? 'text-primary' : 'text-on-surface',
                    ].join(' ')}
                  >
                    {role.label}
                  </h3>
                  <p className="text-on-surface-variant text-xs leading-relaxed line-clamp-2">
                    {role.description}
                  </p>
                </div>

                {/* Selection indicator */}
                <div
                  className={[
                    'w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center transition-all duration-200',
                    isSelected
                      ? 'bg-primary'
                      : 'border-2 border-outline-variant',
                  ].join(' ')}
                >
                  {isSelected && (
                    <span className="material-symbols-outlined text-on-primary" style={{ fontSize: '13px' }}>
                      check
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Help section */}
        <div className="mt-6 p-5 rounded-2xl bg-surface-container-low border border-outline-variant/10">
          <h4 className="font-headline font-bold text-base text-on-surface mb-1">
            Need help choosing?
          </h4>
          <p className="text-on-surface-variant text-xs leading-relaxed mb-4">
            Our team can help you set up the perfect account structure for your business goals.
          </p>
          <button className="px-5 py-2.5 rounded-full bg-surface-container-high text-on-surface font-semibold text-sm hover:bg-surface-container-highest active:scale-95 transition-all">
            Talk to Support
          </button>
        </div>

      </main>

      {/* Fixed Continue CTA */}
      <div className="fixed bottom-0 w-full max-w-107.5 px-5 pb-8 pt-4 glass-nav">
        <button
          onClick={handleContinue}
          className={`w-full font-headline font-bold py-4 rounded-xl active:scale-[0.98] transition-all duration-200 text-base ${selected ? 'editorial-gradient text-on-primary shadow-lg shadow-emerald-950/20' : 'bg-surface-container-high text-on-surface-variant'}`}
        >
          Continue
          <span className="material-symbols-outlined ml-2 align-middle" style={{ fontSize: '18px' }}>
            arrow_forward
          </span>
        </button>
      </div>
    </ScreenWrapper>
  )
}
