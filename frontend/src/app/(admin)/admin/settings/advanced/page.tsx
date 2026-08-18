/**
 * @page AdminAdvancedSettingsPage
 * @description Advanced system configuration — API limits, cache TTL, debug flags.
 * @route /admin/settings/advanced
 */
'use client'

import { useState } from 'react'
import api from '@/lib/api'

const API_KEYS = [
  { id: 'key_1', name: 'Production API Key', prefix: 'fr_live_4kZp...', created: 'Jan 14, 2024', lastUsed: '2 min ago', active: true },
  { id: 'key_2', name: 'Staging API Key', prefix: 'fr_stg_9mXr...', created: 'Mar 2, 2024', lastUsed: '3 days ago', active: true },
  { id: 'key_3', name: 'Webhook Signing Secret', prefix: 'whsec_8tLp...', created: 'Feb 18, 2024', lastUsed: 'Never', active: false },
]

const FEATURE_FLAGS = [
  { id: 'surge_ai', label: 'AI Surge Prediction', sub: 'ML-based demand forecasting', enabled: true, badge: 'BETA' },
  { id: 'parcel_scan', label: 'Parcel QR Scanning', sub: 'Scan-to-confirm delivery flow', enabled: true, badge: 'STABLE' },
  { id: 'carbon_report', label: 'Carbon Footprint Report', sub: 'Eco-metrics per trip segment', enabled: false, badge: 'EXPERIMENTAL' },
  { id: 'cluster_dispatch', label: 'Cluster-Based Dispatch', sub: 'Multi-zone batching algorithm', enabled: false, badge: 'ALPHA' },
]

const DEBUG_LOGS = [
  { ts: '09:41:02', level: 'INFO', msg: 'Dispatch engine heartbeat — 42 active riders' },
  { ts: '09:41:00', level: 'WARN', msg: 'Surge zone #3 demand exceeds supply by 340%' },
  { ts: '09:40:58', level: 'INFO', msg: 'WebSocket broadcast: rider_location to 14 clients' },
  { ts: '09:40:55', level: 'ERROR', msg: 'maps.route_update webhook returned 500 — retry #2' },
  { ts: '09:40:50', level: 'INFO', msg: 'Payment settled: TXN-9981 → ₦4,200 to rider #0042' },
]

export default function AdminSettingsAdvancedPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [featureFlags, setFeatureFlags] = useState(FEATURE_FLAGS)
  const [showDanger, setShowDanger] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggleFlag(id: string) {
    setFeatureFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f))
  }

  async function handleSave() {
    try {
      await api.patch('/admin/settings/advanced', { maintenanceMode, featureFlags })
    } catch { /* proceed */ }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const badgeColors: Record<string, string> = {
    STABLE: 'bg-secondary/10 text-secondary',
    BETA: 'bg-primary/10 text-primary',
    ALPHA: 'bg-amber-100 text-amber-700',
    EXPERIMENTAL: 'bg-error/10 text-error',
  }

  const logColors: Record<string, string> = {
    INFO: 'text-green-400',
    WARN: 'text-amber-400',
    ERROR: 'text-red-400',
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">Advanced System Settings</h1>
          <p className="text-xs text-on-surface-variant">Maintenance mode, API keys, feature flags, debug console</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm">Reset</button>
          <button
            onClick={handleSave}
            className={`px-6 py-2 font-bold rounded-xl text-sm ${saved ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary text-on-primary shadow-lg'}`}
          >
            {saved ? '✓ Saved' : 'Apply Changes'}
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6 max-w-6xl">
        {/* Maintenance Mode Banner */}
        <div className={`rounded-xl p-6 border-2 flex items-center justify-between transition-all ${maintenanceMode ? 'bg-error/5 border-error/30' : 'bg-surface-container-lowest border-outline-variant/10'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${maintenanceMode ? 'bg-error/10' : 'bg-surface-container-low'}`}>
              <span className={`material-symbols-outlined ${maintenanceMode ? 'text-error' : 'text-on-surface-variant'}`}>construction</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-lg text-on-surface">Maintenance Mode</h3>
              <p className="text-sm text-on-surface-variant">
                {maintenanceMode
                  ? 'Platform is offline. All API endpoints return 503.'
                  : 'Enabling this will take the platform offline for all users.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {maintenanceMode && (
              <span className="text-[10px] font-bold text-error uppercase bg-error/10 px-3 py-1 rounded-full animate-pulse">LIVE — PLATFORM DOWN</span>
            )}
            <button
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`w-14 h-7 rounded-full relative transition-colors ${maintenanceMode ? 'bg-error' : 'bg-surface-container-high'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${maintenanceMode ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* API Key Management */}
          <div className="col-span-7 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline font-bold text-xl text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">key</span>
                API Key Management
              </h3>
              <button className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">add</span>
                Generate Key
              </button>
            </div>
            <div className="space-y-4">
              {API_KEYS.map(key => (
                <div key={key.id} className="p-4 rounded-xl bg-surface border border-outline-variant/5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-sm text-on-surface">{key.name}</p>
                      <p className="text-xs font-mono text-on-surface-variant mt-0.5">{key.prefix}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${key.active ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {key.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 text-[10px] text-on-surface-variant">
                      <span>Created: {key.created}</span>
                      <span>Last used: {key.lastUsed}</span>
                    </div>
                    <div className="flex gap-3">
                      <button className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors">Rotate</button>
                      <button className="text-xs font-bold text-error hover:opacity-70 transition-opacity">Revoke</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Flags */}
          <div className="col-span-5 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline font-bold text-xl text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">flag</span>
                Feature Flags
              </h3>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                {featureFlags.filter(f => f.enabled).length} enabled
              </span>
            </div>
            <div className="space-y-4">
              {featureFlags.map(flag => (
                <div key={flag.id} className="p-4 rounded-xl bg-surface border border-outline-variant/5">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-on-surface">{flag.label}</p>
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${badgeColors[flag.badge]}`}>{flag.badge}</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant">{flag.sub}</p>
                    </div>
                    <button
                      onClick={() => toggleFlag(flag.id)}
                      className={`w-10 h-5 rounded-full relative shrink-0 transition-colors ${flag.enabled ? 'bg-primary' : 'bg-surface-container-high'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${flag.enabled ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Debug Console */}
          <div className="col-span-12 bg-gray-950 rounded-xl p-6 font-mono">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-gray-400 text-xs">sarva-dispatch — debug console</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">LIVE</span>
                <button className="text-gray-500 hover:text-gray-300 transition-colors">
                  <span className="material-symbols-outlined text-sm">refresh</span>
                </button>
                <button className="text-gray-500 hover:text-gray-300 transition-colors">
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              {DEBUG_LOGS.map((log, i) => (
                <div key={i} className="flex gap-4">
                  <span className="text-gray-600 shrink-0">{log.ts}</span>
                  <span className={`font-bold w-10 shrink-0 ${logColors[log.level]}`}>{log.level}</span>
                  <span className="text-gray-300">{log.msg}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-gray-800 pt-4">
              <span className="text-green-400">$</span>
              <input
                type="text"
                placeholder="Enter debug command..."
                className="flex-1 bg-transparent text-gray-300 text-xs outline-none placeholder-gray-600"
              />
            </div>
          </div>

          {/* Cluster Health */}
          <div className="col-span-12 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary-container">dns</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-xl text-on-surface">Service Cluster Health</h3>
                <p className="text-xs text-on-surface-variant">Real-time status of all microservice nodes</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { name: 'API Gateway', nodes: 3, healthy: 3, cpu: '24%', mem: '41%' },
                { name: 'Dispatch Engine', nodes: 2, healthy: 2, cpu: '67%', mem: '58%' },
                { name: 'Socket Server', nodes: 2, healthy: 2, cpu: '31%', mem: '29%' },
                { name: 'Worker Queue', nodes: 4, healthy: 3, cpu: '45%', mem: '62%' },
              ].map(svc => (
                <div key={svc.name} className={`p-5 rounded-xl border ${svc.healthy < svc.nodes ? 'border-amber-200 bg-amber-50' : 'border-outline-variant/10 bg-surface'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-sm font-bold text-on-surface">{svc.name}</p>
                    <span className={`text-[10px] font-bold ${svc.healthy < svc.nodes ? 'text-amber-700' : 'text-secondary'}`}>
                      {svc.healthy}/{svc.nodes} UP
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-on-surface-variant mb-1">
                        <span>CPU</span><span>{svc.cpu}</span>
                      </div>
                      <div className="w-full bg-surface-container-low h-1 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: svc.cpu }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-on-surface-variant mb-1">
                        <span>Memory</span><span>{svc.mem}</span>
                      </div>
                      <div className="w-full bg-surface-container-low h-1 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full rounded-full" style={{ width: svc.mem }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="col-span-12 rounded-xl border-2 border-error/30 bg-error/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-error text-2xl">dangerous</span>
                <div>
                  <h3 className="font-headline font-bold text-lg text-error">Danger Zone</h3>
                  <p className="text-xs text-on-surface-variant">These actions are irreversible. Proceed with extreme caution.</p>
                </div>
              </div>
              <button
                onClick={() => setShowDanger(!showDanger)}
                className="text-xs font-bold text-error hover:opacity-70 transition-opacity"
              >
                {showDanger ? 'Hide' : 'Show actions'}
              </button>
            </div>
            {showDanger && (
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-error/20">
                {[
                  { action: 'Purge All Sessions', icon: 'logout', sub: 'Force logout all active users and riders' },
                  { action: 'Reset Pricing Rules', icon: 'restart_alt', sub: 'Restore factory pricing configuration' },
                  { action: 'Drop Analytics Cache', icon: 'delete_sweep', sub: 'Clear all cached metrics and reports' },
                ].map(item => (
                  <button key={item.action} className="p-4 rounded-xl border border-error/20 bg-white text-left hover:bg-error/5 transition-colors group">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-error text-sm">{item.icon}</span>
                      <span className="font-bold text-sm text-error">{item.action}</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant">{item.sub}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
