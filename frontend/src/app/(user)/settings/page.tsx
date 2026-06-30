/**
 * @page UserSettingsPage
 * @description Customer account settings — profile, notifications, security.
 * @route /settings
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import BottomNav from '@/components/ui/BottomNav'
import NavigationDrawer from '@/components/layout/NavigationDrawer'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

interface UserProfile {
  id: string
  name: string | null
  email: string | null
  phone: string
  status: string
  role: string
  profilePhoto?: string | null
}

type NotifKey = 'order_updates' | 'promotions' | 'security_alerts'

const NOTIF_ITEMS: { key: NotifKey; label: string; body: string; icon: string }[] = [
  { key: 'order_updates', label: 'Order Updates', body: 'Pickup, delivery, and status changes', icon: 'package_2' },
  { key: 'promotions', label: 'Promotions', body: 'Deals, promo codes, and offers', icon: 'local_offer' },
  { key: 'security_alerts', label: 'Security Alerts', body: 'Login attempts and password changes', icon: 'security' },
]

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={[
        'relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0',
        on ? 'bg-primary' : 'bg-outline-variant/50',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200',
          on ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  )
}

function Avatar({
  name,
  photoSrc,
  uploading,
  onClick,
}: {
  name: string
  photoSrc: string | null
  uploading: boolean
  onClick: () => void
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative focus:outline-none active:scale-95 transition-transform"
      aria-label="Change profile photo"
    >
      <div className="w-20 h-20 rounded-full bg-primary/10 border-4 border-surface shadow-md overflow-hidden">
        {photoSrc ? (
          <img src={photoSrc} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-['Manrope'] font-extrabold text-2xl text-primary">{initials}</span>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 right-0 bg-primary p-1.5 rounded-full border-2 border-surface flex items-center justify-center">
        {uploading ? (
          <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin block" />
        ) : (
          <span
            className="material-symbols-outlined text-white"
            style={{ fontVariationSettings: "'FILL' 1", fontSize: '12px' }}
          >
            photo_camera
          </span>
        )}
      </div>
    </button>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1 mb-2">
      {title}
    </h2>
  )
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const timeout = setTimeout(() => reject(new Error('Image read timed out')), 15000)
    reader.onerror = () => { clearTimeout(timeout); reject(new Error('Failed to read image')) }
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => { clearTimeout(timeout); reject(new Error('Failed to load image')) }
      img.onload = () => {
        clearTimeout(timeout)
        const MAX = 800
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX }
          else { width = Math.round((width * MAX) / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function SettingsPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const storeUser = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setAuth = useAuthStore((s) => s.setAuth)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [nameVal, setNameVal] = useState('')
  const [emailVal, setEmailVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showLogoutSheet, setShowLogoutSheet] = useState(false)
  const [showDeleteSheet, setShowDeleteSheet] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [notifs, setNotifs] = useState<Record<NotifKey, boolean>>({
    order_updates: true,
    promotions: false,
    security_alerts: true,
  })
  const [photoSrc, setPhotoSrc] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const initialised = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role === 'RIDER') { router.replace('/rider/home'); return }
    if (role === 'ADMIN') { router.replace('/admin/dashboard'); return }

    // Load notification prefs from localStorage
    try {
      const saved = localStorage.getItem('fair-ride-notif-prefs')
      if (saved) setNotifs(JSON.parse(saved))
    } catch {}

    // Fetch fresh profile
    api
      .get('/users/me')
      .then(({ data }) => {
        setProfile(data)
        setNameVal(data.name ?? '')
        setEmailVal(data.email ?? '')
        if (data.profilePhoto) setPhotoSrc(data.profilePhoto)
      })
      .catch(() => {
        if (storeUser) {
          setNameVal(storeUser.name ?? '')
          if (storeUser.profilePhoto) setPhotoSrc(storeUser.profilePhoto)
        }
      })

    initialised.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isAuthenticated) return null

  function toggleNotif(key: NotifKey, val: boolean) {
    const next = { ...notifs, [key]: val }
    setNotifs(next)
    try { localStorage.setItem('fair-ride-notif-prefs', JSON.stringify(next)) } catch {}
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPhotoUploading(true)
    try {
      const compressed = await compressImage(file)
      setPhotoSrc(compressed)
      const { data } = await api.patch('/users/me', { profilePhoto: compressed })
      useAuthStore.setState((s) => ({
        user: s.user ? { ...s.user, profilePhoto: data.profilePhoto } : s.user,
      }))
      toast.success('Profile photo updated')
    } catch {
      toast.error('Could not upload photo. Please try again.')
      setPhotoSrc(null)
    } finally {
      setPhotoUploading(false)
    }
  }

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const { data } = await api.patch('/users/me', {
        name: nameVal.trim() || undefined,
        email: emailVal.trim() || undefined,
      })
      setProfile(data)
      if (storeUser) {
        setAuth({ ...storeUser, name: data.name }, useAuthStore.getState().token ?? '')
      }
      setEditing(false)
      toast.success('Profile updated')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not update profile'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    clearAuth()
    router.replace('/welcome')
  }

  const displayName = profile?.name ?? storeUser?.name ?? 'User'
  const displayPhone = profile?.phone ?? storeUser?.phone ?? '—'
  const displayRole = (profile?.role ?? storeUser?.role ?? '').replace(/_/g, ' ')

  return (
    <ScreenWrapper>
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoChange}
      />

      {/* header */}
      <header className="sticky top-0 z-30 bg-[#f8faf4] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 text-primary hover:bg-surface-container-high rounded-full active:scale-95 transition-transform"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>menu</span>
          </button>
          <h1 className="font-['Manrope'] font-extrabold text-primary italic text-xl tracking-tight">
            Profile
          </h1>
        </div>
        <button
          onClick={() => setEditing((e) => !e)}
          className="text-primary font-bold text-sm active:opacity-70 transition-opacity"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-2 pb-32 space-y-6">
        {/* profile header card */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
          <Avatar
            name={displayName}
            photoSrc={photoSrc}
            uploading={photoUploading}
            onClick={() => fileInputRef.current?.click()}
          />
          <p className="text-[10px] text-on-surface-variant mt-2 mb-1">Tap photo to change</p>
          <h2 className="font-['Manrope'] font-bold text-xl text-on-surface mb-0.5">
            {displayName}
          </h2>
          <p className="text-on-surface-variant text-sm">{displayPhone}</p>
          <span className="mt-2 inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">
            {displayRole}
          </span>
        </div>

        {/* personal info */}
        <div>
          <SectionHeader title="Personal Information" />
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden divide-y divide-outline-variant/15">
            {/* name */}
            <div className="px-5 py-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                Full Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-surface-container-low px-4 py-3 rounded-xl text-sm text-on-surface border border-transparent focus:border-primary/30 focus:outline-none transition-colors"
                />
              ) : (
                <p className="text-sm font-semibold text-on-surface">{displayName}</p>
              )}
            </div>

            {/* email */}
            <div className="px-5 py-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                Email Address
              </label>
              {editing ? (
                <input
                  type="email"
                  value={emailVal}
                  onChange={(e) => setEmailVal(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-surface-container-low px-4 py-3 rounded-xl text-sm text-on-surface border border-transparent focus:border-primary/30 focus:outline-none transition-colors"
                />
              ) : (
                <p className="text-sm font-semibold text-on-surface">
                  {profile?.email ?? <span className="text-outline italic">Not set</span>}
                </p>
              )}
            </div>

            {/* phone (read-only) */}
            <div className="px-5 py-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                Phone Number
              </label>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-on-surface">{displayPhone}</p>
                <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-full">
                  Verified
                </span>
              </div>
            </div>

            {/* save button */}
            {editing && (
              <div className="px-5 py-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full py-3.5 rounded-xl font-['Manrope'] font-bold text-white text-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)' }}
                >
                  {saving && (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* security */}
        <div>
          <SectionHeader title="Security" />
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden divide-y divide-outline-variant/15">
            <button
              onClick={() => router.push('/settings/change-password')}
              className="w-full px-5 py-4 flex items-center justify-between active:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                  >
                    lock
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-on-surface">Password</p>
                  <p className="text-xs text-on-surface-variant">Change your account password</p>
                </div>
              </div>
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontVariationSettings: "'FILL' 0", fontSize: '20px' }}
              >
                chevron_right
              </span>
            </button>

            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                  >
                    smartphone
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">Two-Factor Auth</p>
                  <p className="text-xs text-on-surface-variant">OTP via phone — active</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* notifications */}
        <div>
          <SectionHeader title="Notifications" />
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden divide-y divide-outline-variant/15">
            {NOTIF_ITEMS.map((item) => (
              <div key={item.key} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                    <span
                      className="material-symbols-outlined text-on-surface-variant"
                      style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                    >
                      {item.icon}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">{item.label}</p>
                    <p className="text-xs text-on-surface-variant truncate">{item.body}</p>
                  </div>
                </div>
                <Toggle on={notifs[item.key]} onChange={(v) => toggleNotif(item.key, v)} />
              </div>
            ))}
          </div>
        </div>

        {/* saved addresses */}
        <div>
          <SectionHeader title="Saved Addresses" />
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden divide-y divide-outline-variant/15">
            <button className="w-full px-5 py-4 flex items-center gap-3 active:bg-surface-container-low transition-colors">
              <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                <span
                  className="material-symbols-outlined text-on-surface-variant"
                  style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                >
                  home
                </span>
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface">Home</p>
                <p className="text-xs text-on-surface-variant truncate">Not set</p>
              </div>
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontVariationSettings: "'FILL' 0", fontSize: '20px' }}
              >
                add
              </span>
            </button>
            <button className="w-full px-5 py-4 flex items-center gap-3 active:bg-surface-container-low transition-colors">
              <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                <span
                  className="material-symbols-outlined text-on-surface-variant"
                  style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                >
                  work
                </span>
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface">Work</p>
                <p className="text-xs text-on-surface-variant truncate">Not set</p>
              </div>
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontVariationSettings: "'FILL' 0", fontSize: '20px' }}
              >
                add
              </span>
            </button>
          </div>
        </div>

        {/* danger zone */}
        <div>
          <SectionHeader title="Account" />
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden divide-y divide-outline-variant/15">
            <button
              onClick={() => setShowLogoutSheet(true)}
              className="w-full px-5 py-4 flex items-center gap-3 active:bg-surface-container-low transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center flex-shrink-0">
                <span
                  className="material-symbols-outlined text-error"
                  style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                >
                  logout
                </span>
              </div>
              <p className="text-sm font-semibold text-error">Log Out</p>
            </button>
            <button
              onClick={() => setShowDeleteSheet(true)}
              className="w-full px-5 py-4 flex items-center gap-3 active:bg-surface-container-low transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center flex-shrink-0">
                <span
                  className="material-symbols-outlined text-error"
                  style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                >
                  delete_forever
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-error">Delete Account</p>
                <p className="text-xs text-on-surface-variant">This action is permanent</p>
              </div>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-on-surface-variant pt-2">
          Fair Ride v1.0 · Built with care 🌿
        </p>
      </main>

      <BottomNav />
      <NavigationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* logout sheet */}
      {showLogoutSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowLogoutSheet(false)}
          />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-3">
                <span
                  className="material-symbols-outlined text-error"
                  style={{ fontVariationSettings: "'FILL' 1", fontSize: '24px' }}
                >
                  logout
                </span>
              </div>
              <h3 className="font-['Manrope'] font-bold text-on-surface text-lg">Log Out?</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                You will need to sign in again to access your account.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowLogoutSheet(false)}
                className="py-3.5 rounded-xl border border-outline-variant/40 text-sm font-bold text-on-surface active:opacity-70"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="py-3.5 rounded-xl bg-error text-white text-sm font-bold active:opacity-80"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* delete account sheet */}
      {showDeleteSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDeleteSheet(false)}
          />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-3">
                <span
                  className="material-symbols-outlined text-error"
                  style={{ fontVariationSettings: "'FILL' 1", fontSize: '24px' }}
                >
                  warning
                </span>
              </div>
              <h3 className="font-['Manrope'] font-bold text-on-surface text-lg">Delete Account?</h3>
              <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
                All your data, orders, and history will be permanently deleted. This cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDeleteSheet(false)}
                className="py-3.5 rounded-xl border border-outline-variant/40 text-sm font-bold text-on-surface active:opacity-70"
              >
                Keep Account
              </button>
              <button
                onClick={() => {
                  toast('Account deletion — contact support', { icon: '⚠️' })
                  setShowDeleteSheet(false)
                }}
                className="py-3.5 rounded-xl bg-error text-white text-sm font-bold active:opacity-80"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenWrapper>
  )
}
