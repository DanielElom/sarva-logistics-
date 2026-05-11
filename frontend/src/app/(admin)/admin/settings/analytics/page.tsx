/**
 * @page AdminAnalyticsSettingsPage
 * @description Analytics integration settings — Google Analytics, Mixpanel, Segment.
 * @route /admin/settings/analytics
 */
'use client'

import { useState } from 'react'
import api from '@/lib/api'

const METRICS = [
  { id: 'route_efficiency', label: 'Route Efficiency', sub: 'Total distance vs. straight-line per delivery', enabled: true, tag: 'Dispatch Logic Engine' },
  { id: 'mean_velocity', label: 'Mean Velocity', sub: 'Average transit speed excluding idle times', enabled: true, tag: 'Real-time GPS' },
  { id: 'sentiment', label: 'Sentiment Analysis', sub: 'NLP processing of customer feedback', enabled: false, tag: 'LEGACY - PAUSED' },
  { id: 'carbon_offset', label: 'Carbon Offset', sub: 'Estimated CO₂ savings for bike courier segments', enabled: true, tag: 'Environmental Report' },
  { id: 'parcel_integrity', label: 'Parcel Integrity', sub: 'Reports of package damage at point of delivery', enabled: true, tag: 'QA Verification' },
]

const REFRESH_OPTIONS = ['15s', '30s', '60s']

