/**
 * @store BookingStore
 * @description Multi-step booking flow state for Sarva, persisted to localStorage.
 *
 * BOOKING FLOW STEPS
 * The booking wizard spans 4 screens that accumulate state here:
 *   Step 1 — home/page.tsx:        setDeliveryType (ON_DEMAND | SCHEDULED | SAME_DAY)
 *   Step 2 — address/page.tsx:     setAddresses (pickup + dropoff lat/lng + text)
 *   Step 3 — estimate/page.tsx:    setPriceEstimate (calls GET /orders/estimate)
 *   Step 4 — payment/page.tsx:     setPaymentMethod → POST /orders → clears store
 *
 * PERSISTENCE
 * Persisted under key 'sarva-booking' so an interrupted booking survives
 * a page refresh. clearBooking() resets all fields to null after order creation
 * or on manual cancellation.
 *
 * COORDINATE FORMAT
 * Addresses store both human-readable text and decimal lat/lng so the backend
 * can use the coordinates directly for Haversine distance calculation without
 * a geocoding round-trip.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DeliveryType = 'ON_DEMAND' | 'SCHEDULED' | 'SAME_DAY'
export type PaymentMethod = 'CARD' | 'OPAY' | 'BANK_TRANSFER' | 'CASH'

interface AddressPayload {
  latitude: number
  longitude: number
  address: string
}

interface BookingState {
  deliveryType: DeliveryType | null
  scheduledFor: string | null
  pickupLatitude: number | null
  pickupLongitude: number | null
  pickupAddress: string | null
  dropoffLatitude: number | null
  dropoffLongitude: number | null
  dropoffAddress: string | null
  paymentMethod: PaymentMethod | null
  estimatedPrice: number | null
  estimatedDistance: number | null
  estimatedEta: number | null
  packageDescription: string | null
  promoCode: string | null

  setDeliveryType: (type: DeliveryType, scheduledFor?: string) => void
  setAddresses: (pickup: AddressPayload, dropoff: AddressPayload) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setPriceEstimate: (price: number, distance: number, eta: number) => void
  setPackageDescription: (description: string) => void
  setPromoCode: (code: string | null) => void
  clearBooking: () => void
}

const empty = {
  deliveryType: null,
  scheduledFor: null,
  pickupLatitude: null,
  pickupLongitude: null,
  pickupAddress: null,
  dropoffLatitude: null,
  dropoffLongitude: null,
  dropoffAddress: null,
  paymentMethod: null,
  estimatedPrice: null,
  estimatedDistance: null,
  estimatedEta: null,
  packageDescription: null,
  promoCode: null,
} as const

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      ...empty,

      setDeliveryType: (type, scheduledFor) =>
        set({ deliveryType: type, scheduledFor: scheduledFor ?? null }),

      setAddresses: (pickup, dropoff) =>
        set({
          pickupLatitude: pickup.latitude,
          pickupLongitude: pickup.longitude,
          pickupAddress: pickup.address,
          dropoffLatitude: dropoff.latitude,
          dropoffLongitude: dropoff.longitude,
          dropoffAddress: dropoff.address,
        }),

      setPaymentMethod: (method) => set({ paymentMethod: method }),

      setPriceEstimate: (price, distance, eta) =>
        set({ estimatedPrice: price, estimatedDistance: distance, estimatedEta: eta }),

      setPackageDescription: (description) => set({ packageDescription: description }),

      setPromoCode: (code) => set({ promoCode: code }),

      clearBooking: () => set({ ...empty }),
    }),
    { name: 'sarva-booking' },
  ),
)
