'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

function homeForRole(role: string): string {
  if (role === 'RIDER') return '/rider/home'
  if (role === 'ADMIN') return '/admin/dashboard'
  return '/home'
}

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!identifier.trim()) {
      toast.error('Please enter your phone number or email')
      return
    }
    if (!password) {
      toast.error('Please enter your password')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/login-password', {
        identifier: identifier.trim(),
        password,
      })
      setAuth(data.user, data.accessToken, data.refreshToken)
      router.replace(homeForRole(data.user.role))
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid credentials. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenWrapper>
      {/* Fixed header */}
      <header className="fixed top-0 w-full max-w-107.5 z-50 bg-surface flex items-center px-6 h-16 border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/welcome')}
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

      <main className="pt-20 pb-10 px-6 min-h-screen flex flex-col">

        {/* Brand hero strip */}
        <div className="w-full rounded-2xl editorial-gradient overflow-hidden mb-8 p-6 flex flex-col justify-between" style={{ minHeight: '160px' }}>
          <p className="font-headline font-extrabold text-on-primary/60 tracking-tighter text-xs uppercase">
            The Architectural Courier
          </p>
          <div>
            <h2 className="font-headline font-bold text-xl text-on-primary leading-snug mb-3">
              Precision in every delivery,<br />structure in every mile.
            </h2>
            <div className="h-0.5 w-10 bg-on-primary-container rounded-full" />
          </div>
        </div>

        {/* Section header */}
        <section className="mb-6">
          <h1 className="font-headline font-extrabold text-[28px] text-on-surface tracking-tight mb-2 leading-tight">
            Welcome Back
          </h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Sign in with your phone number or email and password.
          </p>
        </section>

        {/* Identifier field */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
            Email or Phone number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-on-surface-variant">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                alternate_email
              </span>
            </div>
            <input
              type="text"
              inputMode="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="e.g. 08012345678 or you@email.com"
              autoComplete="username"
              className="w-full pl-12 pr-4 h-14 bg-surface-container-low border-2 border-transparent focus:border-primary rounded-xl text-on-surface placeholder-on-surface-variant/50 font-medium text-base focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Password field */}
        <div className="mb-3">
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Your password"
              autoComplete="current-password"
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
        </div>

        {/* Forgot password */}
        <div className="flex justify-end mb-8">
          <button
            onClick={() => router.push('/login/forgot-password')}
            className="text-primary text-sm font-bold active:scale-95 transition-transform"
          >
            Forgot password?
          </button>
        </div>

        {/* Sign In CTA */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full editorial-gradient text-on-primary font-headline font-bold py-4 rounded-full shadow-lg shadow-primary/10 active:scale-[0.98] disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-3 text-base mb-8"
        >
          {loading ? (
            <>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}
              >
                progress_activity
              </span>
              Signing in…
            </>
          ) : (
            <>
              Sign In
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                arrow_forward
              </span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative flex items-center mb-8">
          <div className="grow border-t border-outline-variant/30" />
          <span className="shrink mx-4 text-outline text-xs tracking-widest uppercase">
            Secured Access
          </span>
          <div className="grow border-t border-outline-variant/30" />
        </div>

        {/* Register link */}
        <div className="flex items-center justify-center gap-2 mb-auto">
          <p className="text-on-surface-variant text-sm">Don't have an account?</p>
          <button
            onClick={() => router.push('/select-role')}
            className="text-primary font-bold text-sm hover:underline decoration-primary/30 underline-offset-4 active:scale-95 transition-transform"
          >
            Register
          </button>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-4 border-t border-outline-variant/10 flex items-center gap-4 text-outline text-xs">
          <button className="hover:text-primary transition-colors">Privacy Policy</button>
          <span className="w-1 h-1 rounded-full bg-outline-variant shrink-0" />
          <button className="hover:text-primary transition-colors">Support</button>
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>verified_user</span>
            <span className="tracking-tighter">256-bit Encrypted</span>
          </div>
        </footer>

      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ScreenWrapper>
  )
}
