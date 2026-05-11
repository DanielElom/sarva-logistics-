/**
 * @page ForgotPasswordPage
 * @description Initiates password reset by sending OTP to phone number.
 * @route /login/forgot-password
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

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

export default function ForgotPasswordPage() {
  const router = useRouter()
  const setPendingPhone = useAuthStore((s) => s.setPendingPhone)

  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value))
  }

  async function handleSubmit() {
    if (!isValidNigerianPhone(phone)) {
      toast.error('Enter a valid Nigerian number (e.g. 08012345678)')
      return
    }
    const normalized = normalizePhone(phone)
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { phone: normalized })
      setPendingPhone(normalized)
      router.push('/login/reset-otp')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not send OTP. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenWrapper>
      <header className="fixed top-0 w-full max-w-107.5 z-50 bg-surface flex items-center px-6 h-16 border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
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
      </header>

      <main className="pt-24 pb-16 px-6 min-h-screen">

        <div className="w-18 h-18 editorial-gradient rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-on-primary" style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}>
            lock_reset
          </span>
        </div>

        <section className="mb-8">
          <h1 className="font-headline font-extrabold text-[28px] text-on-surface tracking-tight mb-3 leading-tight">
            Forgot Password?
          </h1>
          <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
            Enter the phone number linked to your account and we'll send you a reset code.
          </p>
        </section>

        <div className="mb-8">
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
            Phone Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-on-surface-variant">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>phone</span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={handleChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="e.g. 08012345678"
              autoComplete="tel"
              className="w-full pl-12 pr-4 h-14 bg-surface-container-low border-2 border-transparent focus:border-primary rounded-xl text-on-surface placeholder-on-surface-variant/50 font-medium text-base focus:outline-none transition-colors"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-14 editorial-gradient text-on-primary font-headline font-bold text-base rounded-xl shadow-xl active:scale-[0.98] disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}>
                progress_activity
              </span>
              Sending…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
              Send Reset Code
            </>
          )}
        </button>

        <p className="mt-8 text-center text-sm text-on-surface-variant">
          Remember your password?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-primary font-bold active:scale-95 transition-transform"
          >
            Sign In
          </button>
        </p>

      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ScreenWrapper>
  )
}
