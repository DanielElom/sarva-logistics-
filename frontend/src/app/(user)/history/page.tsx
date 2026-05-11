/**
 * @page HistoryPage
 * @description Paginated order history with status filters and re-order action.
 * @route /history
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import BottomNav from '@/components/ui/BottomNav'
import NavigationDrawer from '@/components/layout/NavigationDrawer'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

type FilterTab = 'ALL' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'DISPUTED', label: 'Disputed' },
]

const STATUS_FILTER_MAP: Record<FilterTab, string[]> = {
  ALL: [],
  COMPLETED: ['DELIVERED_CONFIRMED'],
  CANCELLED: ['CANCELLED'],
  DISPUTED: ['DISPUTED'],
}

interface OrderItem {
  id: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  finalPrice: number
  deliveryType: string
  createdAt: string
  rider?: { user: { name: string } } | null
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    DELIVERED_CONFIRMED: { label: 'Completed', color: 'bg-primary/10 text-primary' },
    CANCELLED: { label: 'Cancelled', color: 'bg-error/10 text-error' },
    DISPUTED: { label: 'Disputed', color: 'bg-amber-100 text-amber-700' },
    PENDING: { label: 'Pending', color: 'bg-surface-container-high text-on-surface-variant' },
    ASSIGNED: { label: 'Assigned', color: 'bg-primary/10 text-primary' },
  }
  return (
    map[status] ?? {
      label: status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      color: 'bg-surface-container-high text-on-surface-variant',
    }
  )
}

function formatShortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatShortTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}

function TripCard({ order, onClick }: { order: OrderItem; onClick: () => void }) {
  const { label, color } = statusLabel(order.status)
  const riderName = order.rider?.user?.name ?? null

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden active:scale-[0.99] transition-transform border border-outline-variant/10"
    >
      {/* top section */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              {formatShortDate(order.createdAt)}
            </span>
            <span className="text-[10px] text-on-surface-variant/60">·</span>
            <span className="text-[10px] text-on-surface-variant">{formatShortTime(order.createdAt)}</span>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${color}`}>
            {label}
          </span>
        </div>

        {/* route */}
        <div className="flex gap-3 items-stretch">
          {/* connector line */}
          <div className="flex flex-col items-center pt-1 pb-1 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            <div className="w-px flex-1 bg-outline-variant/40 my-1" />
            <div className="w-2 h-2 rounded-full border-2 border-primary flex-shrink-0" />
          </div>
          {/* addresses */}
          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-0.5">
                Pickup
              </p>
              <p className="text-sm font-semibold text-on-surface truncate leading-snug">
                {order.pickupAddress}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-0.5">
                Dropoff
              </p>
              <p className="text-sm font-semibold text-on-surface truncate leading-snug">
                {order.dropoffAddress}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* bottom strip */}
      <div className="bg-surface-container-low px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {riderName && (
            <>
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-bold text-[10px] text-primary">
                  {riderName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">{riderName}</span>
            </>
          )}
          {!riderName && (
            <span className="text-xs text-on-surface-variant font-medium">
              {order.deliveryType === 'ON_DEMAND' ? 'On Demand' : order.deliveryType === 'SCHEDULED' ? 'Scheduled' : 'Same Day'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="font-['Manrope'] font-bold text-on-surface text-sm">
            ₦{(order.finalPrice ?? 0).toLocaleString()}
          </span>
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontVariationSettings: "'FILL' 0", fontSize: '16px' }}
          >
            chevron_right
          </span>
        </div>
      </div>
    </button>
  )
}

function EmptyState({ tab }: { tab: FilterTab }) {
  const messages: Record<FilterTab, { icon: string; title: string; body: string }> = {
    ALL: { icon: 'package_2', title: 'No deliveries yet', body: 'Your order history will appear here once you place your first delivery.' },
    COMPLETED: { icon: 'task_alt', title: 'No completed deliveries', body: 'Completed orders will show here.' },
    CANCELLED: { icon: 'cancel', title: 'No cancelled orders', body: "You haven't cancelled any orders." },
    DISPUTED: { icon: 'report', title: 'No disputes', body: 'Disputed orders will appear here.' },
  }
  const { icon, title, body } = messages[tab]
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
      <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
        <span
          className="material-symbols-outlined text-on-surface-variant"
          style={{ fontVariationSettings: "'FILL' 1", fontSize: '32px' }}
        >
          {icon}
        </span>
      </div>
      <h3 className="font-['Manrope'] font-bold text-on-surface mb-2">{title}</h3>
      <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
    </div>
  )
}

export default function HistoryPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  const [activeTab, setActiveTab] = useState<FilterTab>('ALL')
  const [search, setSearch] = useState('')
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role === 'RIDER') { router.replace('/rider/home'); return }
    if (role === 'ADMIN') { router.replace('/admin/dashboard'); return }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadOrders = useCallback(
    async (tab: FilterTab, query: string, pageNum: number, append = false) => {
      setLoading(true)
      try {
        const statusFilter = STATUS_FILTER_MAP[tab]
        const params: Record<string, string> = { page: String(pageNum), limit: '10' }
        if (statusFilter.length === 1) params.status = statusFilter[0]
        if (query.trim()) params.search = query.trim()

        const { data } = await api.get('/orders', { params })
        const list: OrderItem[] = Array.isArray(data) ? data : data.data ?? data.orders ?? []
        setOrders((prev) => (append ? [...prev, ...list] : list))
        setHasMore(list.length === 10)
      } catch {
        toast.error('Could not load orders')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!isAuthenticated) return
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      loadOrders(activeTab, search, 1, false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [activeTab, search, isAuthenticated, loadOrders])

  if (!isAuthenticated) return null

  const filteredOrders = orders

  return (
    <ScreenWrapper>
      {/* header */}
      <header className="sticky top-0 z-30 bg-[#f8faf4] px-6 pt-4 pb-2 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 text-primary hover:bg-surface-container-high rounded-full active:scale-95 transition-transform"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>menu</span>
            </button>
            <h1 className="font-['Manrope'] font-extrabold text-[#003418] italic text-xl tracking-tight">
              Activity
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
            >
              account_circle
            </span>
          </div>
        </div>

        {/* search */}
        <div className="relative">
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
            style={{ fontVariationSettings: "'FILL' 0", fontSize: '20px' }}
          >
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by address or rider…"
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-container-low border border-transparent focus:border-primary/30 focus:outline-none text-sm text-on-surface placeholder:text-outline transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant active:scale-90"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          )}
        </div>

        {/* filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors active:scale-95 flex-shrink-0',
                activeTab === tab.key
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-4 pb-28 space-y-3">
        {loading && orders.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <>
            {filteredOrders.map((order) => (
              <TripCard
                key={order.id}
                order={order}
                onClick={() => router.push(`/receipt/${order.id}`)}
              />
            ))}

            {hasMore && (
              <button
                onClick={() => {
                  const next = page + 1
                  setPage(next)
                  loadOrders(activeTab, search, next, true)
                }}
                disabled={loading}
                className="w-full py-4 rounded-xl border border-outline-variant/40 text-sm font-bold text-on-surface active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-on-surface/20 border-t-on-surface rounded-full animate-spin" />
                    Loading…
                  </span>
                ) : (
                  'Load more'
                )}
              </button>
            )}
          </>
        )}
      </main>

      <BottomNav />
      <NavigationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </ScreenWrapper>
  )
}
