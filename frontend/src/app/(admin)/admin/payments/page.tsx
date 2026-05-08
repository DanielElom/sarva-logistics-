'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

interface Transaction {
  id: string
  type: 'TRIP_PAYMENT' | 'RIDER_PAYOUT' | 'WALLET_TOPUP' | 'REFUND'
  amount: number
  status: 'SUCCESS' | 'PENDING' | 'FAILED'
  user: string
  date: string
}

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'TRIP_PAYMENT', amount: 3200, status: 'SUCCESS', user: 'Ngozi Adamu', date: '2024-05-07 09:12' },
  { id: '2', type: 'RIDER_PAYOUT', amount: 42000, status: 'SUCCESS', user: 'Emeka Okafor', date: '2024-05-07 08:00' },
  { id: '3', type: 'WALLET_TOPUP', amount: 5000, status: 'PENDING', user: 'Seun Adeola', date: '2024-05-07 10:30' },
  { id: '4', type: 'REFUND', amount: 1800, status: 'SUCCESS', user: 'Amaka Obi', date: '2024-05-06 14:20' },
  { id: '5', type: 'TRIP_PAYMENT', amount: 2100, status: 'FAILED', user: 'Kunle Bakare', date: '2024-05-06 16:45' },
]

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(DEMO_TRANSACTIONS)
  const [showPayout, setShowPayout] = useState(false)

  const fetchPayments = useCallback(async () => {
    try {
      const res = await api.get('/admin/payments')
      setTransactions(res.data)
    } catch { /* keep demo */ }
  }, [])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const totalCommission = 2400000
  const riderPayouts = 18600000
  const walletBalance = 4100000

  function txBadge(status: Transaction['status']) {
    if (status === 'SUCCESS') return 'bg-secondary-container text-on-secondary-container'
    if (status === 'PENDING') return 'bg-primary-fixed text-on-primary-fixed'
    return 'bg-error-container text-on-error-container'
  }

  function txIcon(type: Transaction['type']) {
    if (type === 'TRIP_PAYMENT') return 'payments'
    if (type === 'RIDER_PAYOUT') return 'account_balance_wallet'
    if (type === 'WALLET_TOPUP') return 'add_card'
    return 'undo'
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">Payments & Wallets</h1>
          <p className="text-xs text-on-surface-variant">Financial overview · May 2024</p>
        </div>
        <button
          onClick={() => setShowPayout(true)}
          className="px-5 py-2 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl text-sm font-bold shadow-sm"
        >
          Process Payouts
        </button>
      </header>

      <div className="p-8 space-y-8">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Platform Commission</p>
            <p className="font-headline font-extrabold text-3xl text-primary">₦{(totalCommission / 1000000).toFixed(1)}M</p>
            <p className="text-xs text-on-surface-variant mt-1">15% of ₦{(totalCommission / 0.15 / 1000000).toFixed(0)}M GMV</p>
          </div>
          <div className="bg-primary text-on-primary rounded-xl p-6">
            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Rider Payouts (Month)</p>
            <p className="font-headline font-extrabold text-3xl">₦{(riderPayouts / 1000000).toFixed(1)}M</p>
            <p className="text-xs opacity-60 mt-1">85% of trip revenue</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Wallet Balance (System)</p>
            <p className="font-headline font-extrabold text-3xl text-on-surface">₦{(walletBalance / 1000000).toFixed(1)}M</p>
            <p className="text-xs text-on-surface-variant mt-1">1,204 active wallets</p>
          </div>
        </div>

        {/* Transaction flow diagram */}
        <div className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10">
          <h3 className="font-headline font-bold text-lg text-on-surface mb-6">Transaction Flow</h3>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-xl bg-primary-container flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-outlined text-on-primary">person</span>
              </div>
              <p className="text-xs font-bold text-on-surface">User Pays</p>
              <p className="text-xs text-on-surface-variant">Full trip fare</p>
            </div>
            <div className="flex-1 flex items-center gap-1">
              <div className="flex-1 h-0.5 bg-outline-variant" />
              <span className="material-symbols-outlined text-on-surface-variant text-sm">arrow_forward</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-outlined text-on-primary">architecture</span>
              </div>
              <p className="text-xs font-bold text-on-surface">Platform</p>
              <p className="text-xs text-on-surface-variant">15% retained</p>
            </div>
            <div className="flex-1 flex items-center gap-1">
              <div className="flex-1 h-0.5 bg-outline-variant" />
              <span className="material-symbols-outlined text-on-surface-variant text-sm">arrow_forward</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-xl bg-secondary-container flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-outlined text-on-secondary-container">electric_moped</span>
              </div>
              <p className="text-xs font-bold text-on-surface">Rider Earns</p>
              <p className="text-xs text-on-surface-variant">85% payout</p>
            </div>
          </div>
        </div>

        {/* Transactions table */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
            <h3 className="font-headline font-bold text-on-surface">Recent Transactions</h3>
            <button className="text-xs font-bold text-primary hover:underline">View All</button>
          </div>
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant/10">
              <tr>
                {['Type', 'User', 'Amount', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-sm">{txIcon(tx.type)}</span>
                      </div>
                      <span className="text-xs font-medium text-on-surface">{tx.type.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-on-surface-variant">{tx.user}</td>
                  <td className="px-4 py-4">
                    <span className={`text-sm font-bold ${tx.type === 'REFUND' ? 'text-error' : 'text-on-surface'}`}>
                      {tx.type === 'REFUND' ? '-' : '+'}₦{tx.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${txBadge(tx.status)}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-on-surface-variant">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payout cycle alert */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center gap-4">
          <span className="material-symbols-outlined text-primary">schedule</span>
          <div>
            <p className="text-sm font-bold text-on-surface">Next Payout Cycle: Monday, 12 May 2024</p>
            <p className="text-xs text-on-surface-variant">₦18.6M scheduled for 340 active riders · Weekly settlement</p>
          </div>
          <button className="ml-auto px-5 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl">Process Now</button>
        </div>
      </div>

      {/* Payout modal */}
      {showPayout && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-6" onClick={() => setShowPayout(false)}>
          <div className="bg-surface-container-lowest rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline font-bold text-xl text-on-surface mb-4">Process Payouts</h3>
            <p className="text-sm text-on-surface-variant mb-6">This will initiate payouts to all eligible riders with a balance above the minimum threshold.</p>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Eligible riders</span>
                <span className="font-bold text-on-surface">340</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Total payout</span>
                <span className="font-bold text-on-surface">₦18,600,000</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPayout(false)} className="flex-1 py-3 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm">Cancel</button>
              <button onClick={() => setShowPayout(false)} className="flex-[2] py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl text-sm">Confirm Payout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
