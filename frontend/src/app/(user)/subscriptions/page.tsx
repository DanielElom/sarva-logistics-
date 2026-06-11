/**
 * @page SubscriptionsPage
 * @route /subscriptions
 * V1: subscriptions disabled — redirect to home immediately.
 */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

export default function SubscriptionsPage() {
  const router = useRouter()
  const role = useAuthStore((s) => s.role)

  useEffect(() => {
    if (role === 'RIDER') router.replace('/rider/home')
    else router.replace('/home')
  }, [role, router])

  return null
}

/* V2_FEATURE: SUBSCRIPTIONS
 * Full subscription plans page for Rider + Business accounts.
 * Re-implement from stitch source: subscription_plans/code.html
 * Set FEATURES.SUBSCRIPTIONS to true, then restore full SubscriptionsPage
 * with PlanCard component, Paystack redirect, and cancel flow.
 */
