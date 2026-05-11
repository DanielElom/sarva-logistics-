/**
 * @page BusinessSettingsPage
 * @description Business account settings — company info, billing, team members.
 * @route /business/settings
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

interface BusinessAccount {
  id: string
  companyName: string
  businessAddress: string
  email: string | null
  phone: string | null
  contactPerson: string | null
  contactDesignation: string | null
  pickupAddress: string | null
  cacDocument: string
  verificationStatus: string
}

interface UserMe {
  id: string
  name: string | null
  phone: string
  role: string
  verificationStatus: string
  businessAccount: BusinessAccount | null
}

const inputCls =
  'w-full px-4 py-3.5 bg-surface-container-low border border-transparent rounded-xl focus:border-primary/40 focus:outline-none transition-colors text-sm text-on-surface placeholder:text-outline'

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden ${className}`}>
      {children}
    </section>
  )
}

function SectionTitle({ number, title }: { number?: string; title: string }) {
  return (
    <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-outline-variant/15">
      {number && (
        <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
          {number}
        </span>
      )}
      <h2 className="font-['Manrope'] font-bold text-on-surface">{title}</h2>
    </div>
  )
}

function RowLink({ icon, label, sublabel, onClick }: { icon: string; label: string; sublabel?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-container-low active:scale-[0.99] transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>{icon}</span>
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-on-surface">{label}</p>
          {sublabel && <p className="text-xs text-on-surface-variant mt-0.5">{sublabel}</p>}
        </div>
      </div>
      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>chevron_right</span>
    </button>
  )
}

function BusinessAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="relative">
      <div className="w-24 h-24 rounded-2xl bg-primary/10 border-4 border-surface flex items-center justify-center shadow-lg">
        <span className="font-['Manrope'] font-extrabold text-2xl text-primary">{initials}</span>
      </div>
      <div className="absolute -bottom-1 -right-1 bg-primary p-1.5 rounded-xl border-2 border-surface">
        <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1", fontSize: '14px' }}>verified</span>
      </div>
    </div>
  )
}

export default function BusinessSettingsPage() {
  const router = useRouter()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const role = useAuthStore((s) => s.role)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [user, setUser] = useState<UserMe | null>(null)
  const [loading, setLoading] = useState(true)

  // editable fields
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactDesignation, setContactDesignation] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (!role || !['VENDOR', 'RESTAURANT', 'CORPORATE'].includes(role)) {
      router.replace('/home'); return
    }
    api.get<UserMe>('/users/me').then(({ data }) => {
      setUser(data)
      if (data.verificationStatus !== 'APPROVED') {
        router.replace('/status/under-review'); return
      }
      const biz = data.businessAccount
      if (biz) {
        setCompanyName(biz.companyName)
        setEmail(biz.email ?? '')
        setPhone(biz.phone ?? '')
        setBusinessAddress(biz.businessAddress)
        setContactPerson(biz.contactPerson ?? '')
        setContactDesignation(biz.contactDesignation ?? '')
        setPickupAddress(biz.pickupAddress ?? '')
      }
    }).catch(() => null).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isAuthenticated || !role || !['VENDOR', 'RESTAURANT', 'CORPORATE'].includes(role)) return null

  const biz = user?.businessAccount

  async function handleSave() {
    if (!companyName.trim()) { toast.error('Business name is required'); return }
    if (!businessAddress.trim()) { toast.error('Business address is required'); return }
    setSaving(true)
    try {
      const payload: Record<string, string> = {
        companyName: companyName.trim(),
        businessAddress: businessAddress.trim(),
        cacDocument: biz?.cacDocument ?? '',
        ...(email ? { email: email.trim() } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(role === 'CORPORATE' && contactPerson ? { contactPerson: contactPerson.trim() } : {}),
        ...(role === 'CORPORATE' && contactDesignation ? { contactDesignation: contactDesignation.trim() } : {}),
        ...(role === 'RESTAURANT' && pickupAddress ? { pickupAddress: pickupAddress.trim() } : {}),
      }
      await api.post('/users/me/business', payload)
      toast.success('Profile updated')
      setEditing(false)
      const { data } = await api.get<UserMe>('/users/me')
      setUser(data)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not save changes'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    clearAuth()
    router.replace('/welcome')
  }

  const roleLabel = role === 'RESTAURANT' ? 'Restaurant' : role === 'CORPORATE' ? 'Corporate Account' : 'Vendor'

  return (
    <ScreenWrapper>
      <NavigationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* header */}
      <header className="sticky top-0 z-30 bg-[#f8faf4] flex items-center justify-between px-6 py-4 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 text-primary active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>menu</span>
          </button>
          <h1 className="font-['Manrope'] font-bold text-lg text-primary">Business Profile</h1>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-1.5 rounded-xl text-sm font-bold text-primary bg-primary/8 active:scale-95 transition-transform"
          >
            Edit
          </button>
        ) : (
          <button
            onClick={() => { setEditing(false) }}
            className="px-4 py-1.5 rounded-xl text-sm font-bold text-on-surface-variant bg-surface-container-high active:scale-95 transition-transform"
          >
            Cancel
          </button>
        )}
      </header>

      <main className="max-w-xl mx-auto px-6 pt-6 pb-32 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* business avatar + name */}
            <div className="flex flex-col items-center text-center pt-2 pb-6">
              <BusinessAvatar name={companyName || 'BIZ'} />
              <h2 className="mt-4 font-['Manrope'] font-extrabold text-xl text-on-surface">{companyName || '—'}</h2>
              <span className="mt-1 px-3 py-1 bg-primary/8 text-primary text-xs font-bold rounded-full">{roleLabel}</span>
              {biz && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-semibold text-green-600">Verified Account</span>
                </div>
              )}
            </div>

            {/* company profile */}
            <SectionCard>
              <SectionTitle number="01" title="Company Profile" />
              <div className="px-6 py-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                    {role === 'CORPORATE' ? 'Company Name' : role === 'RESTAURANT' ? 'Restaurant Name' : 'Store Name'}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={inputCls}
                    />
                  ) : (
                    <p className="text-sm text-on-surface px-4 py-3.5 bg-surface-container-low rounded-xl">{companyName || '—'}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Email</label>
                    {editing ? (
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                    ) : (
                      <p className="text-sm text-on-surface px-4 py-3.5 bg-surface-container-low rounded-xl truncate">{email || '—'}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Phone</label>
                    {editing ? (
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                    ) : (
                      <p className="text-sm text-on-surface px-4 py-3.5 bg-surface-container-low rounded-xl truncate">{phone || '—'}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                    {role === 'CORPORATE' ? 'HQ Address' : role === 'RESTAURANT' ? 'Restaurant Address' : 'Store Address'}
                  </label>
                  {editing ? (
                    <textarea
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      rows={3}
                      className={`${inputCls} resize-none`}
                    />
                  ) : (
                    <p className="text-sm text-on-surface px-4 py-3.5 bg-surface-container-low rounded-xl">{businessAddress || '—'}</p>
                  )}
                </div>

                {role === 'RESTAURANT' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Pickup Location</label>
                    {editing ? (
                      <input type="text" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} className={inputCls} />
                    ) : (
                      <p className="text-sm text-on-surface px-4 py-3.5 bg-surface-container-low rounded-xl">{pickupAddress || '—'}</p>
                    )}
                  </div>
                )}

                {role === 'CORPORATE' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Contact Person</label>
                      {editing ? (
                        <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className={inputCls} />
                      ) : (
                        <p className="text-sm text-on-surface px-4 py-3.5 bg-surface-container-low rounded-xl truncate">{contactPerson || '—'}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Designation</label>
                      {editing ? (
                        <input type="text" value={contactDesignation} onChange={(e) => setContactDesignation(e.target.value)} className={inputCls} />
                      ) : (
                        <p className="text-sm text-on-surface px-4 py-3.5 bg-surface-container-low rounded-xl truncate">{contactDesignation || '—'}</p>
                      )}
                    </div>
                  </div>
                )}

                {editing && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-4 rounded-xl font-['Manrope'] font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)' }}
                  >
                    {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                )}
              </div>
            </SectionCard>

            {/* subscription */}
            <SectionCard>
              <SectionTitle number="02" title="Subscription" />
              <div className="px-6 py-5">
                <RowLink
                  icon="workspace_premium"
                  label="Manage Plan"
                  sublabel="View or upgrade your subscription"
                  onClick={() => router.push('/subscriptions')}
                />
              </div>
            </SectionCard>

            {/* documents */}
            <SectionCard>
              <SectionTitle number="03" title="Compliance Documents" />
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>gavel</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">CAC Registration Document</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">Certificate of Incorporation</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full">Verified</span>
                </div>

                <div className="flex items-center gap-2 px-2">
                  <span className="material-symbols-outlined text-secondary" style={{ fontSize: '14px' }}>info</span>
                  <p className="text-[11px] text-on-surface-variant">To update your CAC document, contact support.</p>
                </div>
              </div>
            </SectionCard>

            {/* personal profile link */}
            <SectionCard>
              <SectionTitle title="Account" />
              <div className="divide-y divide-outline-variant/15">
                <RowLink
                  icon="person"
                  label="Personal Profile"
                  sublabel="Edit name, phone, password"
                  onClick={() => router.push('/settings')}
                />
                <RowLink
                  icon="support_agent"
                  label="Help & Support"
                  sublabel="FAQs and contact options"
                  onClick={() => router.push('/shared/support')}
                />
              </div>
            </SectionCard>

            {/* danger zone */}
            <SectionCard>
              <div className="px-6 py-5">
                {!showLogoutConfirm ? (
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full flex items-center gap-4 p-4 bg-error/5 rounded-xl active:scale-[0.99] transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>logout</span>
                    </div>
                    <span className="text-sm font-semibold text-error">Sign Out</span>
                  </button>
                ) : (
                  <div className="bg-error/5 rounded-xl p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-error flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}>warning</span>
                      <div>
                        <p className="font-['Manrope'] font-bold text-on-surface text-sm">Sign out of Fair-Ride?</p>
                        <p className="text-xs text-on-surface-variant mt-1">You'll need to sign in again to manage your business account.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowLogoutConfirm(false)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-on-surface bg-surface-container-high active:scale-95"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-error active:scale-95"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          </>
        )}
      </main>

      <BottomNav />
    </ScreenWrapper>
  )
}
