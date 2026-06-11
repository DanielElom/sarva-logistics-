/**
 * @page BookTypePage
 * @description V1: auto-sets ON_DEMAND and redirects to address step.
 * @route /book/type
 */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBookingStore } from '@/stores/booking.store'

export default function BookTypePage() {
  const router = useRouter()
  const setDeliveryType = useBookingStore((s) => s.setDeliveryType)

  useEffect(() => {
    setDeliveryType('ON_DEMAND')
    router.replace('/book/address')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

/* V2_FEATURE: DELIVERY_TYPES
 * Full delivery type selection screen with Scheduled + Same-day options.
 * Re-implement from stitch source: choose_delivery_type/code.html
 * Set FEATURES.SCHEDULED_DELIVERY and FEATURES.SAME_DAY_DELIVERY to true,
 * then restore the original BookTypePage implementation with TypeCard component.
 */
