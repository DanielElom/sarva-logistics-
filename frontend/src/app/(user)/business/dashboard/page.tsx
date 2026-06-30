/**
 * @page BusinessDashboardPage
 * @description Business account overview with delivery stats and team management.
 * @route /business/dashboard
 */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import BottomNav from '@/components/ui/BottomNav'
import NavigationDrawer from '@/components/layout/NavigationDrawer'
import { useAuthStore } from '@/stores/auth.store'
import { useOrderStore } from '@/stores/order.store'
import api from '@/lib/api'

interface UserProfile {
  id: string
  name: string | null
  companyName: string | null
  verificationStatus: string | null
  businessAccount?: { id: string; verificationStatus: string } | null
}

interface Order {
  id: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  finalPrice: number
  durationSeconds: number
  createdAt: string
  rider?: { user: { name: string } } | null
}

/* V2_FEATURE: SUBSCRIPTIONS — Subscription interface preserved here
interface Subscription {
  id: string; plan: string; tier?: number | null; status: string
  startDate: string; endDate: string; deliveryLimit: number | null; deliveriesUsed?: number
}
*/

const ACTIVE_STATUSES = new Set(['PENDING', 'ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DELIVERY', 'DELIVERED_REQUESTED'])
const COMPLETED_STATUS = 'DELIVERED_CONFIRMED'