export default function AdminSettingsAnalyticsPage() {
  const [refreshRate, setRefreshRate] = useState('30s')
  const [exportFormat, setExportFormat] = useState<'CSV' | 'PDF' | 'JSON'>('CSV')
  const [autoEmail, setAutoEmail] = useState(true)
  const [metrics, setMetrics] = useState(METRICS)
  const [saved, setSaved] = useState(false)

  function toggleMetric(id: string) {
    setMetrics(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m))
  }

  async function handleSave() {
    try {
      await api.patch('/admin/settings/analytics', { refreshRate, exportFormat, autoEmail, metrics })
    } catch { /* proceed */ }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">Analytics & Reports</h1>
          <p className="text-xs text-on-surface-variant">Data tracking, reporting intervals, and export preferences</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm">Reset Defaults</button>
          <button
            onClick={handleSave}
            className={`px-6 py-2 font-bold rounded-xl text-sm ${saved ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary text-on-primary shadow-lg'}`}
          >
            {saved ? '✓ Saved' : 'Save Configurations'}
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6 max-w-6xl">
        <div className="grid grid-cols-12 gap-6">
          {/* Refresh interval */}
          <div className="col-span-4 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                <span className="material-symbols-outlined">update</span>
              </div>
              <span className="text-xs font-bold text-secondary bg-secondary-fixed px-2 py-1 rounded">LIVE ENGINE</span>
            </div>
            <h3 className="font-headline font-bold text-lg mb-2 text-on-surface">Data Refresh Interval</h3>
            <p className="text-sm text-on-surface-variant mb-6">How frequently the system pulls new GPS data from couriers.</p>
            <div className="grid grid-cols-3 gap-2">
              {REFRESH_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setRefreshRate(opt)}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${refreshRate === opt ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-on-primary'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Export settings */}
          <div className="col-span-8 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-2 bg-tertiary/10 rounded-lg text-tertiary">
                <span className="material-symbols-outlined">ios_share</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-lg text-on-surface">Export Preferences</h3>
                <p className="text-sm text-on-surface-variant">Automated delivery of system reports</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Default File Format</label>
                  <div className="flex gap-3">
                    {(['CSV', 'PDF', 'JSON'] as const).map(fmt => (
                      <label key={fmt} className="flex-1 cursor-pointer">
                        <input type="radio" name="format" value={fmt} checked={exportFormat === fmt} onChange={() => setExportFormat(fmt)} className="sr-only" />
                        <div className={`text-center p-3 rounded-xl border-2 transition-all ${exportFormat === fmt ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant/30 bg-surface-container-low text-on-surface'}`}>
                          <span className="text-sm font-bold">{fmt}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-sm">mark_email_unread</span>
                    <span className="text-sm font-medium text-on-surface">Auto-email Weekly Summary</span>
                  </div>
                  <button
                    onClick={() => setAutoEmail(!autoEmail)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${autoEmail ? 'bg-primary' : 'bg-surface-container-high'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${autoEmail ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
              <div className="bg-surface-container-low p-5 rounded-xl flex flex-col justify-center items-center text-center">
                <h4 className="text-sm font-bold text-primary mb-1">Last Export: 2 hours ago</h4>
                <p className="text-xs text-on-surface-variant">Auto-generated &ldquo;weekly_logistics_v4.pdf&rdquo;</p>
                <button className="mt-4 text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                  <span className="material-symbols-outlined text-sm">history</span>
                  View History
                </button>
              </div>
            </div>
          </div>

          {/* Metrics tracking */}
          <div className="col-span-12 bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-headline font-bold text-xl text-primary">Metrics Tracking Matrix</h3>
                <p className="text-on-surface-variant text-sm">Select which data points should be tracked in the primary ledger.</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-primary-fixed text-on-primary-fixed text-xs font-bold rounded-full">
                  ACTIVE: {metrics.filter(m => m.enabled).length} METRICS
                </span>
                <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant text-xs font-bold rounded-full">
                  PAUSED: {metrics.filter(m => !m.enabled).length}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {metrics.map(metric => (
                <div key={metric.id} className={`p-5 rounded-xl border border-outline-variant/10 bg-surface flex flex-col gap-4 ${!metric.enabled ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${metric.enabled ? 'bg-secondary-container text-secondary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined text-sm">analytics</span>
                      </div>
                      <span className="font-bold text-sm text-on-surface">{metric.label}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={metric.enabled}
                      onChange={() => toggleMetric(metric.id)}
                      className="w-5 h-5 text-primary border-outline-variant rounded focus:ring-primary"
                    />
                  </div>
                  <p className="text-xs text-on-surface-variant">{metric.sub}</p>
                  <div className="pt-2 border-t border-outline-variant/10">
                    <span className={`text-[10px] font-bold uppercase ${metric.enabled ? 'text-on-surface-variant/60 italic' : 'text-error font-bold'}`}>
                      {metric.tag}
                    </span>
                  </div>
                </div>
              ))}
              <button className="p-5 rounded-xl border-2 border-dashed border-outline-variant/40 bg-transparent flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low hover:border-primary/20 transition-all group">
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <span className="material-symbols-outlined">add</span>
                </div>
                <span className="font-bold text-sm text-on-surface-variant group-hover:text-primary transition-colors">Add Custom Metric</span>
              </button>
            </div>
          </div>

          {/* Config log */}
          <div className="col-span-12 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline font-bold text-on-surface">Recent Configuration History</h3>
              <button className="text-xs font-bold text-secondary uppercase tracking-widest hover:opacity-70">Full Audit Log</button>
            </div>
            <table className="w-full text-left">
              <thead className="border-b border-outline-variant/10">
                <tr>
                  {['Admin', 'Action', 'Section', 'Timestamp', 'Status'].map(h => (
                    <th key={h} className="pb-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {[
                  { admin: 'J. Thompson', action: 'Enabled "Carbon Offset" Metric', section: 'Tracking Matrix', ts: 'Today, 09:42 AM', status: 'SUCCESS' },
                  { admin: 'M. Rodriguez', action: 'Reduced Refresh Interval (45s → 30s)', section: 'System Engine', ts: 'Yesterday, 11:15 PM', status: 'SUCCESS' },
                  { admin: 'System', action: 'Paused "Sentiment Analysis"', section: 'API Thresholds', ts: 'Aug 14, 2023', status: 'AUTO-THROTTLED' },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="py-4 text-sm font-medium text-on-surface">{row.admin}</td>
                    <td className="py-4 text-sm text-on-surface-variant">{row.action}</td>
                    <td className="py-4 text-sm text-on-surface-variant">{row.section}</td>
                    <td className="py-4 text-sm text-on-surface-variant">{row.ts}</td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.status === 'SUCCESS' ? 'bg-secondary/10 text-secondary' : 'bg-tertiary/10 text-tertiary'}`}>
                        {row.status}
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
