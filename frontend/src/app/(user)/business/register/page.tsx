/**
 * @page BusinessRegisterPage
 * @description Redirect to business registration flow at /register/business.
 * @route /business/register
 */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BusinessRegisterRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/register/business') }, [router])
  return null
}
