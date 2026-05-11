/**
 * @page ChangePasswordPage
 * @description Change account password by entering current password and a new one.
 * @route /settings/change-password
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3.5 pr-12 rounded-xl bg-surface-container-low border border-transparent focus:border-primary/40 focus:outline-none text-sm text-on-surface placeholder:text-outline transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant active:scale-90 transition-transform"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: show ? "'FILL' 1" : "'FILL' 0", fontSize: '20px' }}
          >
            {show ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
    </div>
  )
}

function strengthScore(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  const map = [
    { score: 0, label: '', color: '' },
    { score: 1, label: 'Weak', color: 'bg-error' },
    { score: 2, label: 'Fair', color: 'bg-amber-400' },
    { score: 3, label: 'Good', color: 'bg-yellow-400' },
    { score: 4, label: 'Strong', color: 'bg-primary' },
  ]
  return map[score]
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = strengthScore(next)
  const mismatch = confirm.length > 0 && next !== confirm

  async function handleSubmit() {
    if (!current) { toast.error('Enter your current password'); return }
    if (next.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (next !== confirm) { toast.error('Passwords do not match'); return }

    setLoading(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      })
      toast.success('Password changed successfully')
      router.replace('/settings')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not change password'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) return null

  return (
    <ScreenWrapper>
      {/* header */}
      <header className="sticky top-0 z-30 bg-[#f8faf4] flex items-center gap-4 px-6 py-4">
        <button
          onClick={() => router.back()}
          className="text-[#003418] active:scale-95 duration-150 p-2"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
            arrow_back
          </span>
        </button>
        <h1 className="font-['Manrope'] font-bold text-lg tracking-tight text-[#003418]">
          Change Password
        </h1>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-4 pb-32 space-y-6">
        {/* info banner */}
        <div className="flex items-start gap-3 bg-primary/5 rounded-2xl p-4">
          <span
            className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5"
            style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
          >
            info
          </span>
          <p className="text-sm text-on-surface leading-relaxed">
            Choose a password that's at least 8 characters and includes a mix of letters, numbers, and symbols.
          </p>
        </div>

        {/* form */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-5">
          <PasswordInput
            label="Current Password"
            value={current}
            onChange={setCurrent}
            placeholder="Enter current password"
          />

          <div className="border-t border-outline-variant/20" />

          <PasswordInput
            label="New Password"
            value={next}
            onChange={setNext}
            placeholder="Enter new password"
          />

          {/* strength bar */}
          {next.length > 0 && (
            <div>
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className={[
                      'h-1.5 flex-1 rounded-full transition-colors duration-300',
                      n <= strength.score ? strength.color : 'bg-outline-variant/30',
                    ].join(' ')}
                  />
                ))}
              </div>
              {strength.label && (
                <p className="text-xs text-on-surface-variant">
                  Strength:{' '}
                  <span
                    className={`font-bold ${
                      strength.score === 4
                        ? 'text-primary'
                        : strength.score >= 2
                        ? 'text-amber-600'
                        : 'text-error'
                    }`}
                  >
                    {strength.label}
                  </span>
                </p>
              )}
            </div>
          )}

          <PasswordInput
            label="Confirm New Password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter new password"
          />

          {mismatch && (
            <p className="text-xs text-error flex items-center gap-1">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1", fontSize: '14px' }}
              >
                error
              </span>
              Passwords don't match
            </p>
          )}
        </div>

        {/* requirements */}
        <div className="space-y-2">
          {[
            { rule: next.length >= 8, label: 'At least 8 characters' },
            { rule: /[A-Z]/.test(next), label: 'One uppercase letter' },
            { rule: /[0-9]/.test(next), label: 'One number' },
            { rule: /[^A-Za-z0-9]/.test(next), label: 'One special character' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className={`material-symbols-outlined text-sm transition-colors ${
                  item.rule ? 'text-primary' : 'text-outline-variant'
                }`}
                style={{ fontVariationSettings: item.rule ? "'FILL' 1" : "'FILL' 0", fontSize: '16px' }}
              >
                {item.rule ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span className={`text-xs ${item.rule ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </main>

      {/* fixed footer */}
      <div className="fixed bottom-0 left-0 w-full px-6 pb-8 pt-4 glass-nav z-30">
        <div className="max-w-xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={loading || !current || next.length < 8 || next !== confirm}
            className="w-full py-5 rounded-xl font-['Manrope'] font-bold text-lg text-white shadow-xl active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)' }}
          >
            {loading && (
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>
    </ScreenWrapper>
  )
}
