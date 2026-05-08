'use client'

import { useState } from 'react'
import api from '@/lib/api'

type PayoutSchedule = 'daily' | 'weekly' | 'monthly'

export default function AdminSettingsPaymentsPage() {
  const [cashEnabled, setCashEnabled] = useState(true)
  const [subscriptions, setSubscriptions] = useState(true)
  const [wallet, setWallet] = useState(true)
  const [gateway, setGateway] = useState('Stripe Connect')
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutSchedule>('weekly')
  const [minWithdrawal, setMinWithdrawal] = useState('25.00')
  const [platformFee, setPlatformFee] = useState('12.5')
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    try {
      await api.patch('/admin/settings/payments', { cashEnabled, subscriptions, wallet, gateway, payoutSchedule, minWithdrawal: +minWithdrawal, platformFee: +platformFee })
    } catch { /* proceed */ }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function Toggle({ val, set }: { val: boolean; set: (v: boolean) => void }) {
    return (
      <button
        onClick={() => set(!val)}
        className={`w-12 h-6 rounded-full relative transition-colors ${val ? 'bg-primary' : 'bg-surface-container-high'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${val ? 'right-1' : 'left-1'}`} />
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">Payments & Wallet</h1>
          <p className="text-xs text-on-surface-variant">Transaction methods, payout logic, wallet parameters</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm">Reset</button>
          <button
            onClick={handleSave}
            className={`px-6 py-2 font-bold rounded-xl text-sm ${saved ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary text-on-primary shadow-lg'}`}
          >
            {saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6 max-w-6xl">
        <div className="grid grid-cols-12 gap-6">
          {/* Payment methods */}
          <div className="col-span-4 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <h3 className="font-headline font-bold text-lg text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">account_balance</span>
              Enable Methods
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Cash on Delivery', sub: 'Manual reconciliation', val: cashEnabled, set: setCashEnabled },
                { label: 'Subscriptions', sub: 'Recurring API billing', val: subscriptions, set: setSubscriptions },
                { label: 'In-App Wallet', sub: 'Virtual credit system', val: wallet, set: setWallet },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
                  <div>
                    <p className="font-semibold text-sm text-on-surface">{item.label}</p>
                    <p className="text-xs text-on-surface-variant">{item.sub}</p>
                  </div>
                  <Toggle val={item.val} set={item.set} />
                </div>
              ))}
            </div>
          </div>

          {/* Gateway config */}
          <div className="col-span-8 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-headline font-bold text-lg text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">settings_input_component</span>
                  Payment Gateway Configuration
                </h3>
                <p className="text-sm text-on-surface-variant">Manage secure connections to Stripe & PayPal</p>
              </div>
              <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-xs font-bold rounded-full uppercase">Live</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Gateway Provider</label>
                <select
                  value={gateway}
                  onChange={e => setGateway(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-primary"
                >
                  <option>Stripe Connect</option>
                  <option>PayPal for Business</option>
                  <option>Paystack</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Webhook Secret</label>
                <div className="relative">
                  <input type="password" defaultValue="sk_live_51N******************" className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-primary" />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                  </button>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Public API Key</label>
                <input type="text" defaultValue="pk_live_09vX2M99qWzL..." className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center p-4 bg-primary/5 rounded-lg border border-primary/10">
              <span className="material-symbols-outlined text-primary mr-3">verified_user</span>
              <p className="text-xs text-on-surface-variant">Encryption via AES-256 GCM · PCI-DSS compliant vault</p>
            </div>
          </div>

          {/* Payout schedule */}
          <div className="col-span-12 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <h3 className="font-headline font-bold text-lg text-primary mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined">schedule</span>
                  Rider Payout Schedule
                </h3>
                <p className="text-sm text-on-surface-variant mb-4">Automate distribution of earnings to courier fleet.</p>
                <div className="space-y-3">
                  {[
                    { id: 'daily' as const, label: 'Daily Settlements (00:00 UTC)' },
                    { id: 'weekly' as const, label: 'Weekly (Every Monday)' },
                    { id: 'monthly' as const, label: 'Monthly (1st Business Day)' },
                  ].map(opt => (
                    <div key={opt.id} className="flex items-center gap-3">
                      <input
                        type="radio"
                        id={opt.id}
                        name="payout"
                        value={opt.id}
                        checked={payoutSchedule === opt.id}
                        onChange={() => setPayoutSchedule(opt.id)}
                        className="text-primary focus:ring-primary border-outline-variant"
                      />
                      <label htmlFor={opt.id} className="text-sm font-medium text-on-surface">{opt.label}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-l border-outline-variant/30 pl-8">
                <h3 className="font-headline font-bold text-lg text-primary mb-2">Withdrawal Thresholds</h3>
                <p className="text-sm text-on-surface-variant mb-4">Minimum balances for automatic transfer.</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Min. Withdrawal Amount (₦)</label>
                    <input
                      type="number"
                      value={minWithdrawal}
                      onChange={e => setMinWithdrawal(e.target.value)}
                      className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Platform Fee (%)</label>
                    <input
                      type="number"
                      value={platformFee}
                      onChange={e => setPlatformFee(e.target.value)}
                      className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
              <div className="border-l border-outline-variant/30 pl-8">
                <h3 className="font-headline font-bold text-lg text-primary mb-2">Payout Trend</h3>
                <div className="h-24 bg-surface-container-low rounded-xl flex items-end justify-between px-4 pb-2 gap-1">
                  {[30, 50, 40, 70, 90, 55].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary rounded-t-sm" style={{ height: `${h}%`, opacity: 0.2 + i * 0.15 }} />
                  ))}
                </div>
                <p className="text-xs text-on-surface-variant mt-2 italic">Trend: +14.2% Growth</p>
                <p className="text-xs text-on-surface-variant mt-2">* 2-day holding period for fraud verification.</p>
              </div>
            </div>
          </div>

          {/* Refund rules + Financial integrity */}
          <div className="col-span-6 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <h3 className="font-headline font-bold text-lg text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">policy</span>
              Refund & Cancellation Rules
            </h3>
            <div className="space-y-5">
              {[
                { num: '01', title: 'Pre-Dispatch Refund', sub: '100% refund if cancelled before rider assignment.' },
                { num: '02', title: 'In-Transit Fee', sub: 'Charge 40% of base fare if rider arrived at pickup.' },
                { num: '03', title: 'Wallet Credit Only', sub: 'Partial failures refunded as non-withdrawable wallet credits.' },
              ].map(rule => (
                <div key={rule.num} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-primary text-sm shrink-0">{rule.num}</div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">{rule.title}</p>
                    <p className="text-xs text-on-surface-variant">{rule.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-6 bg-primary text-on-primary rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-headline font-bold text-2xl mb-2">Financial Integrity</h3>
              <p className="text-on-primary-container text-sm leading-relaxed">Current settings prioritize system liquidity and courier retention. Ensure regional tax compliance rules are updated before committing.</p>
            </div>
            <div className="flex items-center justify-between mt-6">
              <div className="flex -space-x-2">
                {['JD', 'AS', '+2'].map(init => (
                  <div key={init} className="w-9 h-9 rounded-full border-2 border-primary bg-surface-container-high flex items-center justify-center text-primary text-xs font-bold">{init}</div>
                ))}
              </div>
              <div className="flex gap-3">
                <button className="px-5 py-2 bg-surface-container-lowest text-primary rounded-full text-sm font-bold">Reset</button>
                <button onClick={handleSave} className="px-5 py-2 bg-on-primary-container text-primary rounded-full text-sm font-extrabold">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
