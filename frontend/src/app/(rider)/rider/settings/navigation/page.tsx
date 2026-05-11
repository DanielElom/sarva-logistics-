/**
 * @page NavigationSettingsPage
 * @description Rider navigation preferences — map provider and route options.
 * @route /rider/settings/navigation
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'

type NavApp = 'google' | 'waze' | 'apple'
type RoutePreference = 'fastest' | 'no_tolls' | 'no_highways'

const NAV_APPS = [
  {
    id: 'google' as NavApp,
    label: 'Google Maps',
    sub: 'Highly accurate satellite imagery and extensive points of interest. Best for finding precise building entrances and loading bays.',
    icon: 'map',
  },
  {
    id: 'waze' as NavApp,
    label: 'Waze',
    sub: 'Real-time community alerts and traffic avoidance. Ideal for dense urban delivery zones and navigating around road closures.',
    icon: 'near_me',
  },
  {
    id: 'apple' as NavApp,
    label: 'Apple Maps',
    sub: 'Native iOS navigation with offline maps and privacy-first location handling.',
    icon: 'explore',
  },
]

const ROUTE_PREFS = [
  { id: 'fastest' as RoutePreference, label: 'Fastest Route', sub: 'Optimize for shortest travel time' },
  { id: 'no_tolls' as RoutePreference, label: 'Avoid Tolls', sub: 'Skip toll roads and bridges' },
  { id: 'no_highways' as RoutePreference, label: 'Avoid Highways', sub: 'Use surface streets only' },
]

export default function NavigationSettingsPage() {
  const router = useRouter()
  const { isAuthenticated, role } = useAuthStore((s) => ({
    isAuthenticated: s.isAuthenticated,
    role: s.role,
  }))

  const [navApp, setNavApp] = useState<NavApp>('google')
  const [routePref, setRoutePref] = useState<RoutePreference>('fastest')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
    const stored = localStorage.getItem('rider-nav-prefs')
    if (stored) {
      try {
        const p = JSON.parse(stored)
        if (p.navApp) setNavApp(p.navApp)
        if (p.routePref) setRoutePref(p.routePref)
      } catch {}
    }
  }, [isAuthenticated, role, router])

  function handleSave() {
    localStorage.setItem('rider-nav-prefs', JSON.stringify({ navApp, routePref }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <ScreenWrapper>
      <header className="bg-white/80 backdrop-blur-md shadow-sm shadow-emerald-900/5 fixed top-0 z-50 w-full">
        <div className="flex justify-between items-center w-full px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-emerald-900 hover:bg-emerald-50/50 transition-colors p-2 rounded-full active:scale-95"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="font-headline font-bold text-lg tracking-tight text-emerald-900">Navigation Preferences</h1>
          </div>
          <button className="text-emerald-900 hover:bg-emerald-50/50 transition-colors p-2 rounded-full active:scale-95">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </header>

      <main className="flex-1 pt-24 px-6 pb-32 max-w-2xl mx-auto w-full space-y-8">
        <div>
          <h2 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight mb-2">Maps &amp; Routing</h2>
          <p className="font-body text-on-surface-variant text-base">
            Select your preferred navigation tool for all delivery routes. This setting affects how addresses are opened from your task dashboard.
          </p>
        </div>

        {/* Nav app selection */}
        <div className="space-y-4">
          <h3 className="font-headline font-bold text-on-surface px-1">Navigation App</h3>
          {NAV_APPS.map((app) => {
            const active = navApp === app.id
            return (
              <label key={app.id} className="group relative block cursor-pointer">
                <input
                  type="radio"
                  name="nav_app"
                  value={app.id}
                  checked={active}
                  onChange={() => setNavApp(app.id)}
                  className="sr-only"
                />
                <div
                  className={`flex items-start p-6 bg-surface-container-lowest rounded-xl shadow-sm transition-all duration-200 ${
                    active ? 'ring-2 ring-primary' : 'hover:shadow-md'
                  }`}
                >
                  <div className="shrink-0 w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center mr-4">
                    <span className="material-symbols-outlined text-primary text-3xl">{app.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-headline font-bold text-lg text-on-surface">{app.label}</span>
                      <div className={`w-6 h-6 border-2 rounded-full flex items-center justify-center transition-colors ${active ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                        {active && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <p className="font-body text-sm text-on-surface-variant leading-relaxed">{app.sub}</p>
                  </div>
                </div>
              </label>
            )
          })}
        </div>

        {/* Route preference */}
        <div className="space-y-3">
          <h3 className="font-headline font-bold text-on-surface px-1">Route Preference</h3>
          {ROUTE_PREFS.map((pref) => {
            const active = routePref === pref.id
            return (
              <button
                key={pref.id}
                onClick={() => setRoutePref(pref.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                  active ? 'border-primary bg-primary/5' : 'border-outline-variant/30 bg-surface-container-lowest'
                }`}
              >
                <div>
                  <p className={`font-headline font-bold ${active ? 'text-primary' : 'text-on-surface'}`}>{pref.label}</p>
                  <p className="text-xs text-on-surface-variant">{pref.sub}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                  {active && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Info card */}
        <div className="p-5 bg-primary-container/10 rounded-xl flex items-start gap-4">
          <span className="material-symbols-outlined text-primary">info</span>
          <div>
            <p className="font-label text-sm font-semibold text-primary mb-1 uppercase tracking-wider">Note for Couriers</p>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              Waze typically saves 4–6 minutes per route during peak traffic hours in dense urban zones.
            </p>
          </div>
        </div>
      </main>

      {/* Save bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md z-40 shadow-[0_-4px_24px_rgba(0,52,24,0.06)]">
        <button
          onClick={handleSave}
          className={`w-full py-4 font-headline font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-all duration-200 ${
            saved
              ? 'bg-primary-fixed text-on-primary-fixed'
              : 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-primary/20'
          }`}
        >
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>
    </ScreenWrapper>
  )
}
