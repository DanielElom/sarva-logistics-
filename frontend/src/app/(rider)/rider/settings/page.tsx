/**
 * @page RiderSettingsPage
 * @description Rider app settings — profile, vehicle info, bank account, notifications.
 * @route /rider/settings
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import BottomNav from '@/components/ui/BottomNav'
import api from '@/lib/api'

interface RiderProfile {
  name: string
  phone: string
  isOnline: boolean
  rating: number
  subscriptionPlan?: string
  commissionModel?: string
  vehicleType?: string
  bankName?: string
  accountNumber?: string
}

function SettingsRow({
  icon, label, sub, onClick,
}: { icon: string; label: string; sub?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-5 hover:bg-surface-container-low transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className="text-left">
          <p className="font-medium text-on-surface">{label}</p>
          {sub && <p className="text-sm text-on-surface-variant">{sub}</p>}
        </div>
      </div>
      <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">chevron_right</span>
    </button>
  )
}

export default function RiderSettingsPage() {
  const router = useRouter()
  const { isAuthenticated, role, user, clearAuth } = useAuthStore((s) => ({
    isAuthenticated: s.isAuthenticated,
    role: s.role,
    user: s.user,
    clearAuth: s.clearAuth,
  }))

  const [profile, setProfile] = useState<RiderProfile | null>(null)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
  }, [isAuthenticated, role, router])

  useEffect(() => {
    if (!isAuthenticated || role !== 'RIDER') return
    api.get('/riders/me/profile')
      .then(({ data }) => setProfile(data))
      .catch(() => {})
  }, [isAuthenticated, role])

  function handleLogout() {
    if (!confirm('Are you sure you want to log out?')) return
    clearAuth()
    router.replace('/welcome')
  }

  return (
    <ScreenWrapper>
      <header className="bg-white/80 backdrop-blur-md shadow-sm shadow-emerald-900/5 sticky top-0 z-50 flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-emerald-900 cursor-pointer">menu</span>
          <h1 className="font-headline font-bold text-lg tracking-tight text-emerald-900">Operational Control</h1>
        </div>
        <span className="material-symbols-outlined text-emerald-900">account_circle</span>
      </header>

      <main className="pt-6 pb-28 px-6 max-w-2xl mx-auto">
        {/* Profile header */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-primary-container rounded-xl p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="z-10 relative">
                <p className="text-on-primary-container font-label text-sm uppercase tracking-widest mb-2">Primary Courier</p>
                <h2 className="font-headline font-extrabold text-3xl text-white">{profile?.name ?? user?.name ?? 'Rider'}</h2>
                <p className="text-on-primary-container mt-1 text-sm">{profile?.commissionModel ?? 'Standard Commission'}</p>
              </div>
              <div className="mt-8 z-10 relative">
                <span className="bg-white/10 text-white px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
                  Status: {profile?.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-800/30 rounded-full blur-3xl" />
            </div>
            <div className="bg-surface-container-low rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center border-4 border-white shadow-sm">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="font-bold text-on-surface">{(profile?.rating ?? 5).toFixed(1)}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-8 pb-4">
          {/* Vehicle */}
          <section>
            <h3 className="font-headline font-bold text-xl text-on-surface mb-3 px-1">Vehicle &amp; Bike Details</h3>
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden divide-y divide-transparent">
              <SettingsRow icon="pedal_bike" label="Primary Vehicle" sub={profile?.vehicleType ?? 'Not set'} />
              <SettingsRow icon="description" label="Vehicle Docs" sub="Insurance and Registration" />
            </div>
          </section>

          {/* Account */}
          <section>
            <h3 className="font-headline font-bold text-xl text-on-surface mb-3 px-1">Account Settings</h3>
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden divide-y divide-transparent">
              <SettingsRow icon="person" label="Personal Information" />
              <SettingsRow
                icon="payments"
                label="Payout Methods"
                sub={profile?.bankName ? `${profile.bankName} •••• ${profile.accountNumber?.slice(-4)}` : 'Not set'}
              />
              <SettingsRow icon="security" label="Security &amp; Password" onClick={() => router.push('/change-password')} />
            </div>
          </section>

          {/* Subscription */}
          <section>
            <h3 className="font-headline font-bold text-xl text-on-surface mb-3 px-1">Subscription</h3>
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
              <SettingsRow
                icon="workspace_premium"
                label="Subscription Plan"
                sub={profile?.subscriptionPlan ?? 'Standard'}
                onClick={() => router.push('/subscriptions')}
              />
            </div>
          </section>

          {/* Navigation */}
          <section>
            <h3 className="font-headline font-bold text-xl text-on-surface mb-3 px-1">Navigation Preferences</h3>
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden divide-y divide-transparent">
              <SettingsRow icon="map" label="Navigation App" sub="Google Maps" onClick={() => router.push('/rider/settings/navigation')} />
              <SettingsRow icon="directions_bike" label="Sound &amp; Haptics" onClick={() => router.push('/rider/settings/sounds')} />
            </div>
          </section>

          {/* App settings */}
          <section>
            <h3 className="font-headline font-bold text-xl text-on-surface mb-3 px-1">App Settings</h3>
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden divide-y divide-transparent">
              <SettingsRow icon="notifications_active" label="Push Notifications" />
              <SettingsRow icon="info" label="Version 2.4.0" />
              <SettingsRow icon="policy" label="Legal &amp; Privacy" />
            </div>
          </section>

          {/* Logout */}
          <section className="pb-4">
            <button
              onClick={handleLogout}
              className="w-full bg-error-container text-on-error-container font-bold py-4 rounded-xl active:scale-95 transition-all"
            >
              Logout of Session
            </button>
          </section>
        </div>
      </main>

      <BottomNav />
    </ScreenWrapper>
  )
}
