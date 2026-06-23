/**
 * @page RiderSettingsPage
 * @description Rider app settings — profile, vehicle info, bank account, notifications.
 * @route /rider/settings
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import BottomNav from '@/components/ui/BottomNav'
import api from '@/lib/api'

interface RiderProfileData {
  id: string
  isOnline: boolean
  rating: string | number
  ratingCount: number
  riderType: string
  bikeMakeModel: string | null
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
  bikePhotoFront: string | null
  bikePhotoSide: string | null
  bikePhotoPlate: string | null
  bikePapers: string | null
  user: {
    name: string | null
    phone: string
    email: string | null
  }
}

function SettingsRow({
  icon, label, sub, onClick,
}: { icon: string; label: string; sub?: string; onClick: () => void }) {
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

function ToggleRow({ icon, label, sub, enabled, onToggle }: {
  icon: string; label: string; sub?: string; enabled: boolean; onToggle: (v: boolean) => void
}) {
  return (
    <div className="w-full flex items-center justify-between p-5">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className="text-left">
          <p className="font-medium text-on-surface">{label}</p>
          {sub && <p className="text-sm text-on-surface-variant">{sub}</p>}
        </div>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onToggle(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-outline-variant'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-outline-variant/10 last:border-0">
      <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">{label}</p>
      <p className="text-sm font-medium text-on-surface mt-0.5">{value}</p>
    </div>
  )
}

function BottomSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-on-background/40 backdrop-blur-sm" />
      <div
        className="relative bg-surface rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-outline-variant/30 rounded-full mx-auto mb-5" />
        {children}
      </div>
    </div>
  )
}

type ActiveSheet = null | 'vehicle' | 'docs' | 'personal' | 'payout'

export default function RiderSettingsPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const [profile, setProfile] = useState<RiderProfileData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null)
  const [pushEnabled, setPushEnabled] = useState(true)

  // Vehicle edit state
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleSaving, setVehicleSaving] = useState(false)

  // Payout edit state
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [payoutSaving, setPayoutSaving] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
  }, [isAuthenticated, role, router])

  useEffect(() => {
    const stored = localStorage.getItem('push-notifications')
    if (stored !== null) setPushEnabled(stored !== 'false')
  }, [])

  useEffect(() => {
    if (!isAuthenticated || role !== 'RIDER') return
    api.get('/riders/me')
      .then(({ data }) => {
        setProfile(data)
        setVehicleModel(data.bikeMakeModel ?? '')
        setBankName(data.bankName ?? '')
        setBankAccountNumber(data.bankAccountNumber ?? '')
        setBankAccountName(data.bankAccountName ?? '')
      })
      .catch(() => {})
  }, [isAuthenticated, role])

  function handleLogout() {
    if (!confirm('Are you sure you want to log out?')) return
    clearAuth()
    router.replace('/welcome')
  }

  function togglePush(enabled: boolean) {
    setPushEnabled(enabled)
    localStorage.setItem('push-notifications', String(enabled))
    toast.success(enabled ? 'Push notifications enabled' : 'Push notifications disabled')
  }

  async function saveVehicle() {
    setVehicleSaving(true)
    try {
      await api.patch('/riders/me', { bikeMakeModel: vehicleModel })
      setProfile((prev) => prev ? { ...prev, bikeMakeModel: vehicleModel } : prev)
      toast.success('Vehicle details saved')
      setActiveSheet(null)
    } catch {
      toast.error('Could not save vehicle details')
    } finally {
      setVehicleSaving(false)
    }
  }

  async function savePayout() {
    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountName.trim()) {
      toast.error('Please fill in all bank details')
      return
    }
    setPayoutSaving(true)
    try {
      await api.patch('/riders/me', { bankName, bankAccountNumber, bankAccountName })
      setProfile((prev) => prev ? { ...prev, bankName, bankAccountNumber, bankAccountName } : prev)
      toast.success('Payout details saved')
      setActiveSheet(null)
    } catch {
      toast.error('Could not save payout details')
    } finally {
      setPayoutSaving(false)
    }
  }

  const riderName = profile?.user?.name ?? 'Rider'
  const riderPhone = profile?.user?.phone ?? ''
  const ratingDisplay = Number(profile?.rating ?? 5).toFixed(1)
  const vehicleTypeSub = profile?.bikeMakeModel
    ? `${profile.riderType} · ${profile.bikeMakeModel}`
    : (profile?.riderType ?? 'Not set')
  const payoutSub = profile?.bankName
    ? `${profile.bankName} ···· ${(profile.bankAccountNumber ?? '').slice(-4)}`
    : 'Not configured'

  return (
    <ScreenWrapper>
      {/* ── Header ── */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm shadow-emerald-900/5 sticky top-0 z-50 flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1 -ml-1 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-emerald-900">menu</span>
          </button>
          <h1 className="font-headline font-bold text-lg tracking-tight text-emerald-900">Settings</h1>
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
                <h2 className="font-headline font-extrabold text-3xl text-white">{riderName}</h2>
                <p className="text-on-primary-container mt-1 text-sm">{riderPhone}</p>
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
                <span className="font-bold text-on-surface">{ratingDisplay}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-8 pb-4">
          {/* Vehicle */}
          <section>
            <h3 className="font-headline font-bold text-xl text-on-surface mb-3 px-1">Vehicle &amp; Bike Details</h3>
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden divide-y divide-outline-variant/10">
              <SettingsRow
                icon="pedal_bike"
                label="Primary Vehicle"
                sub={vehicleTypeSub}
                onClick={() => setActiveSheet('vehicle')}
              />
              <SettingsRow
                icon="description"
                label="Vehicle Documents"
                sub="Insurance, registration &amp; photos"
                onClick={() => setActiveSheet('docs')}
              />
            </div>
          </section>

          {/* Account */}
          <section>
            <h3 className="font-headline font-bold text-xl text-on-surface mb-3 px-1">Account Settings</h3>
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden divide-y divide-outline-variant/10">
              <SettingsRow
                icon="person"
                label="Personal Information"
                sub={riderName}
                onClick={() => setActiveSheet('personal')}
              />
              <SettingsRow
                icon="payments"
                label="Payout Methods"
                sub={payoutSub}
                onClick={() => setActiveSheet('payout')}
              />
              <SettingsRow
                icon="security"
                label="Security &amp; Password"
                onClick={() => router.push('/rider/settings/change-password')}
              />
            </div>
          </section>

          {/* Navigation */}
          <section>
            <h3 className="font-headline font-bold text-xl text-on-surface mb-3 px-1">Navigation Preferences</h3>
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden divide-y divide-outline-variant/10">
              <SettingsRow icon="map" label="Navigation App" sub="Google Maps" onClick={() => router.push('/rider/settings/navigation')} />
              <SettingsRow icon="directions_bike" label="Sound &amp; Haptics" onClick={() => router.push('/rider/settings/sounds')} />
            </div>
          </section>

          {/* App settings */}
          <section>
            <h3 className="font-headline font-bold text-xl text-on-surface mb-3 px-1">App Settings</h3>
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden divide-y divide-outline-variant/10">
              <ToggleRow
                icon="notifications_active"
                label="Push Notifications"
                enabled={pushEnabled}
                onToggle={togglePush}
              />
              <SettingsRow icon="gavel" label="Legal" onClick={() => router.push('/shared/legal')} />
              <SettingsRow icon="privacy_tip" label="Privacy Policy" onClick={() => router.push('/shared/privacy')} />
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">info</span>
                  </div>
                  <p className="font-medium text-on-surface">Version</p>
                </div>
                <span className="text-sm text-on-surface-variant font-mono">1.0.0</span>
              </div>
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

      {/* ── Side Drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[100] flex" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-on-background/30 backdrop-blur-sm" />
          <div className="relative w-72 bg-surface h-full shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-primary p-6 pt-14">
              <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center mb-3">
                <span className="font-headline font-bold text-xl text-on-primary">
                  {riderName.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="font-headline font-bold text-on-primary">{riderName}</p>
              <span className={`mt-1 inline-block px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-widest ${profile?.isOnline ? 'bg-primary-fixed/20 text-primary-fixed' : 'bg-white/10 text-on-primary/60'}`}>
                {profile?.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {[
                { icon: 'home', label: 'Dashboard', href: '/rider/home' },
                { icon: 'payments', label: 'Earnings', href: '/rider/earnings' },
                { icon: 'history', label: 'Trip History', href: '/rider/history' },
                { icon: 'support_agent', label: 'Support', href: '/shared/support' },
                { icon: 'info', label: 'About', href: '/shared/about' },
              ].map((link) => (
                <button
                  key={link.label}
                  onClick={() => { setDrawerOpen(false); router.push(link.href) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container-low transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-on-surface-variant">{link.icon}</span>
                  <span className="text-sm font-medium text-on-surface">{link.label}</span>
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-outline-variant/20">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-error-container transition-colors"
              >
                <span className="material-symbols-outlined text-error">logout</span>
                <span className="text-sm font-medium text-error">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Primary Vehicle Sheet ── */}
      {activeSheet === 'vehicle' && (
        <BottomSheet onClose={() => setActiveSheet(null)}>
          <h2 className="font-headline font-bold text-lg text-on-surface mb-1">Primary Vehicle</h2>
          <p className="text-sm text-on-surface-variant mb-6">Enter your bike make and model for riders and customers.</p>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">
                Rider Type
              </label>
              <div className="w-full px-4 py-3.5 rounded-xl bg-surface-container-low text-sm text-on-surface-variant">
                {profile?.riderType ?? 'MARKETPLACE'}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">
                Bike Make &amp; Model
              </label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="e.g. Honda CB 125F"
                className="w-full px-4 py-3.5 rounded-xl bg-surface-container-low border border-transparent focus:border-primary/40 focus:outline-none text-sm text-on-surface placeholder:text-outline"
              />
            </div>
            <button
              onClick={saveVehicle}
              disabled={vehicleSaving}
              className="w-full py-4 bg-primary text-on-primary font-bold rounded-xl active:scale-95 transition-all disabled:opacity-60"
            >
              {vehicleSaving ? 'Saving…' : 'Save Vehicle Details'}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ── Vehicle Documents Sheet ── */}
      {activeSheet === 'docs' && (
        <BottomSheet onClose={() => setActiveSheet(null)}>
          <h2 className="font-headline font-bold text-lg text-on-surface mb-5">Vehicle Documents</h2>
          <div className="space-y-4">
            {profile?.bikePapers ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Bike Papers / Registration</p>
                <div className="rounded-xl overflow-hidden border border-outline-variant/20">
                  <img src={profile.bikePapers} alt="Bike papers" className="w-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl">
                <span className="material-symbols-outlined text-on-surface-variant">description</span>
                <p className="text-sm text-on-surface-variant">No bike papers uploaded yet</p>
              </div>
            )}
            {(profile?.bikePhotoFront || profile?.bikePhotoSide || profile?.bikePhotoPlate) && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Bike Photos</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { img: profile?.bikePhotoFront, label: 'Front' },
                    { img: profile?.bikePhotoSide, label: 'Side' },
                    { img: profile?.bikePhotoPlate, label: 'Plate' },
                  ].map(({ img, label }) => img ? (
                    <div key={label} className="space-y-1">
                      <div className="aspect-[4/3] rounded-lg overflow-hidden border border-outline-variant/20">
                        <img src={img} alt={label} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[10px] text-center text-on-surface-variant">{label}</p>
                    </div>
                  ) : null)}
                </div>
              </div>
            )}
            {!profile?.bikePapers && !profile?.bikePhotoFront && (
              <div className="text-center py-6 text-on-surface-variant text-sm">
                No documents uploaded. Complete KYC to upload your vehicle documents.
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {/* ── Personal Information Sheet ── */}
      {activeSheet === 'personal' && (
        <BottomSheet onClose={() => setActiveSheet(null)}>
          <h2 className="font-headline font-bold text-lg text-on-surface mb-5">Personal Information</h2>
          <div className="bg-surface-container-low rounded-xl p-4 space-y-1 divide-y divide-outline-variant/10">
            <InfoRow label="Full Name" value={riderName} />
            <InfoRow label="Phone Number" value={riderPhone} />
            {profile?.user?.email && <InfoRow label="Email" value={profile.user.email} />}
          </div>
          <p className="text-xs text-on-surface-variant mt-4 text-center">
            To update your name or phone number, contact support.
          </p>
          <button
            onClick={() => router.push('/shared/support')}
            className="w-full mt-4 py-4 border border-primary text-primary font-bold rounded-xl active:scale-95 transition-all"
          >
            Contact Support
          </button>
        </BottomSheet>
      )}

      {/* ── Payout Methods Sheet ── */}
      {activeSheet === 'payout' && (
        <BottomSheet onClose={() => setActiveSheet(null)}>
          <h2 className="font-headline font-bold text-lg text-on-surface mb-1">Payout Methods</h2>
          <p className="text-sm text-on-surface-variant mb-6">Your earnings are paid to this bank account after each delivery.</p>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. GTBank"
                className="w-full px-4 py-3.5 rounded-xl bg-surface-container-low border border-transparent focus:border-primary/40 focus:outline-none text-sm text-on-surface placeholder:text-outline"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">Account Number</label>
              <input
                type="text"
                inputMode="numeric"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="10-digit account number"
                maxLength={10}
                className="w-full px-4 py-3.5 rounded-xl bg-surface-container-low border border-transparent focus:border-primary/40 focus:outline-none text-sm text-on-surface placeholder:text-outline"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">Account Name</label>
              <input
                type="text"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="Account holder name"
                className="w-full px-4 py-3.5 rounded-xl bg-surface-container-low border border-transparent focus:border-primary/40 focus:outline-none text-sm text-on-surface placeholder:text-outline"
              />
            </div>
            <button
              onClick={savePayout}
              disabled={payoutSaving}
              className="w-full py-4 bg-primary text-on-primary font-bold rounded-xl active:scale-95 transition-all disabled:opacity-60"
            >
              {payoutSaving ? 'Saving…' : 'Save Payout Details'}
            </button>
          </div>
        </BottomSheet>
      )}
    </ScreenWrapper>
  )
}
