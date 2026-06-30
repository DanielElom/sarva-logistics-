/**
 * @page AdminDashboardPage
 * @description Admin overview — KPIs: trips today, active riders, revenue, disputes.
 * @route /admin/dashboard
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

interface DashboardStats {
  totalTrips: number
  activeRiders: number
  revenue: number
  cancelRate: number
  avgWait: number
  surgeActive: boolean
}

interface Alert {
  id: string
  type: string
  message: string
  severity: 'high' | 'medium' | 'low'
  time: string
}

const DEMO_STATS: DashboardStats = {
  totalTrips: 1842,
  activeRiders: 42,
  revenue: 2400000,
  cancelRate: 4.2,
  avgWait: 3.8,
  surgeActive: true,
}

const DEMO_ALERTS: Alert[] = [
  { id: '1', type: 'High Cancellation', message: 'Zone B: 18% cancellation in last 30 min', severity: 'high', time: '2m ago' },
  { id: '2', type: 'Low Supply', message: 'Victoria Island: Only 3 riders available', severity: 'high', time: '5m ago' },
  { id: '3', type: 'Surge Active', message: 'Lekki Phase 1: 2.1x surge engaged', severity: 'medium', time: '8m ago' },
  { id: '4', type: 'Rider Offline', message: 'Rider #4821 went offline mid-trip', severity: 'medium', time: '12m ago' },
]

const DEMAND_DATA = [65, 40, 80, 55, 90, 72, 48, 85, 60, 95, 70, 45]
const SUPPLY_DATA = [50, 35, 60, 42, 75, 58, 40, 68, 55, 80, 62, 38]
const HOURS = ['7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm']

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(DEMO_STATS)
  const [alerts] = useState<Alert[]>(DEMO_ALERTS)

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/stats')
      setStats(res.data)
    } catch {
      // keep demo data
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const maxBar = Math.max(...DEMAND_DATA, ...SUPPLY_DATA)

  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary tracking-tight">Dashboard</h1>
          <p className="text-xs text-on-surface-variant">Real-time platform overview · Auto-refreshes every 30s</p>
        </div>
        <div className="flex items-center gap-3">
          {stats.surgeActive && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-tertiary/10 text-tertiary text-xs font-bold rounded-full">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              Surge Active
            </span>
          )}
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors relative">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
          </button>
        </div>
      </header>

      <div className="p-8 space-y-8">
        {/* KPI bento */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-primary text-on-primary rounded-xl p-6 col-span-1 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-10">
              <span className="material-symbols-outlined text-[120px]">two_wheeler</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Total Trips Today</p>
            <p className="font-headline font-extrabold text-4xl">{stats.totalTrips.toLocaleString()}</p>
            <p className="text-xs opacity-60 mt-2">+12% vs yesterday</p>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Active Riders</p>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              <p className="font-headline font-extrabold text-4xl text-primary">{stats.activeRiders}</p>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">18 idle · 24 on trip</p>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Revenue (Today)</p>
            <p className="font-headline font-extrabold text-4xl text-on-surface">
              ₦{(stats.revenue / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-on-surface-variant mt-2">Commission: ₦{((stats.revenue * 0.15) / 1000).toFixed(0)}k</p>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Cancel Rate</p>
            <p className={`font-headline font-extrabold text-3xl ${stats.cancelRate > 8 ? 'text-error' : 'text-on-surface'}`}>
              {stats.cancelRate}%
            </p>
            <p className="text-xs text-on-surface-variant mt-1">Target: &lt;8%</p>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Avg. Wait Time</p>
            <p className="font-headline font-extrabold text-3xl text-on-surface">{stats.avgWait} min</p>
            <p className="text-xs text-on-surface-variant mt-1">-0.4 min vs last hr</p>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Surge Zones</p>
            <p className="font-headline font-extrabold text-3xl text-tertiary">3</p>
            <p className="text-xs text-on-surface-variant mt-1">Lekki · VI · Ikeja</p>
          </div>
        </div>

        {/* Chart + Alerts */}
        <div className="grid grid-cols-12 gap-6">
          {/* Demand vs Supply Chart */}
          <div className="col-span-7 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-headline font-bold text-lg text-on-surface">Demand vs Supply</h3>
                <p className="text-xs text-on-surface-variant">Trip requests vs available riders (last 12 hours)</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 bg-primary rounded-full inline-block" />Demand</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 bg-secondary-container rounded-full inline-block" />Supply</span>
              </div>
            </div>
            <div className="flex items-end gap-2 h-40">
              {HOURS.map((h, i) => (
                <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex items-end gap-0.5 h-32">
                    <div
                      className="flex-1 bg-primary rounded-t-sm opacity-80"
                      style={{ height: `${(DEMAND_DATA[i] / maxBar) * 100}%` }}
                    />
                    <div
                      className="flex-1 bg-secondary-container rounded-t-sm"
                      style={{ height: `${(SUPPLY_DATA[i] / maxBar) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-on-surface-variant">{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="col-span-5 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline font-bold text-lg text-on-surface">Priority Alerts</h3>
              <span className="px-2 py-0.5 bg-error/10 text-error text-xs font-bold rounded-full">
                {alerts.filter(a => a.severity === 'high').length} HIGH
              </span>
            </div>
            <div className="space-y-3">
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    alert.severity === 'high' ? 'bg-error' : 'bg-tertiary'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-on-surface">{alert.type}</p>
                    <p className="text-xs text-on-surface-variant line-clamp-1">{alert.message}</p>
                  </div>
                  <span className="text-[10px] text-on-surface-variant shrink-0">{alert.time}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full py-2 text-xs font-bold text-primary hover:underline">
              View All Alerts
            </button>
          </div>
        </div>

        {/* Map placeholder */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
            <h3 className="font-headline font-bold text-on-surface">Demand Hotspots</h3>
            <span className="text-xs text-on-surface-variant">Live · Lagos</span>
          </div>
          <div className="h-48 bg-surface-container-low flex items-center justify-center relative">
            <span className="material-symbols-outlined text-[80px] text-primary opacity-10">map</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-on-surface-variant text-sm">Map integration · Google Maps API</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
