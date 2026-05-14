/**
 * @page DevToolsPage
 * @description Comprehensive test suite dashboard — development only.
 * @route /dev-tools
 */
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

/* ── constants ───────────────────────────────────────────────────── */
const API = 'http://localhost:3001'
const TABS = ['Accounts', 'Delivery Sim', 'Rider Sim', 'Admin Tools', 'Socket Monitor', 'Quick Reset'] as const
type Tab = typeof TABS[number]

const TEST_ACCOUNTS = [
  { phone: '+2348011110001', role: 'INDIVIDUAL', name: 'Test Individual', email: 'individual@test.com' },
  { phone: '+2348022220001', role: 'RIDER',      name: 'Test Rider',      email: 'rider@test.com' },
  { phone: '+2348033330001', role: 'VENDOR',     name: 'Test Vendor',     email: 'vendor@test.com' },
  { phone: '+2348044440001', role: 'RESTAURANT', name: 'Test Restaurant', email: 'restaurant@test.com' },
  { phone: '+2348055550001', role: 'CORPORATE',  name: 'Test Corporate',  email: 'corporate@test.com' },
]

const ABUJA_ROUTE = [
  { lat: 9.0579, lng: 7.4951 },
  { lat: 9.0612, lng: 7.4921 },
  { lat: 9.0645, lng: 7.4891 },
  { lat: 9.0678, lng: 7.4861 },
  { lat: 9.0711, lng: 7.4831 },
  { lat: 9.0744, lng: 7.4801 },
  { lat: 9.0777, lng: 7.4771 },
  { lat: 9.0800, lng: 7.4750 },
]

const ORDER_STATUSES = [
  'EN_ROUTE_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED_AT_DELIVERY',
  'DELIVERED_REQUESTED',
] as const

/* ── helpers ─────────────────────────────────────────────────────── */
async function call(method: string, path: string, token?: string | null, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({ message: 'No response body' }))
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`)
  return json
}

function Badge({ color, label }: { color: string; label: string }) {
  const map: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${map[color] ?? map.gray}`}>
      {label}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}

