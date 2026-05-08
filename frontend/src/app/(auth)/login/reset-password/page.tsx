'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

type Requirement = { label: string; met: boolean }

function getRequirements(pw: string): Requirement[] {
  return [
    { label: 'At least 8 characters', met: pw.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(pw) },
    { label: 'One lowercase letter', met: /[a-z]/.test(pw) },
    { label: 'One number', met: /\d/.test(pw) },
  ]
}

function strengthScore(reqs: Requirement[]): number {
  return reqs.filter((r) => r.met).length
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e']

export default function ResetPasswordPage() {
  const router = useRouter()
  const pendingPhone = useAuthStore((s) => s.pendingPhone)
  const resetOtp = useAuthStore((s) => s.resetOtp)
  const clearResetOtp = useAuthStore((s) => s.clearResetOtp)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!pendingPhone || !resetOtp) {
      router.replace('/login/forgot-password')
    }
  }, [pendingPhone, resetOtp, router])

  const requirements = useMemo(() => getRequirements(password), [password])
  const score = useMemo(() => strengthScore(requirements), [requirements])
  const allMet = requirements.every((r) => r.met)
  const passwordsMatch = password === confirm && confirm.length > 0

  const canSubmit = allMet && passwordsMatch && !loading

  const handleSubmit = async () => {
    if (!allMet) {
      toast.error('Password does not meet all requirements')
      return
    }
    if (!passwordsMatch) {
      toast.error('Passwords do not match')
      return
    }
    if (!pendingPhone || !resetOtp) {
      toast.error('Session expired. Please start over.')
      router.replace('/login/forgot-password')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        phone: pendingPhone,
        otp: resetOtp,
        password,
        confirmPassword: confirm,
      })
      clearResetOtp()
      toast.success('Password reset! Please sign in.')
      router.replace('/login')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to reset password. Please try again.'
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
            Reset Password
          </span>
        </div>
      </header>

      <main className="pt-24 pb-36 px-6 min-h-screen">

        <section className="mb-8">
          <h1 className="font-headline font-extrabold text-[28px] text-on-surface tracking-tight mb-3 leading-tight">
            Create New Password
          </h1>
          <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
            Choose a strong password for your account.
          </p>
        </section>

        {/* Password field */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a new password"
              className="w-full h-14 bg-surface-container-low border-2 border-transparent focus:border-primary rounded-xl px-4 pr-12 text-on-surface placeholder-on-surface-variant/50 font-medium text-base focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant active:scale-90 transition-transform"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          {/* Strength bar */}
          {password.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex-1 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: i <= score ? STRENGTH_COLORS[score] : 'var(--color-surface-container-high)',
                    }}
                  />
                ))}
              </div>
              <p className="text-xs font-semibold" style={{ color: STRENGTH_COLORS[score] }}>
                {STRENGTH_LABELS[score]}
              </p>
            </div>
          )}
        </div>

        {/* Confirm password field */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your new password"
              className={[
                'w-full h-14 bg-surface-container-low border-2 rounded-xl px-4 pr-12 text-on-surface placeholder-on-surface-variant/50 font-medium text-base focus:outline-none transition-colors',
                confirm.length > 0
                  ? passwordsMatch
                    ? 'border-[#22c55e]'
                    : 'border-[#ef4444]'
                  : 'border-transparent focus:border-primary',
              ].join(' ')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant active:scale-90 transition-transform"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                {showConfirm ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          {confirm.length > 0 && !passwordsMatch && (
            <p className="mt-1.5 text-xs font-semibold text-[#ef4444]">Passwords do not match</p>
          )}
        </div>

        {/* Requirements checklist */}
        <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Password Requirements
          </p>
          {requirements.map((req) => (
            <div key={req.label} className="flex items-center gap-3">
              <span
                className="material-symbols-outlined shrink-0 transition-colors duration-200"
                style={{
                  fontSize: '18px',
                  color: req.met ? '#22c55e' : 'var(--color-on-surface-variant)',
                  fontVariationSettings: req.met ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {req.met ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span
                className={[
                  'text-sm font-medium transition-colors duration-200',
                  req.met ? 'text-on-surface' : 'text-on-surface-variant',
                ].join(' ')}
              >
                {req.label}
              </span>
            </div>
          ))}
        </div>

      </main>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 w-full max-w-107.5 px-5 pb-8 pt-4 glass-nav">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-14 editorial-gradient text-on-primary font-headline font-bold text-base rounded-xl shadow-xl active:scale-[0.98] disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}
              >
                progress_activity
              </span>
              Resetting…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>lock_reset</span>
              Reset Password
            </>
          )}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ScreenWrapper>
  )
}
