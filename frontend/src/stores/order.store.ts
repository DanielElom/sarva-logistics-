/**
 * @store OrderStore
 * @description Ephemeral active-order state updated in real time via Socket.io.
 *
 * Unlike AuthStore and BookingStore, this store is NOT persisted — it holds
 * live in-flight state that is meaningless after a full page reload. On reload
 * the tracking page re-fetches the order from the API and re-subscribes to
 * the Socket.io room.
 *
 * REAL-TIME UPDATES
 * The tracking page subscribes to Socket.io events and calls:
 *   setOrderStatus(status)         — on order_status_update events
 *   updateRiderLocation(location)  — on rider_location events
 *   setEta(minutes)                — on eta_update events
 *
 * clearOrder() is called on delivery confirmation or cancellation to
 * reset state so the next booking starts fresh.
 */
import { create } from 'zustand'

export interface RiderLocation {
  latitude: number
  longitude: number
  updatedAt: string
}

export interface ActiveOrder {
  id: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  pickupLatitude: number
  pickupLongitude: number
  dropoffLatitude: number
  dropoffLongitude: number
  finalPrice: number
  distanceKm: number
  deliveryType: string
  paymentMethod: string
  rider?: {
    id: string
    user: { name: string; phone: string }
  } | null
  createdAt: string
}

interface OrderState {
  activeOrder: ActiveOrder | null
  riderLocation: RiderLocation | null
  eta: number | null
  orderStatus: string | null
  setActiveOrder: (order: ActiveOrder) => void
  updateRiderLocation: (location: RiderLocation) => void
  setEta: (eta: number) => void
  setOrderStatus: (status: string) => void
  clearOrder: () => void
}

export const useOrderStore = create<OrderState>()((set) => ({
  activeOrder: null,
  riderLocation: null,
  eta: null,
  orderStatus: null,

  setActiveOrder: (order) =>
    set({ activeOrder: order, orderStatus: order.status }),

  updateRiderLocation: (location) => set({ riderLocation: location }),

  setEta: (eta) => set({ eta }),

  setOrderStatus: (status) =>
    set((state) => ({
      orderStatus: status,
      activeOrder: state.activeOrder
        ? { ...state.activeOrder, status }
        : null,
    })),

  clearOrder: () =>
    set({ activeOrder: null, riderLocation: null, eta: null, orderStatus: null }),
}))
