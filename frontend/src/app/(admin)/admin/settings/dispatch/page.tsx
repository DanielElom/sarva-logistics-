'use client'

import { useState } from 'react'
import api from '@/lib/api'

type SelectionAlgo = 'nearest' | 'highest_rated' | 'earnings_equalizer'

export default function AdminSettingsDispatchPage() {
  const [radius, setRadius] = useState(3.5)
  const [timeout, setTimeout_] = useState(45)
  const [maxDistance, setMaxDistance] = useState(15)
  const [algo, setAlgo] = useState<SelectionAlgo>('nearest')
  const [autoAssign, setAutoAssign] = useState(true)
  const [batchAssign, setBatchAssign] = useState(true)
  const [routeOpt, setRouteOpt] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    try {
      await api.patch('/admin/settings/dispatch', { radius, timeout, maxDistance, algo, autoAssign, batchAssign, routeOpt })
    } catch { /* proceed */ }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const ALGOS: { id: SelectionAlgo; label: string; sub: string }[] = [
    { id: 'nearest', label: 'Nearest Available', sub: 'Prioritize ETA and speed' },
    { id: 'highest_rated', label: 'Highest Rated', sub: 'Focus on service quality' },
    { id: 'earnings_equalizer', label: 'Earnings Equalizer', sub: 'Balance work across fleet' },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">Dispatch Settings</h1>
          <p className="text-xs text-on-surface-variant">Configure matching engine and trip parameters</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm">Discard</button>
          <button
            onClick={handleSave}
            className={`px-6 py-2 font-bold rounded-xl text-sm ${saved ? 'bg-secondary-container text-on-secondary-container' : 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg'}`}
          >
            {saved ? '✓ Applied' : 'Apply Parameters'}
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6 max-w-6xl">
        <div>
          <h2 className="font-headline font-extrabold text-3xl text-primary mb-2">Trips & Dispatch Settings</h2>
          <p className="text-on-surface-variant max-w-2xl">Configure the core rhythmic engine of the delivery ecosystem.</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Matching radius */}
          <div className="col-span-8 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-headline font-bold text-lg text-primary">Matching Radius</h3>
                <p className="text-xs text-on-surface-variant">Determine the active search perimeter for courier availability</p>
              </div>
              <span className="material-symbols-outlined text-primary bg-primary-container/10 p-2 rounded-lg">radar</span>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-primary">Current Radius: {radius} km</span>
                <span className="text-xs text-on-surface-variant">Max: 10 km</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={10}
                step={0.5}
                value={radius}
                onChange={e => setRadius(+e.target.value)}
                className="w-full h-2 bg-surface-container-low rounded-full appearance-none accent-primary cursor-pointer"
              />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-surface-container-low rounded-xl">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Standard Zone</p>
                  <p className="font-headline font-bold text-xl text-primary">{radius} km</p>
                </div>
                <div className="p-4 bg-surface-container-low rounded-xl">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">High Demand Offset</p>
                  <p className="font-headline font-bold text-xl text-primary">+0.5 km</p>
                </div>
              </div>
            </div>
          </div>

          {/* Selection algo */}
          <div className="col-span-4 bg-gradient-to-br from-primary to-primary-container rounded-xl p-6 text-on-primary">
            <h3 className="font-headline font-bold text-lg mb-4">Selection Logic</h3>
            <div className="space-y-3">
              {ALGOS.map(a => (
                <label key={a.id} className="flex items-center gap-4 p-3 rounded-lg border border-on-primary/20 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="radio"
                    name="algo"
                    value={a.id}
                    checked={algo === a.id}
                    onChange={() => setAlgo(a.id)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-bold">{a.label}</p>
                    <p className="text-[10px] opacity-70">{a.sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Assignment mode */}
          <div className="col-span-4 bg-surface-container-high rounded-xl p-6">
            <h3 className="font-headline font-bold text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
              Assignment Mode
            </h3>
            <div className="flex bg-surface-container-low p-1 rounded-xl mb-4">
              <button
                onClick={() => setAutoAssign(true)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${autoAssign ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}
              >Auto-assign</button>
              <button
                onClick={() => setAutoAssign(false)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!autoAssign ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}
              >Manual</button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Batch Assign', val: batchAssign, set: setBatchAssign },
                { label: 'Route Optimization', val: routeOpt, set: setRouteOpt },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-on-surface">{item.label}</span>
                  <button
                    onClick={() => item.set(!item.val)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${item.val ? 'bg-primary' : 'bg-outline-variant/50'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${item.val ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Request parameters */}
          <div className="col-span-8 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <h3 className="font-headline font-bold text-lg text-primary mb-6">Request Constraints</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Request Timeout</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={timeout}
                    onChange={e => setTimeout_(+e.target.value)}
                    className="w-20 bg-surface-container-low border-none rounded-lg text-sm font-bold text-primary focus:ring-primary text-center"
                  />
                  <span className="text-sm text-on-surface-variant">seconds</span>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-2">Courier time to accept trip</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Max Trip Distance</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={maxDistance}
                    onChange={e => setMaxDistance(+e.target.value)}
                    className="w-20 bg-surface-container-low border-none rounded-lg text-sm font-bold text-primary focus:ring-primary text-center"
                  />
                  <span className="text-sm text-on-surface-variant">kilometers</span>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-2">Upper limit for city delivery</p>
              </div>
            </div>
          </div>

          {/* System health */}
          <div className="col-span-12 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10 flex items-center justify-between">
            <div className="flex gap-12">
              {[
                { label: 'Dispatch Reliability', value: '99.8%' },
                { label: 'Avg Acceptance Time', value: '12.4s' },
                { label: 'Pending Requests', value: '0' },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">{stat.label}</p>
                  <p className="font-headline font-extrabold text-2xl text-primary">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <button className="px-6 py-2 bg-surface-container-high text-on-surface font-bold text-sm rounded-xl">Discard</button>
              <button onClick={handleSave} className="px-8 py-2 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-sm rounded-xl shadow-md">
                Apply Parameters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
