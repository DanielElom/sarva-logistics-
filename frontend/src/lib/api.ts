/**
 * @lib api.ts
 * @description Central Axios instance for all Sarva API calls.
 *
 * REQUEST INTERCEPTOR
 * Reads the JWT access token from localStorage and attaches it as
 * Authorization: Bearer <token> on every outgoing request.
 * localStorage is the source of truth; the cookie mirror (set by setAuth)
 * is for Next.js middleware only and is not read back here.
 *
 * RESPONSE INTERCEPTOR — Silent Token Refresh
 * On any 401 response the interceptor attempts a silent token refresh:
 *   1. Sets original._retry = true to prevent an infinite retry loop.
 *   2. Calls POST /auth/refresh with the stored refreshToken.
 *   3. Deduplication: the module-level `refreshing` promise ensures that
 *      multiple concurrent 401s trigger only ONE refresh request.
 *      All parallel requests await the same promise.
 *   4. On success: updates the token in the store + retries the original request.
 *   5. On failure (refresh token also expired): calls clearAuth() and redirects
 *      to /welcome so the user must log in again.
 *
 * Token storage strategy:
 *   localStorage['sarva-token']  — read by this interceptor for API calls
 *   document.cookie sarva-token  — read by Next.js middleware for SSR routing
 *   Zustand store (persisted)        — source of truth for UI state
 */
'use client'

import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sarva-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

let refreshing: Promise<string> | null = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !original._retry
    ) {
      original._retry = true

      const { refreshToken, setAccessToken, clearAuth } = useAuthStore.getState()

      // Pre-auth 401 (e.g. wrong OTP, bad credentials on a public endpoint).
      // No token means the user was never authenticated — don't wipe state or
      // redirect. Just let the error propagate to the call-site catch block.
      const hasToken = !!localStorage.getItem('sarva-token')
      if (!hasToken && !refreshToken) {
        return Promise.reject(error)
      }

      if (refreshToken) {
        try {
          if (!refreshing) {
            refreshing = axios
              .post(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/auth/refresh`, { refreshToken })
              .then((r) => r.data.accessToken)
              .finally(() => { refreshing = null })
          }
          const newToken = await refreshing
          setAccessToken(newToken)
          original.headers.Authorization = `Bearer ${newToken}`
          return api(original)
        } catch {
          refreshing = null
        }
      }

      clearAuth()
      window.location.href = '/welcome'
    }

    return Promise.reject(error)
  },
)

export default api
