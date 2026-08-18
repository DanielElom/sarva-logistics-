/**
 * @store AuthStore
 * @description Global authentication state for Sarva, persisted to localStorage.
 *
 * PERSISTENCE
 * Persisted under key 'sarva-auth' via Zustand persist middleware.
 * Every field is persisted (partialize returns all state fields) so the
 * user remains logged in across page refreshes and browser restarts.
 *
 * TOKEN DUAL-WRITE
 * setAuth and setAccessToken both write the token to two places:
 *   1. localStorage['sarva-token'] — read by the Axios request interceptor
 *   2. document.cookie sarva-token — read by Next.js middleware for SSR redirects
 * clearAuth deletes both to ensure a full logout regardless of which layer checks.
 *
 * PENDING FLOW STATE
 * The store doubles as a multi-step registration flow buffer:
 *   selectedRole    — set on the role-picker screen, used on OTP verify
 *   pendingProfile  — name/email/phone collected before OTP confirmation
 *   pendingPhone    — phone number carried from request-otp → verify-otp screens
 *   resetOtp        — OTP value carried from verify → reset-password screen
 * These fields are cleared after use so stale data doesn't affect future flows.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole =
  | 'INDIVIDUAL'
  | 'VENDOR'
  | 'RESTAURANT'
  | 'CORPORATE'
  | 'RIDER'
  | 'ADMIN'

export interface AuthUser {
  id: string
  phone: string
  name: string | null
  role: UserRole
  status: string
  fcmToken?: string | null
  profilePhoto?: string | null
}

export interface PendingProfile {
  name: string
  email: string
  phone: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  role: UserRole | null
  selectedRole: UserRole | null
  pendingProfile: PendingProfile | null
  pendingPhone: string | null
  resetOtp: string | null
  setAuth: (user: AuthUser, accessToken: string, refreshToken?: string) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
  setSelectedRole: (role: UserRole) => void
  setPendingProfile: (profile: PendingProfile) => void
  clearPendingProfile: () => void
  setPendingPhone: (phone: string) => void
  setResetOtp: (otp: string) => void
  clearResetOtp: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      role: null,
      selectedRole: null,
      pendingProfile: null,
      pendingPhone: null,
      resetOtp: null,

      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('sarva-token', accessToken)
          document.cookie = `sarva-token=${accessToken}; path=/; max-age=2592000; SameSite=Lax`
        }
        set({
          user,
          token: accessToken,
          refreshToken: refreshToken ?? null,
          isAuthenticated: true,
          role: user.role,
        })
      },

      setAccessToken: (token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('sarva-token', token)
          document.cookie = `sarva-token=${token}; path=/; max-age=2592000; SameSite=Lax`
        }
        set({ token })
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sarva-token')
          document.cookie = 'sarva-token=; path=/; max-age=0; SameSite=Lax'
        }
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          role: null,
          selectedRole: null,
          pendingProfile: null,
          pendingPhone: null,
          resetOtp: null,
        })
      },

      setSelectedRole: (role) => set({ selectedRole: role }),
      setPendingProfile: (profile) => set({ pendingProfile: profile }),
      clearPendingProfile: () => set({ pendingProfile: null }),
      setPendingPhone: (phone) => set({ pendingPhone: phone }),
      setResetOtp: (otp) => set({ resetOtp: otp }),
      clearResetOtp: () => set({ resetOtp: null }),
    }),
    {
      name: 'sarva-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        role: state.role,
        selectedRole: state.selectedRole,
        pendingProfile: state.pendingProfile,
        pendingPhone: state.pendingPhone,
        resetOtp: state.resetOtp,
      }),
    },
  ),
)
