/**
 * @page RegisterProfilePage
 * @description Collects name and email to complete new user profile.
 * @route /register/profile
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import Input from '@/components/ui/Input'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'
import { suggestEmailCorrection } from '@/lib/email-typo-check'

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('234')) {
    const local = digits.slice(3, 13)
    if (local.length <= 3) return '+234 ' + local
    if (local.length <= 7) return '+234 ' + local.slice(0, 3) + ' ' + local.slice(3)
    return '+234 ' + local.slice(0, 3) + ' ' + local.slice(3, 7) + ' ' + local.slice(7)
  }
  if (digits.startsWith('0')) {
    const d = digits.slice(0, 11)
    if (d.length <= 4) return d
    if (d.length <= 8) return d.slice(0, 4) + ' ' + d.slice(4)
    return d.slice(0, 4) + ' ' + d.slice(4, 8) + ' ' + d.slice(8)
  }
  return raw
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 11) return '+234' + digits.slice(1)
  if (digits.startsWith('234') && digits.length === 13) return '+' + digits
  return phone.trim()
}

function isValidNigerianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return (
    (digits.startsWith('234') && digits.length === 13) ||
    (digits.startsWith('0') && digits.length === 11)
  )
}

type FieldErrors = { name?: string; email?: string; phone?: string }

export default function RegisterProfilePage() {
  const router = useRouter()
  const selectedRole = useAuthStore((s) => s.selectedRole)
  const setPendingProfile = useAuthStore((s) => s.setPendingProfile)
  const setPendingPhone = useAuthStore((s) => s.setPendingPhone)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null)

  useEffect(() => {
    if (selectedRole === null) {
      router.replace('/select-role')
    }
  }, [selectedRole, router])

  if (selectedRole === null) return null

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value))
    if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }))
  }

  function validate(): boolean {
    const next: FieldErrors = {}
    if (!fullName.trim() || fullName.trim().length < 2) {
      next.name = 'Full name must be at least 2 characters'
    }
    if (!email.trim()) {
      next.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Please enter a valid email address'
    }
    if (!phone.trim()) {
      next.phone = 'Phone number is required'
    } else if (!isValidNigerianPhone(phone)) {
      next.phone = 'Enter a valid Nigerian number (e.g. 08012345678)'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    const normalizedPhone = normalizePhone(phone)
    setLoading(true)
    try {
      await api.post('/auth/request-otp', {
        phone: normalizedPhone,
        email: email.trim(),
      })
      setPendingProfile({ name: fullName.trim(), email: email.trim(), phone: normalizedPhone })
      setPendingPhone(normalizedPhone)
      router.push('/register/otp')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to send OTP. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenWrapper>
      {/* Fixed header */}
      <header className="fixed top-0 w-full max-w-107.5 z-50 bg-surface flex items-center justify-between px-6 h-16 border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/select-role')}
            className="p-1 -ml-1 active:scale-90 transition-transform"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>
              arrow_back
            </span>
          </button>
          <span className="font-headline font-bold text-lg tracking-tight text-primary">
            Fair-Ride
          </span>
        </div>
        <span className="text-sm font-extrabold text-primary tracking-tighter pr-1">
          STEP 01
        </span>
      </header>

      <main className="pt-24 pb-32 px-6 min-h-screen">

        <section className="mb-8">
          <h1 className="font-headline font-extrabold text-[28px] text-on-surface tracking-tight mb-3 leading-tight">
            Create Your Account
          </h1>
          <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
            Tell us about yourself to get started.
          </p>
        </section>

        <div className="space-y-6">

          {/* Form fields */}
          <div className="space-y-4">
            <Input
              label="Full Name"
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }))
              }}
              error={errors.name}
              autoComplete="name"
            />
            <div onBlur={() => setEmailSuggestion(suggestEmailCorrection(email.trim()))}>
              <Input
                label="Email Address"
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                  if (emailSuggestion) setEmailSuggestion(null)
                }}
                error={errors.email}
                autoComplete="email"
              />
              {emailSuggestion && (
                <div className="mt-1.5 flex items-start gap-1.5 text-xs font-body">
                  <span className="material-symbols-outlined text-amber-500 shrink-0" style={{ fontSize: '14px', marginTop: '1px' }}>info</span>
                  <span className="text-on-surface-variant">
                    Did you mean{' '}
                    <span className="font-semibold text-on-surface">{emailSuggestion}</span>?{' '}
                    <button
                      type="button"
                      onClick={() => { setEmail(emailSuggestion); setEmailSuggestion(null) }}
                      className="font-bold text-primary underline underline-offset-2"
                    >
                      Use this
                    </button>
                    {' · '}
                    <button
                      type="button"
                      onClick={() => setEmailSuggestion(null)}
                      className="text-on-surface-variant underline underline-offset-2"
                    >
                      Dismiss
                    </button>
                  </span>
                </div>
              )}
            </div>

            {/* Phone — inline icon variant */}
            <div className="w-full">
              <label htmlFor="phone" className="mb-1.5 block text-xs font-medium text-on-surface-variant font-body">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-on-surface-variant">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>phone</span>
                </div>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="e.g. 08012345678"
                  value={phone}
                  onChange={handlePhoneChange}
                  autoComplete="tel"
                  className={[
                    'w-full pl-10 pr-4 py-3 rounded-md text-sm text-on-surface font-body transition-all duration-150 outline-none',
                    'bg-surface-container-low border border-transparent focus:bg-surface-container-lowest focus:border-primary',
                    errors.phone ? 'border-error' : '',
                  ].filter(Boolean).join(' ')}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs text-error font-body">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Privacy guarantee */}
          <div className="bg-primary/5 p-5 rounded-xl border-l-4 border-primary">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-primary shrink-0 mt-0.5" style={{ fontSize: '20px' }}>
                verified_user
              </span>
              <div>
                <p className="text-sm font-bold text-primary mb-1">Privacy Guarantee</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Your data is encrypted and will never be shared with third-party advertisers.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 w-full max-w-107.5 px-5 pb-8 pt-4 glass-nav">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-14 editorial-gradient text-on-primary font-headline font-bold text-base rounded-xl shadow-xl active:scale-[0.98] disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}>
                progress_activity
              </span>
              Sending OTP…
            </>
          ) : (
            <>
              Create My Account
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_right</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.push('/register/otp')}
          className="w-full text-center text-sm text-on-surface-variant mt-3 hover:text-primary transition-colors"
        >
          Skip for now, I&apos;ll do this later
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ScreenWrapper>
  )
}
