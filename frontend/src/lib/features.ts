/**
 * Sarva Feature Flags
 * =======================
 * V1 Launch configuration — Individual + Rider + Admin only
 *
 * TO ENABLE A V2 FEATURE:
 * 1. Set the flag to true
 * 2. Search codebase for V2_FEATURE: [FEATURE_NAME] comments
 * 3. Uncomment the relevant code blocks
 * 4. Remove backend restrictions in auth/orders/payments services
 * 5. Test thoroughly before deploying
 */
export const FEATURES = {
  // V1 — enabled at launch
  INDIVIDUAL_USERS:      true,
  RIDER_FLOW:            true,
  ADMIN_DASHBOARD:       true,
  ON_DEMAND_DELIVERY:    true,
  CASH_PAYMENT:          true,
  BANK_TRANSFER_PAYMENT: true,

  // V2 — hidden, code preserved
  BUSINESS_ROLES:        false,
  SUBSCRIPTIONS:         false,
  SCHEDULED_DELIVERY:    false,
  SAME_DAY_DELIVERY:     false,
  SURGE_PRICING:         false,
  CARD_PAYMENT:          false,
  OPAY_PAYMENT:          false,
  PROMO_CODES:           false,
  COMMISSION:            false,
} as const
