/**
 * @page SoundSettingsPage
 * @description Rider notification sound preferences for job alerts.
 * @route /rider/settings/sounds
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'

const SOUND_PROFILES = [
  { id: 'emerald', label: 'Emerald Alert', sub: 'High-clarity harmonic chime', icon: 'notifications_active' },
  { id: 'classic', label: 'Classic Courier', sub: 'Traditional delivery pulse', icon: 'electric_moped' },
  { id: 'minimal', label: 'Minimal Ping', sub: 'Soft digital notification', icon: 'vibration' },
  { id: 'velocity', label: 'Velocity Beat', sub: 'Energetic rhythmic alert', icon: 'speed' },
]

const SOUND_TOGGLES = [
  { id: 'newJob', label: 'New Job Alert', sub: 'Sound when a new request arrives' },
  { id: 'accepted', label: 'Job Accepted', sub: 'Confirmation sound' },
  { id: 'navigation', label: 'Navigation Turns', sub: 'Turn-by-turn audio guidance' },
  { id: 'complete', label: 'Delivery Complete', sub: 'Completion chime' },
]

export default function SoundsSettingsPage() {
  const router = useRouter()
  const { isAuthenticated, role } = useAuthStore((s) => ({
    isAuthenticated: s.isAuthenticated,
    role: s.role,
  }))

  const [selectedProfile, setSelectedProfile] = useState('emerald')
  const [volume, setVolume] = useState(85)
  const [haptic, setHaptic] = useState(true)
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    newJob: true, accepted: true, navigation: true, complete: true,
  })

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
    const saved = localStorage.getItem('rider-sounds-prefs')
    if (saved) {
      try {
        const p = JSON.parse(saved)
        if (p.selectedProfile) setSelectedProfile(p.selectedProfile)
        if (p.volume !== undefined) setVolume(p.volume)
        if (p.haptic !== undefined) setHaptic(p.haptic)
        if (p.toggles) setToggles(p.toggles)
      } catch {}
    }
  }, [isAuthenticated, role, router])

  function save(updates: object) {
    const current = { selectedProfile, volume, haptic, toggles, ...updates }
    localStorage.setItem('rider-sounds-prefs', JSON.stringify(current))
  }

  function handleProfileSelect(id: string) {
    setSelectedProfile(id)
    save({ selectedProfile: id })
  }

  function handleVolume(v: number) {
    setVolume(v)
    save({ volume: v })
  }

  function handleHaptic(v: boolean) {
    setHaptic(v)
    save({ haptic: v })
  }

  function handleToggle(id: string, v: boolean) {
    const next = { ...toggles, [id]: v }
    setToggles(next)
    save({ toggles: next })
  }

  return (
    <ScreenWrapper>
      <header className="bg-white/80 backdrop-blur-md text-emerald-900 fixed top-0 z-50 w-full shadow-sm shadow-emerald-900/5">
        <div className="flex justify-between items-center w-full px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="hover:bg-emerald-50/50 transition-colors active:scale-95 duration-200 p-2 rounded-full">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="font-headline font-bold text-lg tracking-tight">Sound Settings</h1>
          </div>
          <span className="font-headline font-extrabold text-emerald-900">Fair-Ride</span>
        </div>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <p className="text-on-surface-variant font-label text-sm uppercase tracking-widest mb-1">Preferences</p>
          <h2 className="text-3xl font-headline font-extrabold text-primary">Incoming Request Sound</h2>
          <div className="mt-3 p-4 rounded-xl bg-surface-container-low border-l-4 border-primary">
            <p className="text-sm text-on-surface-variant leading-relaxed font-body">
              Choose a notification sound that ensures you never miss a delivery request, even in noisy urban environments.
            </p>
          </div>
        </div>

        {/* Volume */}
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">volume_up</span>
              <label className="font-headline font-bold text-on-surface">Alert Volume</label>
            </div>
            <span className="text-primary font-bold">{volume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => handleVolume(Number(e.target.value))}
            className="w-full h-1.5 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between mt-2 text-[10px] uppercase font-label tracking-tighter text-on-surface-variant">
            <span>Silent</span>
            <span>Max Authority</span>
          </div>
        </div>

        {/* Sound profiles */}
        <div className="space-y-3">
          <label className="font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant px-1">
            Available Profiles
          </label>
          {SOUND_PROFILES.map((p) => {
            const active = selectedProfile === p.id
            return (
              <div
                key={p.id}
                onClick={() => handleProfileSelect(p.id)}
                className={`flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer active:scale-[0.98] ${
                  active ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${active ? 'bg-on-primary/20' : 'bg-surface-container-high'}`}>
                    <span className={`material-symbols-outlined ${active ? 'text-on-primary' : 'text-on-surface-variant'}`}>{p.icon}</span>
                  </div>
                  <div>
                    <p className="font-headline font-bold leading-tight">{p.label}</p>
                    <p className={`text-xs ${active ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>{p.sub}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      active ? 'bg-on-primary/10 hover:bg-on-primary/20' : 'bg-surface-container-high hover:bg-primary-fixed'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-sm ${active ? 'text-on-primary' : ''}`}>play_arrow</span>
                  </button>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    active ? 'border-on-primary' : 'border-outline-variant'
                  }`}>
                    {active && <div className="w-3 h-3 bg-on-primary rounded-full" />}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Sound toggles */}
        <div className="space-y-3">
          <label className="font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant px-1">
            Sound Events
          </label>
          {SOUND_TOGGLES.map((t) => (
            <div key={t.id} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-medium text-on-surface font-body">{t.label}</p>
                <p className="text-xs text-on-surface-variant">{t.sub}</p>
              </div>
              <button
                onClick={() => handleToggle(t.id, !toggles[t.id])}
                className={`w-12 h-6 rounded-full relative p-1 transition-colors ${toggles[t.id] ? 'bg-primary' : 'bg-surface-container-high'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${toggles[t.id] ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Haptic */}
        <div className="bg-surface-container-low p-5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant">sensors</span>
            </div>
            <div>
              <p className="font-bold text-on-surface">Haptic Feedback</p>
              <p className="text-xs text-on-surface-variant">Vibrate on incoming request</p>
            </div>
          </div>
          <button
            onClick={() => handleHaptic(!haptic)}
            className={`w-12 h-6 rounded-full relative p-1 transition-colors ${haptic ? 'bg-primary' : 'bg-surface-container-high'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${haptic ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
      </main>
    </ScreenWrapper>
  )
}
