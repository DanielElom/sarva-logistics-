'use client'

import { useState } from 'react'
import api from '@/lib/api'

const DOCS = [
  { id: 'nat_id', label: "National ID / Driver's License", required: true },
  { id: 'vehicle_reg', label: 'Vehicle Registration Certificate', required: true },
  { id: 'insurance', label: 'Third-Party Insurance Policy', required: true },
  { id: 'background', label: 'Background Check Clearance', required: true },
  { id: 'medical', label: 'Medical Fitness Certificate', required: false },
  { id: 'photo', label: 'Profile Photo (Clear, recent)', required: true },
]

const FRAUD_FLAGS = [
  { id: 'ghost_trip', label: 'Ghost Trip Detection', sub: 'Flag rides with no GPS movement', enabled: true },
  { id: 'duplicate_acct', label: 'Duplicate Account Detection', sub: 'Cross-reference phone & BVN', enabled: true },
  { id: 'location_spoof', label: 'GPS Spoofing Alerts', sub: 'Detect mock location apps', enabled: true },
  { id: 'rapid_cancel', label: 'Rapid Cancellation Pattern', sub: 'Auto-flag after 5 cancels/hr', enabled: false },
]

const COURIER_STANDARDS = [
  { category: 'Punctuality', metric: 'On-time Arrival Rate', target: '>= 92%', current: '94.3%', ok: true },
  { category: 'Quality', metric: 'Average Rating', target: '>= 4.2 / 5', current: '4.6', ok: true },
  { category: 'Compliance', metric: 'Document Expiry Alerts', target: '30-day rolling', current: 'Active', ok: true },
  { category: 'Retention', metric: 'Trips Before Review', target: '< 10 trips', current: '7.2 avg', ok: true },
  { category: 'Safety', metric: 'Incident Reports', target: '0 per quarter', current: '2 open', ok: false },
]

export default function AdminSettingsUsersPage() {
  const [docs, setDocs] = useState(DOCS)
  const [minRating, setMinRating] = useState(4.2)
  const [maxCancelRate, setMaxCancelRate] = useState(15)
  const [otpEnabled, setOtpEnabled] = useState(true)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [fraudFlags, setFraudFlags] = useState(FRAUD_FLAGS)
  const [saved, setSaved] = useState(false)

  function toggleDoc(id: string) {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, required: !d.required } : d))
  }

  function toggleFraud(id: string) {
    setFraudFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f))
  }

  async function handleSave() {
    try {
      await api.patch('/admin/settings/users', { docs, minRating, maxCancelRate, otpEnabled, biometricEnabled, fraudFlags })
    } catch { /* proceed */ }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">User & Rider Settings</h1>
          <p className="text-xs text-on-surface-variant">Onboarding requirements, verification protocols, fraud detection</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm">Reset</button>
          <button
            onClick={handleSave}
            className={`px-6 py-2 font-bold rounded-xl text-sm ${saved ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary text-on-primary shadow-lg'}`}
          >
            {saved ? '✓ Saved' : 'Save Settings'}
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6 max-w-6xl">
        <div className="grid grid-cols-12 gap-6">
          {/* Rider Requirements */}
          <div className="col-span-8 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-secondary-container">assignment</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-xl text-on-surface">Rider Onboarding Requirements</h3>
                <p className="text-xs text-on-surface-variant">Documents & credentials required to activate a courier account</p>
              </div>
            </div>
            <div className="space-y-3">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg bg-surface hover:bg-surface-container-low transition-colors border border-outline-variant/5">
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-sm ${doc.required ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                      {doc.required ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span className="text-sm font-medium text-on-surface">{doc.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${doc.required ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {doc.required ? 'Required' : 'Optional'}
                    </span>
                    <button
                      onClick={() => toggleDoc(doc.id)}
                      className="text-xs text-on-surface-variant hover:text-primary transition-colors font-bold"
                    >
                      Toggle
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6 pt-6 border-t border-outline-variant/10">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Minimum Rating Threshold</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={3.0}
                    max={5.0}
                    step={0.1}
                    value={minRating}
                    onChange={e => setMinRating(+e.target.value)}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-primary font-bold font-mono w-10 text-right">{minRating.toFixed(1)}</span>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1">Riders below this rating are flagged for review</p>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Max Cancellation Rate (%)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={5}
                    max={40}
                    step={1}
                    value={maxCancelRate}
                    onChange={e => setMaxCancelRate(+e.target.value)}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-primary font-bold font-mono w-10 text-right">{maxCancelRate}%</span>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1">Auto-suspend if exceeded in 7-day rolling window</p>
              </div>
            </div>
          </div>

          {/* OTP & Verification */}
          <div className="col-span-4 space-y-6">
            <div className="bg-primary rounded-xl p-6 text-on-primary">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined">verified_user</span>
                <h3 className="font-headline font-bold">OTP & Verification</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-white/10 p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">OTP Verification</p>
                    <p className="text-[10px] opacity-70">Required at login and trip start</p>
                  </div>
                  <button
                    onClick={() => setOtpEnabled(!otpEnabled)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${otpEnabled ? 'bg-primary-fixed' : 'bg-white/20'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${otpEnabled ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                <div className="bg-white/10 p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">Biometric Auth</p>
                    <p className="text-[10px] opacity-70">Face ID / fingerprint unlock</p>
                  </div>
                  <button
                    onClick={() => setBiometricEnabled(!biometricEnabled)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${biometricEnabled ? 'bg-primary-fixed' : 'bg-white/20'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${biometricEnabled ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="opacity-70">OTP Delivery</span>
                  <span className="font-bold">SMS + Email</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="opacity-70">Expiry Window</span>
                  <span className="font-bold">10 minutes</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="opacity-70">Max Attempts</span>
                  <span className="font-bold">3 tries</span>
                </div>
              </div>
            </div>

            {/* Fraud Detection */}
            <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
              <h3 className="font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-lg">gpp_bad</span>
                Fraud Detection
              </h3>
              <div className="space-y-4">
                {fraudFlags.map(flag => (
                  <div key={flag.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-on-surface">{flag.label}</p>
                      <p className="text-[10px] text-on-surface-variant">{flag.sub}</p>
                    </div>
                    <button
                      onClick={() => toggleFraud(flag.id)}
                      className={`mt-0.5 w-10 h-5 rounded-full relative shrink-0 transition-colors ${flag.enabled ? 'bg-primary' : 'bg-surface-container-high'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${flag.enabled ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Courier Standards */}
          <div className="col-span-12 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-headline font-bold text-xl text-primary">Courier Performance Standards</h3>
                <p className="text-sm text-on-surface-variant">Live benchmarks that determine fleet eligibility and active status</p>
              </div>
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase">4 / 5 On Target</span>
            </div>
            <table className="w-full text-left">
              <thead className="border-b border-outline-variant/10">
                <tr>
                  {['Category', 'Metric', 'Target', 'Current Value', 'Status'].map(h => (
                    <th key={h} className="pb-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {COURIER_STANDARDS.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">{row.category}</td>
                    <td className="py-4 text-sm font-medium text-on-surface">{row.metric}</td>
                    <td className="py-4 text-sm font-mono text-on-surface-variant">{row.target}</td>
                    <td className="py-4 text-sm font-bold text-on-surface">{row.current}</td>
                    <td className="py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded-full ${row.ok ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.ok ? 'bg-secondary' : 'bg-error animate-pulse'}`} />
                        {row.ok ? 'On Target' : 'Action Needed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
