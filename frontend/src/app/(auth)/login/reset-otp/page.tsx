/**
 * @page ResetOtpPage
 * @description Verifies the OTP received for password reset.
 * @route /login/reset-otp
 */
'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

const OTP_LENGTH = 6
const RESEND_SECONDS = 60

export default function ResetOtpPage() {
  const router = useRouter()
  const pendingPhone = useAuthStore((s) => s.pendingPhone)
  const setResetOtp = useAuthStore((s) => s.setResetOtp)

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  const [resending, setResending] = useState(false)

  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null))

  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [secondsLeft])

  const focusBox = (index: number) => inputRefs.current[index]?.focus()

  const handleChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    if (char && index < OTP_LENGTH - 1) focusBox(index + 1)
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ''
        setDigits(next)
      } else if (index > 0) {
        focusBox(index - 1)
        const next = [...digits]
        next[index - 1] = ''
        setDigits(next)
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = Array(OTP_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    focusBox(Math.min(pasted.length, OTP_LENGTH - 1))
  }

  const otp = digits.join('')

  const handleVerify = useCallback(() => {
    if (otp.length < OTP_LENGTH) {
      toast.error('Please enter the full 6-digit code')
      return
    }
    if (!pendingPhone) {
      toast.error('Session expired. Please start over.')
      router.replace('/login/forgot-password')
      return
    }
    setLoading(true)
    setResetOtp(otp)
    router.replace('/login/reset-password')
    setLoading(false)
  }, [otp, pendingPhone, setResetOtp, router])

  const handleResend = async () => {
    if (!pendingPhone) return
    setResending(true)
    try {
      await api.post('/auth/forgot-password', { phone: pendingPhone })
      setDigits(Array(OTP_LENGTH).fill(''))
      setSecondsLeft(RESEND_SECONDS)
      focusBox(0)
      toast.success('New code sent!')
    } catch {
      toast.error('Could not resend code. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const formattedPhone = pendingPhone
    ? pendingPhone.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d+)/, '$1 $2 $3 $4')
    : '—'

  const timerLabel = `0:${String(secondsLeft).padStart(2, '0')}`

  return (
    <ScreenWrapper>
      <header className="fixed top-0 w-full max-w-107.5 z-50 bg-surface flex items-center justify-between px-6 h-16 border-b border-outline-variant/10">
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
            Sarva
          </span>
        </div>
        <span className="text-sm font-extrabold text-primary tracking-tighter pr-1">
          RESET
        </span>
      </header>

      <main className="pt-24 pb-16 px-6 min-h-screen">

        <section className="mb-8">
          <h1 className="font-headline font-extrabold text-[28px] text-on-surface tracking-tight mb-3 leading-tight">
            Enter Reset Code
          </h1>
          <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
            We sent a 6-digit code to{' '}
            <span className="font-bold text-on-surface">{formattedPhone}</span>.
            Enter it below to continue.
          </p>
        </section>

        {/* OTP boxes */}
        <div className="flex justify-between gap-2 mb-8">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className={[
                'w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-150 bg-surface-container-low text-on-surface focus:outline-none',
                digit
                  ? 'border-primary bg-surface-container-lowest'
                  : 'border-transparent focus:border-primary focus:bg-surface-container-lowest',
              ].join(' ')}
              aria-label={`Digit ${i + 1}`}
              autoFocus={i === 0}
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
            />
          ))}
        </div>

        {/* Resend */}
        <div className="flex items-center justify-center mb-10">
          {secondsLeft > 0 ? (
            <p className="text-sm text-on-surface-variant">
              Resend code in{' '}
              <span className="font-bold text-primary tabular-nums">{timerLabel}</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-sm font-bold text-primary active:scale-95 transition-transform disabled:opacity-60"
            >
              {resending ? 'Sending…' : 'Resend Code'}
            </button>
          )}
        </div>

        <div className="bg-primary/5 p-5 rounded-xl border-l-4 border-primary">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-primary shrink-0 mt-0.5" style={{ fontSize: '20px' }}>
              info
            </span>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              This code expires in 10 minutes. Never share it with anyone.
            </p>
          </div>
        </div>

      </main>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 w-full max-w-107.5 px-5 pb-8 pt-4 glass-nav">
        <button
          onClick={handleVerify}
          disabled={loading || otp.length < OTP_LENGTH}
          className="w-full h-14 editorial-gradient text-on-primary font-headline font-bold text-base rounded-xl shadow-xl active:scale-[0.98] disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}>
                progress_activity
              </span>
              Verifying…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>verified_user</span>
              Verify Code
            </>
          )}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ScreenWrapper>
  )
}
