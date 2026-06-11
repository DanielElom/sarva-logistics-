/**
 * Fair-Ride Backend Feature Flags
 * Keep in sync with frontend/src/lib/features.ts
 */
export const FEATURES = {
  BUSINESS_ROLES:     false,
  SUBSCRIPTIONS:      false,
  SCHEDULED_DELIVERY: false,
  SURGE_PRICING:      false,
  CARD_PAYMENT:       false,
  OPAY_PAYMENT:       false,
  PROMO_CODES:        false,
  COMMISSION:         false,
} as const
