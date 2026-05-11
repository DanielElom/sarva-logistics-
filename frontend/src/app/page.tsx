/**
 * @page RootPage
 * @description Root redirect — sends authenticated users to their role home, unauthenticated to /welcome.
 * @route /
 */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

export default function RootPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === 'RIDER') {
        router.replace('/rider/home')
      } else if (role === 'ADMIN') {
        router.replace('/admin/dashboard')
      } else if (role === 'VENDOR' || role === 'RESTAURANT' || role === 'CORPORATE') {
        router.replace('/business/dashboard')
      } else {
        router.replace('/home')
      }
    } else {
      router.replace('/welcome')
    }
  }, [isAuthenticated, role, router])

  return null
}
