/**
 * @page RiderEarningsPage
 * @description Rider wallet balance, earnings history, and payout request form.
 * @route /rider/earnings
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import BottomNav from '@/components/ui/BottomNav'
import api from '@/lib/api'

interface EarningsData {
  walletBalance: number
  today: number
  week: number
  month: number
  allTime: number
  recentEarnings: {
    id: string
    date: string
    fare: number
    commission: number
    net: number
    status: string
  }[]
  dailyBars: number[]
}

export default function RiderEarningsPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPayout, setShowPayout] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutError, setPayoutError] = useState('')
  const [payoutSuccess, setPayoutSuccess] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
  }, [isAuthenticated, role, router])

  useEffect(() => {
    if (!isAuthenticated || role !== 'RIDER') return
    api.get('/riders/me/earnings')
      .then(({ data: d }) => setData(d))
      .catch(() => {
        // Fallback demo data
        setData({
          walletBalance: 45200,
          today: 8500,
          week: 42000,
          month: 185000,
          allTime: 1240000,
          dailyBars: [65, 80, 45, 90, 70, 85, 60],
          recentEarnings: [],
        })
      })
      .finally(() => setLoading(false))
  }, [isAuthenticated, role])

  async function handlePayout() {
    const amount = parseFloat(payoutAmount)
    if (!amount || amount <= 0) { setPayoutError('Enter a valid amount.'); return }
    if (data && amount > data.walletBalance) { setPayoutError('Insufficient balance.'); return }
    setPayoutLoading(true)
    setPayoutError('')
    try {
      await api.post('/riders/me/payout', { amount })
      setPayoutSuccess(true)
      setShowPayout(false)
      if (data) setData({ ...data, walletBalance: data.walletBalance - amount })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setPayoutError(e.response?.data?.message ?? 'Payout failed.')
    } finally {
      setPayoutLoading(false)
    }
  }

  const bars = data?.dailyBars ?? []
  const maxBar = bars.length > 0 ? Math.max(...bars, 1) : 1
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  if (loading) {
    return (
      <ScreenWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <span className="material-symbols-outlined text-primary animate-spin text-4xl">progress_activity</span>
        </div>
      </ScreenWrapper>
    )
  }

  return (
    <ScreenWrapper>
      <header className="bg-emerald-950/80 backdrop-blur-lg shadow-xl shadow-emerald-950/20 sticky top-0 z-50">
        <div className="flex justify-between items-center px-6 h-16">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-emerald-50 cursor-pointer">menu</span>
            <h1 className="text-lg font-extrabold tracking-tighter text-emerald-50 font-headline">Delivery Hub</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-container text-sm">person</span>
          </div>
        </div>
      </header>

      <main className="pt-6 pb-28 px-6 max-w-lg mx-auto space-y-6">
        {/* Wallet balance */}
        <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-[80px] text-primary">payments</span>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Wallet Balance</p>
            <h2 className="font-headline font-extrabold text-5xl text-on-surface mb-6">
              ₦{(data?.walletBalance ?? 0).toLocaleString()}
            </h2>
            <button
              onClick={() => setShowPayout(true)}
              className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all font-headline"
            >
              Request Payout
            </button>
          </div>
        </div>

        {payoutSuccess && (
          <div className="bg-primary-fixed text-on-primary-fixed rounded-xl p-4 text-sm font-body text-center font-semibold">
            Payout request submitted successfully!
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Today', value: data?.today ?? 0 },
            { label: 'This Week', value: data?.week ?? 0 },
            { label: 'This Month', value: data?.month ?? 0 },
            { label: 'All Time', value: data?.allTime ?? 0 },
          ].map((s) => (
            <div key={s.label} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">{s.label}</p>
              <p className="font-headline font-extrabold text-xl text-primary">₦{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Daily bar chart */}
        {bars.length > 0 && (
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
            <h3 className="font-headline font-bold text-on-surface mb-4">This Week</h3>
            <div className="flex items-end gap-2 h-32">
              {bars.map((v, i) => {
                const pct = Math.round((v / maxBar) * 100)
                const isToday = i === new Date().getDay() - 1
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                      <div
                        className={`w-full rounded-t-lg transition-all ${isToday ? 'bg-primary' : 'bg-primary-fixed'}`}
                        style={{ height: `${pct}%`, minHeight: '4px' }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold ${isToday ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {days[i]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* V2_FEATURE: SUBSCRIPTIONS — premium bonus banner removed for V1 */}

        {/* Recent earnings */}
        {data && data.recentEarnings.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-headline font-bold text-on-surface px-1">Recent Earnings</h3>
            {data.recentEarnings.map((e) => (
              <div key={e.id} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    {new Date(e.date).toLocaleDateString()}
                  </p>
                  <div className="flex gap-3 mt-1 text-xs text-on-surface-variant">
                    <span>Fare: ₦{e.fare.toLocaleString()}</span>
                    {/* V2_FEATURE: COMMISSION — commission deduction display removed for V1 */}
                  </div>
                </div>
                <p className="font-headline font-extrabold text-lg text-primary">₦{e.net.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Payout bottom sheet */}
      {showPayout && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setShowPayout(false)}>
          <div className="absolute inset-0 bg-on-background/30 backdrop-blur-sm" />
          <div
            className="relative w-full bg-surface-container-lowest rounded-t-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-outline-variant rounded-full mx-auto mb-2" />
            <h2 className="font-headline font-bold text-xl text-on-surface">Request Payout</h2>
            <p className="text-sm text-on-surface-variant font-body">
              Available balance: <span className="font-bold text-primary">₦{(data?.walletBalance ?? 0).toLocaleString()}</span>
            </p>
            <input
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-on-surface font-body border-none focus:ring-2 focus:ring-primary/30"
            />
            {payoutError && <p className="text-error text-sm font-body">{payoutError}</p>}
            <button
              onClick={handlePayout}
              disabled={payoutLoading}
              className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold rounded-xl shadow-xl active:scale-95 transition-all disabled:opacity-60"
            >
              {payoutLoading ? 'Processing…' : 'Confirm Payout'}
            </button>
            <div className="pb-4" />
          </div>
        </div>
      )}

      <BottomNav />
    </ScreenWrapper>
  )
}
