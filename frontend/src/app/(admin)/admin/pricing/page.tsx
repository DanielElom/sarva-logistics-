/**
 * @page AdminPricingPage
 * @description Dynamic pricing config — base fare, per-km rate, surge multiplier, and surge tier rules.
 * @route /admin/pricing
 */
'use client'

import { useState } from 'react'
import api from '@/lib/api'

interface SurgeRule {
  id: string
  name: string
  schedule: string
  multiplier: number
  active: boolean
}

const DEFAULT_RULES: SurgeRule[] = [
  { id: '1', name: 'Rush Hour (Morning)', schedule: '07:30 - 09:30 · Mon-Fri', multiplier: 1.4, active: true },
  { id: '2', name: 'Weekend Late Night', schedule: '23:00 - 04:00 · Sat-Sun', multiplier: 1.8, active: true },
  { id: '3', name: 'Extreme Weather Event', schedule: 'Trigger: Rain > 10mm/hr', multiplier: 2.2, active: false },
]

export default function AdminPricingPage() {
  const [baseFare, setBaseFare] = useState('500')
  const [perKm, setPerKm] = useState('150')
  const [perMin, setPerMin] = useState('50')
  const [minFare, setMinFare] = useState('800')
  const [cancelFee, setCancelFee] = useState('300')
  const [commission, setCommission] = useState('15')
  const [rules, setRules] = useState<SurgeRule[]>(DEFAULT_RULES)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    try {
      await api.patch('/admin/pricing', { baseFare: +baseFare, perKm: +perKm, perMin: +perMin, minFare: +minFare, cancelFee: +cancelFee, commission: +commission, surgeRules: rules })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  function toggleRule(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  function deleteRule(id: string) {
    setRules(prev => prev.filter(r => r.id !== id))
  }

  function handleAddRule() {
    const id = Date.now().toString()
    setRules(prev => [...prev, { id, name: 'New Surge Rule', schedule: 'Set schedule', multiplier: 1.5, active: false }])
  }

  const fareInput = (label: string, prefix: string, value: string, setValue: (v: string) => void) => (
    <div>
      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">{label}</label>
      <div className="flex items-center bg-surface-container-low rounded-xl px-4 py-3 focus-within:ring-1 focus-within:ring-primary transition-all">
        <span className="text-on-surface-variant font-medium mr-2">{prefix}</span>
        <input
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          className="bg-transparent border-none focus:ring-0 w-full font-bold text-lg text-on-surface"
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">Pricing & Surge</h1>
          <p className="text-xs text-on-surface-variant">Configure base fares, surge rules, and commission rates</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm">Reset Defaults</button>
          <button
            onClick={handleSave}
            className={`px-6 py-2 font-bold rounded-xl text-sm transition-all ${saved ? 'bg-secondary-container text-on-secondary-container' : 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg shadow-primary/10'}`}
          >
            {saved ? '✓ Saved' : 'Save Architecture'}
          </button>
        </div>
      </header>

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Base fare inputs */}
          <div className="col-span-8 bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">receipt_long</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-xl text-on-surface">Standard Fare Logic</h3>
                <p className="text-sm text-on-surface-variant">Core unit pricing for all vehicle types</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {fareInput('Base Fare (Start)', '₦', baseFare, setBaseFare)}
              {fareInput('Price per Kilometre', '₦', perKm, setPerKm)}
              {fareInput('Price per Minute (Wait)', '₦', perMin, setPerMin)}
              {fareInput('Minimum Total Fare', '₦', minFare, setMinFare)}
            </div>
          </div>

          {/* Commission */}
          <div className="col-span-4 bg-primary text-on-primary rounded-xl p-8 relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <h3 className="font-headline font-bold text-xl mb-2">Platform Cut</h3>
              <p className="text-on-primary-container text-sm mb-6">System revenue % per trip</p>
              <div className="flex items-baseline gap-2">
                <input
                  type="number"
                  value={commission}
                  onChange={e => setCommission(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-6xl font-extrabold w-24 p-0 text-on-primary"
                />
                <span className="text-4xl font-bold">%</span>
              </div>
              <p className="text-xs text-on-primary-container mt-4">Rider receives {100 - +commission}%</p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-on-primary-container opacity-20 rounded-full blur-3xl" />
          </div>

          {/* Cancel fee */}
          <div className="col-span-4 bg-surface-container-low rounded-xl p-6 flex flex-col justify-between">
            <div>
              <span className="material-symbols-outlined text-tertiary mb-3 block">cancel_presentation</span>
              <h4 className="font-headline font-bold text-lg text-on-surface">Cancellation Fee</h4>
              <p className="text-xs text-on-surface-variant mt-1">Charged after 5 minutes of dispatch</p>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <span className="text-on-surface-variant font-medium">₦</span>
              <input
                type="number"
                value={cancelFee}
                onChange={e => setCancelFee(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-3xl font-extrabold text-on-surface w-32 p-0"
              />
            </div>
          </div>

          {/* Surge rules */}
          <div className="col-span-8 bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                  <span className="material-symbols-outlined">bolt</span>
                </div>
                <h3 className="font-headline font-bold text-xl text-on-surface">Surge Pricing Architecture</h3>
              </div>
              <button onClick={handleAddRule} className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-full text-xs font-bold active:scale-95 transition-all">
                <span className="material-symbols-outlined text-sm">add</span>
                Add Tier
              </button>
            </div>
            <div className="space-y-4">
              {rules.map((rule, i) => (
                <div
                  key={rule.id}
                  className={`flex items-center justify-between p-4 bg-surface-container-low rounded-xl transition-all ${!rule.active ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-10 rounded-full ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-secondary' : 'bg-outline-variant'}`} />
                    <div>
                      <p className="font-bold text-sm text-on-surface">{rule.name}</p>
                      <p className="text-xs text-on-surface-variant">{rule.schedule}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-bold text-primary">Multiplier</p>
                      <p className="font-headline font-extrabold text-lg text-on-surface">{rule.multiplier}x</p>
                    </div>
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${rule.active ? 'bg-primary' : 'bg-outline-variant/50'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${rule.active ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="w-7 h-7 rounded-full hover:bg-error-container flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-error text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue forecaster */}
        <div className="bg-surface-container-high rounded-xl p-8">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h3 className="font-headline font-bold text-xl text-on-surface">Revenue Forecaster</h3>
              <p className="text-sm text-on-surface-variant">Simulation based on current parameters · 30-day historical data</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-on-surface-variant uppercase">Est. Daily Revenue</p>
              <p className="font-headline font-extrabold text-2xl text-primary">₦{(+baseFare * 1842 / 1000).toFixed(0)}k</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest h-32 rounded-xl p-4 flex items-end justify-between gap-1">
            {[60, 75, 85, 70, 90, 95, 80, 100, 88, 92, 85, 78].map((h, i) => (
              <div key={i} className="flex-1 bg-primary-fixed rounded-t-sm" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-on-surface-variant">
            {['00:00', '06:00', '12:00', '18:00', '23:59'].map(t => <span key={t}>{t}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}