function StatCard({ icon, label, value, sub, dark }: { icon: string; label: string; value: string; sub?: string; dark?: boolean }) {
  return (
    <div className={`p-5 rounded-2xl ${dark ? 'bg-primary text-white' : 'bg-surface-container-lowest shadow-sm'}`}>
      <span
        className={`material-symbols-outlined mb-2 ${dark ? 'text-white/70' : 'text-primary'}`}
        style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}
      >
        {icon}
      </span>
      <p className={`font-['Manrope'] font-extrabold text-2xl ${dark ? 'text-white' : 'text-on-surface'}`}>{value}</p>
      <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${dark ? 'text-white/60' : 'text-on-surface-variant'}`}>{label}</p>
      {sub && <p className={`text-xs mt-1 ${dark ? 'text-white/50' : 'text-on-surface-variant'}`}>{sub}</p>}
    </div>
  )
}

function QuickAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 bg-surface-container-lowest rounded-2xl shadow-sm active:scale-[0.97] transition-transform hover:bg-surface-container-low"
    >
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}>{icon}</span>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant text-center leading-tight">{label}</span>
    </button>
  )
}

/* V2_FEATURE: SUBSCRIPTIONS — daysUntil/planDisplayName helpers preserved here
function daysUntil(dateStr: string) { return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000) }
function planDisplayName(plan: string, tier?: number | null) { ... }
*/

export default function BusinessDashboardPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const activeOrder = useOrderStore((s) => s.activeOrder)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role === 'INDIVIDUAL') { router.replace('/home'); return }
    if (role === 'RIDER') { router.replace('/rider/home'); return }
    if (role === 'ADMIN') { router.replace('/admin/dashboard'); return }

    Promise.all([
      api.get('/users/me'),
      api.get('/orders?page=1&limit=100'),
    ]).then(([profileRes, ordersRes]) => {
      const p: UserProfile = profileRes.data
      setProfile(p)
      if (!p.businessAccount) {
        router.replace('/register/business'); return
      }
      if (p.businessAccount?.verificationStatus !== 'VERIFIED') {
        router.replace('/status/under-review'); return
      }
      const list: Order[] = ordersRes.data.data ?? ordersRes.data.orders ?? []
      setOrders(list)
    }).catch(() => {
      toast.error('Could not load dashboard')
    }).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isAuthenticated) return null

  // compute stats
  const now = new Date()
  const thisMonth = orders.filter((o) => {
    const d = new Date(o.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const completedThisMonth = thisMonth.filter((o) => o.status === COMPLETED_STATUS)
  const completedAll = orders.filter((o) => o.status === COMPLETED_STATUS)
  const totalSpent = completedThisMonth.reduce((sum, o) => sum + (o.finalPrice ?? 0), 0)
  const avgMinutes = completedAll.length > 0
    ? Math.round(completedAll.reduce((s, o) => s + (o.durationSeconds ?? 0), 0) / completedAll.length / 60)
    : 0
  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
  const hasActiveOrder = activeOrder && ACTIVE_STATUSES.has(activeOrder.status)

  const companyName = profile?.companyName ?? 'Business Dashboard'
  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  })()

  return (
    <ScreenWrapper>
      {/* header */}
      <header className="sticky top-0 z-30 bg-[#f2f4ee] flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 text-primary hover:bg-surface-container-high rounded-full active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>menu</span>
          </button>
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Operations Center</p>
            <h1 className="font-['Manrope'] font-bold text-base text-primary leading-tight tracking-tight truncate max-w-[180px]">
              {companyName}
            </h1>
          </div>
        </div>
        <button
          onClick={() => router.push('/notifications')}
          className="relative p-2 text-primary hover:bg-surface-container-high rounded-full active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>notifications</span>
        </button>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-4 pb-32 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* greeting */}
            <p className="font-['Manrope'] font-extrabold text-2xl text-primary tracking-tight">
              {greeting} 👋
            </p>

            {/* active order banner */}
            {hasActiveOrder && (
              <div
                className="flex items-center justify-between p-4 rounded-2xl border-l-4 border-primary"
                style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Active Delivery</p>
                    <p className="text-sm font-bold text-white truncate max-w-[160px]">
                      {activeOrder.dropoffAddress}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/tracking/${activeOrder.id}`)}
                  className="px-4 py-2 bg-white/20 text-white text-xs font-bold rounded-xl active:scale-95"
                >
                  Track Now
                </button>
              </div>
            )}

            {/* V2_FEATURE: SUBSCRIPTIONS — subscription banner removed for V1 */}

            {/* stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon="two_wheeler" label="Deliveries This Month" value={String(thisMonth.length)} />
              <StatCard icon="task_alt" label="Completed" value={String(completedThisMonth.length)} dark />
              <StatCard
                icon="payments"
                label="Total Spent"
                value={`₦${totalSpent.toLocaleString()}`}
                sub="This month"
              />
              <StatCard
                icon="schedule"
                label="Avg Delivery Time"
                value={avgMinutes > 0 ? `${avgMinutes}m` : '—'}
                sub="Per completed order"
              />
            </div>

            {/* quick actions */}
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Quick Actions</h3>
              <div className="grid grid-cols-4 gap-2">
                <QuickAction icon="add_circle" label="Book Delivery" onClick={() => router.push('/book/type')} />
                {/* V2_FEATURE: SUBSCRIPTIONS — Subscription quick action removed for V1 */}
                <QuickAction icon="history" label="History" onClick={() => router.push('/history')} />
                <QuickAction icon="business" label="Settings" onClick={() => router.push('/business/settings')} />
                <QuickAction icon="support_agent" label="Support" onClick={() => router.push('/shared/support')} />
              </div>
            </section>

            {/* recent deliveries */}
            <section>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Recent Deliveries</h3>
                {orders.length > 5 && (
                  <button onClick={() => router.push('/history')} className="text-[10px] font-bold text-primary active:opacity-60">
                    View all
                  </button>
                )}
              </div>
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center bg-surface-container-lowest rounded-2xl shadow-sm">
                  <span className="material-symbols-outlined text-on-surface-variant mb-2" style={{ fontVariationSettings: "'FILL' 1", fontSize: '32px' }}>package_2</span>
                  <p className="text-sm text-on-surface-variant">No deliveries yet. Book your first one!</p>
                  <button
                    onClick={() => router.push('/book/type')}
                    className="mt-4 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl active:scale-95"
                  >
                    Book Delivery
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => {
                    const isCompleted = order.status === COMPLETED_STATUS
                    const isCancelled = order.status === 'CANCELLED'
                    const statusColor = isCompleted ? 'bg-primary/10 text-primary' : isCancelled ? 'bg-error/10 text-error' : 'bg-surface-container-high text-on-surface-variant'
                    const statusLabel = isCompleted ? 'Completed' : isCancelled ? 'Cancelled' : 'Active'
                    return (
                      <button
                        key={order.id}
                        onClick={() => router.push(`/receipt/${order.id}`)}
                        className="w-full bg-surface-container-lowest rounded-2xl shadow-sm p-4 flex items-center gap-4 active:bg-surface-container-low transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}>two_wheeler</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">{order.dropoffAddress}</p>
                          <p className="text-xs text-on-surface-variant truncate">{order.pickupAddress}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-on-surface">₦{(order.finalPrice ?? 0).toLocaleString()}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => router.push('/book/type')}
        className="fixed right-6 bottom-24 bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-40"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
      </button>

      <BottomNav />
      <NavigationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </ScreenWrapper>
  )
}
