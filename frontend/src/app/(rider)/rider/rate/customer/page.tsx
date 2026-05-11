/**
 * @page RiderRateCustomerPage
 * @description Alternative screen for rider to rate the delivery customer.
 * @route /rider/rate/customer
 */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RateCustomerRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('rider-last-order')
    if (stored) {
      try {
        const { orderId } = JSON.parse(stored)
        if (orderId) { router.replace(`/rider/rate/${orderId}`); return }
      } catch {}
    }
    router.replace('/rider/home')
  }, [router])

  return null
}
