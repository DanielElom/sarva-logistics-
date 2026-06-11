/**
 * @page RegisterBusinessPage
 * @description Business account registration — company name, address, CAC document upload.
 * @route /register/business
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

type BizRole = 'VENDOR' | 'RESTAURANT' | 'CORPORATE'

const ROLE_META: Record<BizRole, { title: string; namePlaceholder: string; addressLabel: string; addressPlaceholder: string }> = {
  VENDOR: {
    title: 'Vendor Registration',
    namePlaceholder: 'e.g. Adeyemi Ventures Ltd',
    addressLabel: 'Store Address',
    addressPlaceholder: 'Full store address',
  },
  RESTAURANT: {
    title: 'Restaurant Registration',
    namePlaceholder: 'e.g. Mama Cass Kitchen',
    addressLabel: 'Restaurant Address',
    addressPlaceholder: 'Restaurant full address',
  },
  CORPORATE: {
    title: 'Corporate Account Setup',
    namePlaceholder: 'e.g. Sterling Bank Plc',
    addressLabel: 'Company HQ Address',
    addressPlaceholder: 'Headquarters full address',
  },
}

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-on-surface-variant ml-1">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-4 py-3.5 bg-surface-container-low border border-transparent rounded-xl focus:border-primary/40 focus:outline-none transition-colors text-sm text-on-surface placeholder:text-outline'

interface Suggestion { description: string; lat: number; lng: number }

function AddressInput({
  label,
  required,
  value,
  placeholder,
  onChange,
}: {
  label: string
  required?: boolean
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreBlurRef = useRef(false)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); return }
    try {
      const { data } = await api.get(`/orders/places/autocomplete?input=${encodeURIComponent(q)}`)
      setSuggestions(data.suggestions ?? [])
    } catch { setSuggestions([]) }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    onChange(v)
    setOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 300)
  }

  function handleSelect(s: Suggestion) {
    ignoreBlurRef.current = true
    onChange(s.description)
    setSuggestions([])
    setOpen(false)
    setTimeout(() => { ignoreBlurRef.current = false }, 200)
  }

  function handleBlur() {
    if (ignoreBlurRef.current) return
    setTimeout(() => { setOpen(false); setSuggestions([]) }, 150)
  }

  return (
    <FormField label={label} required={required}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => { setOpen(true); if (value) fetchSuggestions(value) }}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={inputCls}
          autoComplete="off"
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(s)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-low active:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: '16px' }}>location_on</span>
                  <span className="text-sm text-on-surface truncate">{s.description}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FormField>
  )
}

export default function BusinessRegisterPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role) as BizRole | null

  const [companyName, setCompanyName] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [cacNumber, setCacNumber] = useState('')
  const [cacFile, setCacFile] = useState<File | null>(null)
  const [cacDataUrl, setCacDataUrl] = useState<string | null>(null)
  const [pickupAddress, setPickupAddress] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactDesignation, setContactDesignation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (!role || !['VENDOR', 'RESTAURANT', 'CORPORATE'].includes(role)) {
      router.replace('/home'); return
    }
    // Check existing business account status
    api.get('/users/me').then(({ data }) => {
      if (data.businessAccount?.verificationStatus === 'VERIFIED') {
        router.replace('/business/dashboard')
      } else if (data.businessAccount) {
        router.replace('/status/under-review')
      }
    }).catch(() => null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isAuthenticated || !role || !['VENDOR', 'RESTAURANT', 'CORPORATE'].includes(role)) return null

  const meta = ROLE_META[role]

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB'); return }
    setCacFile(file)
    const reader = new FileReader()
    reader.onload = () => setCacDataUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit() {
    if (!companyName.trim()) { toast.error('Business name is required'); return }
    if (!businessEmail.trim()) { toast.error('Business email is required'); return }
    if (!businessPhone.trim()) { toast.error('Business phone is required'); return }
    if (!businessAddress.trim()) { toast.error('Business address is required'); return }
    if (!cacNumber.trim()) { toast.error('CAC registration number is required'); return }
    if (!cacDataUrl) { toast.error('Please upload your CAC document'); return }

    setSubmitting(true)
    try {
      await api.post('/users/me/business', {
        companyName: companyName.trim(),
        businessAddress: businessAddress.trim(),
        cacDocument: cacDataUrl,
        email: businessEmail.trim(),
        phone: businessPhone.trim(),
        ...(role === 'RESTAURANT' && pickupAddress ? { pickupAddress: pickupAddress.trim() } : {}),
        ...(role === 'CORPORATE' && contactPerson ? { contactPerson: contactPerson.trim() } : {}),
        ...(role === 'CORPORATE' && contactDesignation ? { contactDesignation: contactDesignation.trim() } : {}),
      })
      toast.success('Application submitted!')
      router.replace('/status/under-review')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not submit application'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScreenWrapper>
      {/* header */}
      <header className="sticky top-0 z-30 bg-[#f8faf4] flex items-center justify-between px-6 py-4 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-primary hover:bg-surface-container-high rounded-full active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
              arrow_back
            </span>
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Step 02</p>
            <h1 className="font-['Manrope'] font-bold text-lg text-primary leading-tight">{meta.title}</h1>
          </div>
        </div>
        <button className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>help_outline</span>
        </button>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-6 pb-32 space-y-8">
        {/* why verify banner */}
        <div className="flex items-start gap-3 bg-primary/5 rounded-2xl p-4">
          <span className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>
            verified
          </span>
          <p className="text-sm text-on-surface leading-relaxed">
            Verification helps us maintain a secure ecosystem for Fair-Ride business partners. Your documents are encrypted and stored securely.
          </p>
        </div>

        {/* ── Section 01: Company Profile ── */}
        <section className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-outline-variant/15">
            <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">01</span>
            <h2 className="font-['Manrope'] font-bold text-on-surface">Company Profile</h2>
          </div>
          <div className="px-6 py-5 space-y-5">
            <FormField label={role === 'CORPORATE' ? 'Company Name' : role === 'RESTAURANT' ? 'Restaurant Name' : 'Store Name'} required>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={meta.namePlaceholder}
                className={inputCls}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Business Email" required>
                <input
                  type="email"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  placeholder="business@company.com"
                  className={inputCls}
                />
              </FormField>
              <FormField label="Business Phone" required>
                <input
                  type="tel"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className={inputCls}
                />
              </FormField>
            </div>

            <AddressInput
              label={meta.addressLabel}
              required
              value={businessAddress}
              placeholder={meta.addressPlaceholder}
              onChange={setBusinessAddress}
            />

            {/* Restaurant-only: pickup location */}
            {role === 'RESTAURANT' && (
              <AddressInput
                label="Pickup Location"
                value={pickupAddress}
                placeholder="Where should riders collect orders?"
                onChange={setPickupAddress}
              />
            )}

            {/* Corporate-only: contact person */}
            {role === 'CORPORATE' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Contact Person">
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Full name"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Designation">
                  <input
                    type="text"
                    value={contactDesignation}
                    onChange={(e) => setContactDesignation(e.target.value)}
                    placeholder="e.g. Operations Manager"
                    className={inputCls}
                  />
                </FormField>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 02: Compliance Documents ── */}
        <section className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-outline-variant/15">
            <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">02</span>
            <h2 className="font-['Manrope'] font-bold text-on-surface">Compliance Documents</h2>
          </div>
          <div className="px-6 py-5 space-y-5">
            <FormField label="CAC Registration Number" required>
              <input
                type="text"
                value={cacNumber}
                onChange={(e) => setCacNumber(e.target.value)}
                placeholder="e.g. RC-1234567"
                className={inputCls}
              />
            </FormField>

            <FormField label="CAC Registration Document" required>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
              {!cacFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-outline-variant/40 bg-surface-container-low rounded-xl hover:border-primary/50 hover:bg-surface-container transition-colors active:scale-[0.99]"
                >
                  <span
                    className="material-symbols-outlined text-primary mb-2"
                    style={{ fontVariationSettings: "'FILL' 1", fontSize: '36px' }}
                  >
                    cloud_upload
                  </span>
                  <p className="text-sm font-semibold text-on-surface mb-1">Click to upload or drag and drop</p>
                  <p className="text-xs text-on-surface-variant">PDF, PNG, or JPG — max 10 MB</p>
                </button>
              ) : (
                <div className="flex items-center justify-between px-4 py-3.5 bg-primary/5 border border-primary/20 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="material-symbols-outlined text-primary flex-shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}
                    >
                      insert_drive_file
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{cacFile.name}</p>
                      <p className="text-xs text-on-surface-variant">{(cacFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setCacFile(null); setCacDataUrl(null) }}
                    className="text-on-surface-variant hover:text-error active:scale-90 transition-colors flex-shrink-0 ml-2"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2 px-2">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: '14px' }}>info</span>
                <p className="text-[11px] text-on-surface-variant">Your documents are encrypted and stored securely.</p>
              </div>
            </FormField>
          </div>
        </section>

        {/* terms */}
        <p className="text-center text-xs text-on-surface-variant px-4">
          By proceeding, you agree to Fair-Ride's{' '}
          <button onClick={() => toast('Coming soon', { icon: '📄' })} className="text-primary font-bold underline underline-offset-2">
            Business Terms of Service
          </button>
          .
        </p>
      </main>

      {/* fixed footer */}
      <div className="fixed bottom-0 left-0 w-full px-6 pb-8 pt-4 glass-nav z-30">
        <div className="max-w-xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-5 rounded-xl font-['Manrope'] font-bold text-lg text-white shadow-xl active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)' }}
          >
            {submitting && <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {submitting ? 'Submitting…' : 'Save and Continue'}
            {!submitting && <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_forward</span>}
          </button>
        </div>
      </div>
    </ScreenWrapper>
  )
}