function Btn({
  onClick, label, color = 'green', disabled = false, small = false,
}: {
  onClick: () => void; label: string; color?: 'green' | 'red' | 'blue' | 'gray' | 'amber'
  disabled?: boolean; small?: boolean
}) {
  const map = {
    green: 'bg-green-600 hover:bg-green-700 text-white',
    red: 'bg-red-600 hover:bg-red-700 text-white',
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    gray: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${map[color]}`}
    >
      {label}
    </button>
  )
}

/* ── tab: ACCOUNTS ───────────────────────────────────────────────── */
function AccountsTab() {
  const [tokens, setTokens] = useState<Record<string, string>>({})
  const [statuses, setStatuses] = useState<Record<string, string>>({})
  const [dbAccounts, setDbAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const refreshAccounts = useCallback(async () => {
    try {
      const data = await call('GET', '/dev/test-accounts')
      setDbAccounts(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    refreshAccounts()
    const t = setInterval(refreshAccounts, 10000)
    return () => clearInterval(t)
  }, [refreshAccounts])

  async function createAccount(acct: typeof TEST_ACCOUNTS[number]) {
    setLoading(p => ({ ...p, [acct.role]: true }))
    setStatuses(p => ({ ...p, [acct.role]: '⏳ Creating…' }))
    try {
      const res = await call('POST', '/dev/create-test-account', null, acct)
      setTokens(p => ({ ...p, [acct.role]: res.accessToken }))
      setStatuses(p => ({ ...p, [acct.role]: `✅ Created — password: ${res.password}` }))
      await refreshAccounts()
    } catch (e: any) {
      setStatuses(p => ({ ...p, [acct.role]: `❌ ${e.message}` }))
    } finally {
      setLoading(p => ({ ...p, [acct.role]: false }))
    }
  }

  function copyToken(role: string) {
    if (tokens[role]) {
      navigator.clipboard.writeText(tokens[role])
      setStatuses(p => ({ ...p, [role]: `${p[role]?.split(' — ')[0]} — 📋 Token copied!` }))
    }
  }

  const dbMap = Object.fromEntries(dbAccounts.map(a => [a.role, a]))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {TEST_ACCOUNTS.map(acct => {
          const db = dbMap[acct.role]
          const hasToken = !!tokens[acct.role]
          return (
            <div key={acct.role} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{acct.name}</p>
                  <p className="text-xs text-gray-500">{acct.phone}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge color={db ? 'green' : 'gray'} label={db ? 'In DB' : 'Not created'} />
                  {db && <Badge color={db.status === 'ACTIVE' ? 'green' : 'amber'} label={db.status} />}
                </div>
              </div>

              {statuses[acct.role] && (
                <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  {statuses[acct.role]}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Btn
                  label={loading[acct.role] ? 'Creating…' : 'Create & Login'}
                  onClick={() => createAccount(acct)}
                  disabled={loading[acct.role]}
                  small
                />
                {hasToken && (
                  <Btn label="Copy Token" onClick={() => copyToken(acct.role)} color="gray" small />
                )}
                {db && (
                  <button
                    onClick={() => window.open(
                      acct.role === 'RIDER' ? '/rider/home' :
                      ['VENDOR','RESTAURANT','CORPORATE'].includes(acct.role) ? '/business/dashboard' :
                      '/home', '_blank'
                    )}
                    className="px-3 py-1.5 text-xs rounded-lg font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Open Screen ↗
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Section title="Database Account Status">
        {dbAccounts.length === 0 ? (
          <p className="text-sm text-gray-500">No test accounts in DB yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-2">Role</th><th className="pb-2">Phone</th>
                <th className="pb-2">Status</th><th className="pb-2">KYC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dbAccounts.map(a => (
                <tr key={a.id}>
                  <td className="py-2 font-medium">{a.role}</td>
                  <td className="py-2 text-gray-500">{a.phone}</td>
                  <td className="py-2"><Badge color={a.status === 'ACTIVE' ? 'green' : 'amber'} label={a.status} /></td>
                  <td className="py-2">
                    {a.riderProfile
                      ? <Badge color={a.riderProfile.verificationStatus === 'VERIFIED' ? 'green' : 'amber'} label={a.riderProfile.verificationStatus} />
                      : <Badge color="gray" label={a.verificationStatus ?? 'N/A'} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Btn label="Refresh" onClick={refreshAccounts} color="gray" small />
      </Section>
    </div>
  )
}

/* ── tab: DELIVERY SIM ───────────────────────────────────────────── */
function DeliverySimTab() {
  const [indToken, setIndToken] = useState('')
  const [riderToken, setRiderToken] = useState('')
  const [orderId, setOrderId] = useState('')
  const [orderStatus, setOrderStatus] = useState('')
  const [statusLog, setStatusLog] = useState<{ status: string; time: string }[]>([])
  const [gpsRunning, setGpsRunning] = useState(false)
  const [gpsPosIdx, setGpsPosIdx] = useState(0)
  const [gpsPos, setGpsPos] = useState(ABUJA_ROUTE[0])
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const gpsRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [pickup, setPickup] = useState('Wuse 2, Abuja')
  const [dropoff, setDropoff] = useState('Maitama, Abuja')
  const [deliveryType, setDeliveryType] = useState('ON_DEMAND')
  const [paymentMethod, setPaymentMethod] = useState('CASH')

  function log(status: string) {
    setOrderStatus(status)
    setStatusLog(p => [{ status, time: new Date().toLocaleTimeString() }, ...p.slice(0, 19)])
  }

  async function createOrder() {
    if (!indToken) return alert('Paste Individual token first')
    setBusy(p => ({ ...p, create: true }))
    try {
      const data = await call('POST', '/orders', indToken, {
        pickupAddress: pickup, dropoffAddress: dropoff,
        pickupLatitude: 9.0579, pickupLongitude: 7.4951,
        dropoffLatitude: 9.0800, dropoffLongitude: 7.4750,
        deliveryType, paymentMethod,
      })
      setOrderId(data.id)
      log(data.status)
    } catch (e: any) { alert(e.message) }
    finally { setBusy(p => ({ ...p, create: false })) }
  }

  async function patchStatus(status: string) {
    if (!orderId || !riderToken) return alert('Need order ID and rider token')
    setBusy(p => ({ ...p, [status]: true }))
    try {
      await call('PATCH', `/orders/${orderId}/status`, riderToken, { status })
      log(status)
    } catch (e: any) { alert(e.message) }
    finally { setBusy(p => ({ ...p, [status]: false })) }
  }

  async function confirmDelivery() {
    if (!orderId || !indToken) return
    setBusy(p => ({ ...p, confirm: true }))
    try {
      await call('POST', `/orders/${orderId}/confirm-delivery`, indToken)
      log('DELIVERED_CONFIRMED')
    } catch (e: any) { alert(e.message) }
    finally { setBusy(p => ({ ...p, confirm: false })) }
  }

  async function rateRider() {
    if (!orderId || !indToken) return
    try {
      await call('POST', `/orders/${orderId}/rate`, indToken, { stars: 5, comment: 'Great service!' })
      alert('✅ Rider rated 5 stars')
    } catch (e: any) { alert(e.message) }
  }

  function startGps() {
    if (!orderId || !riderToken) { alert('Need order ID and rider token'); return }
    const socket = io(API, { query: { token: riderToken }, transports: ['websocket'] })
    socket.connect()
    setGpsRunning(true)
    let idx = 0
    gpsRef.current = setInterval(() => {
      if (idx >= ABUJA_ROUTE.length) {
        clearInterval(gpsRef.current!)
        setGpsRunning(false)
        socket.disconnect()
        return
      }
      const pos = ABUJA_ROUTE[idx]
      setGpsPos(pos)
      setGpsPosIdx(idx)
      socket.emit('location_update', { orderId, latitude: pos.lat, longitude: pos.lng })
      idx++
    }, 2000)
  }

  function stopGps() {
    if (gpsRef.current) clearInterval(gpsRef.current)
    setGpsRunning(false)
  }

  const completedStatuses = new Set(statusLog.map(s => s.status))

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-4">
        {/* Tokens */}
        <Section title="1 — Tokens">
          <div className="space-y-2">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Individual Token</label>
              <input value={indToken} onChange={e => setIndToken(e.target.value)} placeholder="Paste from Accounts tab"
                className="w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Rider Token</label>
              <input value={riderToken} onChange={e => setRiderToken(e.target.value)} placeholder="Paste rider token"
                className="w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
          </div>
        </Section>

        {/* Create order */}
        <Section title="2 — Book Delivery">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Pickup</label>
              <input value={pickup} onChange={e => setPickup(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Dropoff</label>
              <input value={dropoff} onChange={e => setDropoff(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Type</label>
              <select value={deliveryType} onChange={e => setDeliveryType(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
                <option value="ON_DEMAND">On-Demand</option>
                <option value="SAME_DAY">Same-Day</option>
                <option value="SCHEDULED">Scheduled</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Payment</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="OPAY">Opay</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Btn label={busy.create ? 'Booking…' : 'Book Delivery'} onClick={createOrder} disabled={busy.create} />
            {orderId && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Order:</span>
                <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{orderId}</code>
                <button onClick={() => window.open(`/tracking/${orderId}/confirmed`, '_blank')}
                  className="text-xs text-blue-600 hover:underline">Open tracking ↗</button>
              </div>
            )}
          </div>
        </Section>

        {/* GPS */}
        <Section title="3 — GPS Simulation">
          <div className="flex items-center gap-3">
            {!gpsRunning
              ? <Btn label="Start GPS Stream" onClick={startGps} color="blue" />
              : <Btn label="Stop GPS" onClick={stopGps} color="red" />}
            <span className="text-xs text-gray-500">
              {gpsRunning ? `Point ${gpsPosIdx + 1}/${ABUJA_ROUTE.length} — ${gpsPos.lat.toFixed(4)}, ${gpsPos.lng.toFixed(4)}` : 'Not running'}
            </span>
          </div>
          {/* Mini route map */}
          <svg width="100%" height="80" className="rounded-lg bg-green-50 border border-green-100">
            <polyline points={ABUJA_ROUTE.map((p, i) => `${20 + i * 46},60`).join(' ')}
              fill="none" stroke="#16a34a" strokeWidth="2" strokeDasharray="4 2" />
            {ABUJA_ROUTE.map((_, i) => (
              <circle key={i} cx={20 + i * 46} cy={60} r={i === gpsPosIdx && gpsRunning ? 6 : 3}
                fill={i <= gpsPosIdx ? '#16a34a' : '#d1fae5'} stroke="#16a34a" strokeWidth="1" />
            ))}
          </svg>
        </Section>

        {/* Status progression */}
        <Section title="4 — Status Progression">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ORDER_STATUSES.map(s => (
              <button key={s} onClick={() => patchStatus(s)} disabled={!orderId || busy[s]}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${completedStatuses.has(s) ? 'bg-green-50 border-green-300 text-green-800' : 'bg-white border-gray-200 hover:border-blue-300 text-gray-700 disabled:opacity-40'}`}>
                {completedStatuses.has(s) ? '✅' : '○'} {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </Section>

        {/* Confirm + Rate */}
        <Section title="5 & 6 — Confirm & Rate">
          <div className="flex gap-3">
            <Btn label="Confirm Delivery (as user)" onClick={confirmDelivery} disabled={!orderId || busy.confirm} />
            <Btn label="Rate Rider ⭐⭐⭐⭐⭐" onClick={rateRider} color="amber" disabled={!orderId} />
          </div>
        </Section>
      </div>

      {/* Live status panel */}
      <div className="space-y-4">
        <Section title="Live Status">
          {orderStatus ? (
            <Badge color={orderStatus === 'DELIVERED_CONFIRMED' ? 'green' : 'blue'} label={orderStatus} />
          ) : (
            <p className="text-xs text-gray-400">No order yet</p>
          )}
          {orderId && (
            <div className="space-y-2">
              <button onClick={() => window.open(`/tracking/${orderId}`, '_blank')}
                className="w-full text-xs py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold">
                User View ↗
              </button>
              <button onClick={() => window.open('/rider/delivery/navigate', '_blank')}
                className="w-full text-xs py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-semibold">
                Rider View ↗
              </button>
            </div>
          )}
        </Section>
        <Section title="Status Log">
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {statusLog.length === 0 ? (
              <p className="text-xs text-gray-400">No events yet</p>
            ) : statusLog.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-mono text-gray-500">{e.time}</span>
                <Badge color="blue" label={e.status.replace(/_/g, ' ')} />
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

/* ── tab: RIDER SIM ──────────────────────────────────────────────── */
function RiderSimTab() {
  const [riderToken, setRiderToken] = useState('')
  const [riderStatus, setRiderStatus] = useState<any>(null)
  const [orderId, setOrderId] = useState('')

  async function toggleOnline() {
    if (!riderToken) return alert('Paste rider token first')
    try {
      const current = riderStatus?.isOnline ?? false
      await call('PATCH', '/riders/me/status', riderToken, { isOnline: !current })
      setRiderStatus((p: any) => ({ ...p, isOnline: !current }))
    } catch (e: any) { alert(e.message) }
  }

  async function fetchRiderStatus() {
    if (!riderToken) return
    try {
      const data = await call('GET', '/riders/me', riderToken)
      setRiderStatus(data)
    } catch { /* ignore */ }
  }

  const RIDER_SCREENS = [
    { label: 'Job Request', path: '/rider/delivery/request' },
    { label: 'Navigate to Pickup', path: '/rider/delivery/navigate' },
    { label: 'Arrived at Pickup', path: '/rider/delivery/arrived' },
    { label: 'Verify Package', path: '/rider/delivery/verify' },
    { label: 'In Transit', path: '/rider/delivery/transit' },
    { label: 'Complete Delivery', path: '/rider/delivery/complete' },
    { label: 'Delivery Success', path: '/rider/delivery/success' },
  ]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="space-y-4">
        <Section title="Rider Token">
          <input value={riderToken} onChange={e => setRiderToken(e.target.value)} placeholder="Paste rider JWT token"
            className="w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
          <div className="flex gap-2">
            <Btn label="Load Status" onClick={fetchRiderStatus} color="gray" small />
            <Btn label={riderStatus?.isOnline ? 'Go Offline' : 'Go Online'} onClick={toggleOnline} color={riderStatus?.isOnline ? 'red' : 'green'} small />
          </div>
          {riderStatus && (
            <div className="text-xs space-y-1 bg-gray-50 rounded-lg p-3">
              <p><span className="text-gray-500">Online:</span> <strong>{riderStatus.isOnline ? 'Yes' : 'No'}</strong></p>
              <p><span className="text-gray-500">KYC:</span> <strong>{riderStatus.verificationStatus}</strong></p>
              <p><span className="text-gray-500">Wallet:</span> <strong>₦{riderStatus.walletBalance ?? 0}</strong></p>
            </div>
          )}
        </Section>

        <Section title="Current Order">
          <input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Order ID"
            className="w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" />
        </Section>

        <Section title="Delivery Flow Screens">
          <p className="text-xs text-gray-500">Opens each rider screen in a new tab</p>
          <div className="space-y-2">
            {RIDER_SCREENS.map(s => (
              <button key={s.path} onClick={() => window.open(s.path, '_blank')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors text-sm font-medium text-gray-700">
                {s.label}
                <span className="text-xs text-gray-400">↗</span>
              </button>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Earnings Simulator">
        <p className="text-xs text-gray-500">Use Admin Tools tab to add test earnings via wallet credit endpoint.</p>
        <button onClick={() => window.open('/rider/earnings', '_blank')}
          className="px-4 py-2 text-sm rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-semibold">
          Open Earnings Screen ↗
        </button>
      </Section>
    </div>
  )
}

/* ── tab: ADMIN TOOLS ────────────────────────────────────────────── */
function AdminToolsTab() {
  const [pending, setPending] = useState<any[]>([])
  const [snapshot, setSnapshot] = useState<any>(null)
  const [pricing, setPricing] = useState({ baseFare: 300, perKmRate: 120, surgeMultiplier: 1.0 })
  const [pricingMsg, setPricingMsg] = useState('')

  async function loadPending() {
    try { setPending(await call('GET', '/dev/pending-approvals')) } catch { /* ignore */ }
  }

  async function loadSnapshot() {
    try { setSnapshot(await call('GET', '/dev/db-snapshot')) } catch { /* ignore */ }
  }

  useEffect(() => { loadPending(); loadSnapshot() }, [])

  async function approve(userId: string, role: string) {
    try {
      if (role === 'RIDER') await call('POST', `/dev/verify-rider/${userId}`)
      else await call('POST', `/dev/approve-business/${userId}`)
      await loadPending()
      alert('✅ Approved')
    } catch (e: any) { alert(e.message) }
  }

  async function updatePricing() {
    setPricingMsg('Saving…')
    try {
      await call('PATCH', '/dev/pricing', null, pricing)
      setPricingMsg('✅ Updated')
    } catch (e: any) { setPricingMsg(`❌ ${e.message}`) }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="space-y-4">
        <Section title="Pending Approvals">
          {pending.length === 0 ? (
            <p className="text-sm text-gray-500">No pending users</p>
          ) : pending.map(u => (
            <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-sm">{u.name ?? 'No name'}</p>
                <p className="text-xs text-gray-500">{u.phone} — {u.role}</p>
              </div>
              <div className="flex gap-2">
                <Btn label="Approve" onClick={() => approve(u.id, u.role)} small />
              </div>
            </div>
          ))}
          <Btn label="Refresh" onClick={loadPending} color="gray" small />
        </Section>

        <Section title="Pricing Controls">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Base Fare (₦)</label>
              <input type="number" value={pricing.baseFare}
                onChange={e => setPricing(p => ({ ...p, baseFare: Number(e.target.value) }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Per Km Rate (₦)</label>
              <input type="number" value={pricing.perKmRate}
                onChange={e => setPricing(p => ({ ...p, perKmRate: Number(e.target.value) }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Surge Multiplier: {pricing.surgeMultiplier}x
              </label>
              <input type="range" min="1" max="3" step="0.1" value={pricing.surgeMultiplier}
                onChange={e => setPricing(p => ({ ...p, surgeMultiplier: Number(e.target.value) }))}
                className="w-full" />
            </div>
            <div className="flex items-center gap-3">
              <Btn label="Update Pricing" onClick={updatePricing} />
              <Btn label="Reset Defaults" onClick={() => setPricing({ baseFare: 300, perKmRate: 120, surgeMultiplier: 1.0 })} color="gray" />
              {pricingMsg && <span className="text-xs text-gray-600">{pricingMsg}</span>}
            </div>
          </div>
        </Section>
      </div>

      <div className="space-y-4">
        <Section title="DB Snapshot">
          <div className="flex justify-between items-center">
            <Btn label="Refresh" onClick={loadSnapshot} color="gray" small />
            <button onClick={() => window.open('/admin/dashboard', '_blank')}
              className="text-xs text-blue-600 hover:underline">Open Admin ↗</button>
          </div>
          {snapshot ? (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(snapshot).map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="font-bold text-xl text-gray-900">{String(v)}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400">Loading…</p>}
        </Section>
      </div>
    </div>
  )
}

/* ── tab: SOCKET MONITOR ─────────────────────────────────────────── */
const EVENT_COLORS: Record<string, string> = {
  rider_location: 'text-green-700 bg-green-50',
  order_assigned: 'text-blue-700 bg-blue-50',
  job_request: 'text-amber-700 bg-amber-50',
  no_riders_available: 'text-red-700 bg-red-50',
  new_message: 'text-purple-700 bg-purple-50',
  order_status_update: 'text-blue-700 bg-blue-50',
}

interface SocketEvent {
  id: number; ts: string; name: string; payload: unknown
}

function SocketMonitorTab() {
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState<SocketEvent[]>([])
  const [paused, setPaused] = useState(false)
  const [emitName, setEmitName] = useState('')
  const [emitPayload, setEmitPayload] = useState('{}')
  const [token, setToken] = useState('')
  const [filters, setFilters] = useState<Set<string>>(new Set())
  const socketRef = useRef<Socket | null>(null)
  const counterRef = useRef(0)
  const pausedRef = useRef(false)

  pausedRef.current = paused

  const addEvent = useCallback((name: string, payload: unknown) => {
    if (pausedRef.current) return
    setEvents(p => [{
      id: counterRef.current++,
      ts: new Date().toLocaleTimeString(),
      name,
      payload,
    }, ...p.slice(0, 99)])
  }, [])

  function connect() {
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null }
    const t = token || (typeof window !== 'undefined' ? localStorage.getItem('fair-ride-token') ?? '' : '')
    const sock = io(API, { query: { token: t }, transports: ['websocket'] })
    const ALL_EVENTS = ['rider_location','order_assigned','job_request','no_riders_available','new_message','order_status_update','connect','disconnect','error']
    ALL_EVENTS.forEach(ev => sock.on(ev, (data) => {
      if (ev === 'connect') setConnected(true)
      if (ev === 'disconnect') setConnected(false)
      addEvent(ev, data)
    }))
    sock.onAny((name, data) => {
      if (!ALL_EVENTS.includes(name)) addEvent(name, data)
    })
    sock.connect()
    socketRef.current = sock
  }

  function disconnect() {
    socketRef.current?.disconnect()
    socketRef.current = null
    setConnected(false)
  }

  useEffect(() => () => { socketRef.current?.disconnect() }, [])

  function emitEvent() {
    if (!socketRef.current || !emitName) return
    try {
      const payload = JSON.parse(emitPayload)
      socketRef.current.emit(emitName, payload)
      addEvent(`[SENT] ${emitName}`, payload)
    } catch { alert('Invalid JSON payload') }
  }

  const displayed = filters.size === 0
    ? events
    : events.filter(e => filters.has(e.name))

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-4">
        <Section title="Connection">
          <input value={token} onChange={e => setToken(e.target.value)} placeholder="JWT token (optional — uses localStorage if empty)"
            className="w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" />
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
            <span className="text-sm font-medium">{connected ? 'Connected' : 'Disconnected'}</span>
            <Btn label="Connect" onClick={connect} color="blue" small />
            <Btn label="Disconnect" onClick={disconnect} color="red" small />
          </div>
        </Section>

        <Section title="Event Log">
          <div className="flex items-center gap-3 flex-wrap">
            <Btn label="Clear" onClick={() => setEvents([])} color="gray" small />
            <Btn label={paused ? 'Resume' : 'Pause'} onClick={() => setPaused(p => !p)} color={paused ? 'green' : 'amber'} small />
            <span className="text-xs text-gray-500">{events.length} events</span>
          </div>
          <div className="h-96 overflow-y-auto space-y-1 font-mono text-xs">
            {displayed.length === 0
              ? <p className="text-gray-400 p-3">No events yet — connect and trigger actions</p>
              : displayed.map(ev => (
                <div key={ev.id} className={`rounded px-2 py-1.5 ${EVENT_COLORS[ev.name] ?? 'text-gray-700 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold">{ev.name}</span>
                    <span className="text-gray-400">{ev.ts}</span>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-gray-500">payload</summary>
                    <pre className="mt-1 text-[10px] overflow-x-auto">{JSON.stringify(ev.payload, null, 2)}</pre>
                  </details>
                </div>
              ))}
          </div>
        </Section>
      </div>

      <div className="space-y-4">
        <Section title="Emit Custom Event">
          <input value={emitName} onChange={e => setEmitName(e.target.value)} placeholder="Event name"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" />
          <textarea value={emitPayload} onChange={e => setEmitPayload(e.target.value)} rows={4}
            className="w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2 focus:outline-none resize-none" />
          <Btn label="Emit" onClick={emitEvent} color="blue" />
        </Section>

        <Section title="Filter Events">
          {Object.keys(EVENT_COLORS).map(name => (
            <label key={name} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox"
                checked={filters.has(name)}
                onChange={e => setFilters(p => {
                  const next = new Set(p)
                  if (e.target.checked) next.add(name)
                  else next.delete(name)
                  return next
                })} />
              <span className="text-xs font-mono">{name}</span>
            </label>
          ))}
          {filters.size > 0 && <Btn label="Clear Filters" onClick={() => setFilters(new Set())} color="gray" small />}
        </Section>
      </div>
    </div>
  )
}

/* ── tab: QUICK RESET ────────────────────────────────────────────── */
function QuickResetTab() {
  const [snapshot, setSnapshot] = useState<any>(null)
  const [msg, setMsg] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState<string | null>(null)

  async function loadSnapshot() {
    try { setSnapshot(await call('GET', '/dev/db-snapshot')) } catch { /* ignore */ }
  }

  useEffect(() => { loadSnapshot() }, [])

  async function run(key: string, label: string, fn: () => Promise<unknown>) {
    if (confirming !== key) { setConfirming(key); return }
    setConfirming(null)
    setMsg(p => ({ ...p, [key]: '⏳ Running…' }))
    try {
      const res = await fn()
      setMsg(p => ({ ...p, [key]: `✅ Done — ${JSON.stringify(res)}` }))
      await loadSnapshot()
    } catch (e: any) {
      setMsg(p => ({ ...p, [key]: `❌ ${e.message}` }))
    }
  }

  const RESETS = [
    {
      key: 'testData',
      label: '🗑 Delete All Test Accounts + Orders',
      desc: 'Removes all accounts with test phone numbers and their associated orders, payments, and ratings.',
      fn: () => call('DELETE', '/dev/reset-test-data'),
      color: 'red' as const,
    },
    {
      key: 'pricing',
      label: '💰 Reset Pricing to Defaults',
      desc: 'Sets base fare ₦300, per km ₦120, surge 1.0x.',
      fn: () => call('PATCH', '/dev/pricing', null, { baseFare: 300, perKmRate: 120, surgeMultiplier: 1.0 }),
      color: 'amber' as const,
    },
  ]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="space-y-4">
        {RESETS.map(r => (
          <div key={r.key} className="bg-white border border-red-100 rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-red-600 text-sm">⚠</span>
              </div>
              <div>
                <p className="font-bold text-gray-900">{r.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
              </div>
            </div>
            {msg[r.key] && <p className="text-xs bg-gray-50 rounded-lg px-3 py-2">{msg[r.key]}</p>}
            <button
              onClick={() => run(r.key, r.label, r.fn)}
              className={`px-4 py-2 text-sm rounded-lg font-semibold transition-colors ${confirming === r.key ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
            >
              {confirming === r.key ? '⚠ Click again to confirm' : r.label}
            </button>
          </div>
        ))}

        {/* Full reset */}
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 space-y-3">
          <p className="font-bold text-red-800">🔴 FULL RESET — Delete Everything</p>
          <p className="text-xs text-red-600">Deletes all test accounts, orders, and resets pricing.</p>
          {msg.full && <p className="text-xs bg-white rounded-lg px-3 py-2">{msg.full}</p>}
          <button
            onClick={async () => {
              if (confirming !== 'full') { setConfirming('full'); return }
              setConfirming(null)
              setMsg(p => ({ ...p, full: '⏳ Resetting…' }))
              try {
                await call('DELETE', '/dev/reset-test-data')
                await call('PATCH', '/dev/pricing', null, { baseFare: 300, perKmRate: 120, surgeMultiplier: 1.0 })
                await loadSnapshot()
                setMsg(p => ({ ...p, full: '✅ Clean slate — ready for fresh testing' }))
              } catch (e: any) { setMsg(p => ({ ...p, full: `❌ ${e.message}` })) }
            }}
            className={`px-4 py-2 text-sm rounded-lg font-semibold transition-colors ${confirming === 'full' ? 'bg-red-700 text-white' : 'bg-red-600 text-white hover:bg-red-700'}`}
          >
            {confirming === 'full' ? '⚠ Click again to confirm FULL RESET' : '🔴 FULL RESET'}
          </button>
        </div>
      </div>

      <Section title="DB Snapshot">
        <Btn label="Refresh" onClick={loadSnapshot} color="gray" small />
        {snapshot ? (
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(snapshot).map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                <p className="font-bold text-2xl text-gray-900">{String(v)}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-gray-400">Loading…</p>}
      </Section>
    </div>
  )
}

/* ── root page ───────────────────────────────────────────────────── */
export default function DevToolsPage() {
  const [tab, setTab] = useState<Tab>('Accounts')

  if (process.env.NODE_ENV === 'production') return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">🧪</span>
          <span className="font-bold tracking-tight">Fair-Ride Test Suite</span>
          <span className="px-2 py-0.5 bg-red-600 rounded text-[11px] font-bold uppercase tracking-wider">DEV ONLY</span>
        </div>
        <span className="text-xs text-gray-400">localhost:3001 backend</span>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {tab === 'Accounts'       && <AccountsTab />}
        {tab === 'Delivery Sim'   && <DeliverySimTab />}
        {tab === 'Rider Sim'      && <RiderSimTab />}
        {tab === 'Admin Tools'    && <AdminToolsTab />}
        {tab === 'Socket Monitor' && <SocketMonitorTab />}
        {tab === 'Quick Reset'    && <QuickResetTab />}
      </div>
    </div>
  )
}
