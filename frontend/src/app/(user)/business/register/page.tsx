'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BusinessRegisterRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/register/business') }, [router])
  return null
}
