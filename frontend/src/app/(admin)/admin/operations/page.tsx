'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth.store'

interface RiderPin {
  riderId: string
  name: string
  lat: number
  lng: number
  status: 'on_trip' | 'idle'
}

interface ActiveEvent {
  id: string
  type: 'surge' | 'low_supply' | 'high_demand' | 'incident'
  zone: string
  message: string
  time: string
}

const DEMO_EVENTS: ActiveEvent[] = [
  { id: '1', type: 'surge', zone: 'Lekki Phase 1', message: '2.1x surge active — 32 requests / 15 riders', time: '2m ago' },
  { id: '2', type: 'low_supply', zone: 'Victoria Island', message: 'Supply deficit: 3 riders, 18 pending trips', time: '4m ago' },
  { id: '3', type: 'high_demand', zone: 'Ikeja GRA', message: 'Peak demand detected — morning commute', time: '6m ago' },
  { id: '4', type: 'incident', zone: 'Oshodi', message: 'Rider #3821 reported traffic incident', time: '9m ago' },
]

function eventIcon(type: ActiveEvent['type']) {
  if (type === 'surge') return 'bolt'
  if (type === 'low_supply') return 'person_off'
  if (type === 'high_demand') return 'trending_up'
  return 'warning'
}

function eventColor(type: ActiveEvent['type']) {
  if (type === 'surge') return 'text-tertiary bg-tertiary/10'
  if (type === 'low_supply') return 'text-error bg-error-container'
  if (type === 'high_demand') return 'text-secondary bg-secondary-container'
  return 'text-on-surface-variant bg-surface-container-high'
}

export default function AdminOperationsPage() {
  const token = useAuthStore((s) => s.token)
  const socketRef = useRef<Socket | null>(null)
  const [riders, setRiders] = useState<RiderPin[]>([])

  useEffect(() => {
    if (!token) return
    const socket = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
    })
    socketRef.current = socket
    socket.on('rider_location', (data: RiderPin) => {
      setRiders((prev) => {
        const idx = prev.findIndex((r) => r.riderId === data.riderId)
        if (idx >= 0) { const next = [...prev]; next[idx] = data; return next }
        return [...prev, data]
      })
    })
    return () => { socket.disconnect() }
  }, [token])

  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">Live Operations</h1>
          <p className="text-xs text-on-surface-variant">42 on trip · 18 idle · {riders.length} GPS tracked</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Live Feed
          </span>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high">
            <span className="material-symbols-outlined text-on-surface-variant">layers</span>
          </button>
        </div>
      </header>

      <div className="flex" style={{ height: 'calc(100vh - 73px)' }}>
        {/* Map */}
        <div className="flex-1 bg-surface-container-low relative flex items-center justify-center">
          <span className="material-symbols-outlined text-[200px] text-primary opacity-5">map</span>
          <p className="absolute text-on-surface-variant text-sm bg-surface-container-lowest/80 px-4 py-2 rounded-full">
            Live rider map · Google Maps API
          </p>

          {/* Surge toast */}
          <div className="absolute top-4 left-4 bg-tertiary text-on-tertiary px-4 py-2 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">bolt</span>
            Surge: Lekki 2.1x · VI 1.6x
          </div>

          {/* Mock rider pins */}
          {[
            { top: '30%', left: '40%', active: true },
            { top: '50%', left: '55%', active: false },
            { top: '65%', left: '35%', active: true },
          ].map((pin, i) => (
            <div key={i} className="absolute" style={{ top: pin.top, left: pin.left }}>
              <div className={`w-7 h-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${pin.active ? 'bg-primary' : 'bg-secondary'}`}>
                <span className="material-symbols-outlined text-white text-xs">electric_moped</span>
              </div>
            </div>
          ))}

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1">
            {['add', 'remove'].map(icon => (
              <button key={icon} className="w-10 h-10 bg-surface-container-lowest rounded-lg shadow-md flex items-center justify-center hover:bg-surface-container-low">
                <span className="material-symbols-outlined text-on-surface">{icon}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Events sidebar */}
        <div className="w-80 border-l border-outline-variant/20 bg-surface flex flex-col">
          <div className="px-4 py-3 border-b border-outline-variant/10">
            <h3 className="font-headline font-bold text-on-surface">Active Events</h3>
            <p className="text-xs text-on-surface-variant">{DEMO_EVENTS.length} events requiring attention</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {DEMO_EVENTS.map(event => (
              <div key={event.id} className="bg-surface-container-low rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${eventColor(event.type)}`}>
                    <span className="material-symbols-outlined text-sm">{eventIcon(event.type)}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface">{event.zone}</p>
                    <p className="text-[10px] text-on-surface-variant">{event.time}</p>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant">{event.message}</p>
                <button className="mt-2 text-[10px] font-bold text-primary hover:underline">Take Action</button>
              </div>
            ))}
          </div>
          <div className="border-t border-outline-variant/10 p-4 grid grid-cols-3 gap-3">
            <div className="bg-surface-container-low rounded-lg p-3 text-center">
              <p className="font-headline font-extrabold text-2xl text-primary">42</p>
              <p className="text-[10px] text-on-surface-variant uppercase">On Trip</p>
            </div>
            <div className="bg-surface-container-low rounded-lg p-3 text-center">
              <p className="font-headline font-extrabold text-2xl text-secondary">18</p>
              <p className="text-[10px] text-on-surface-variant uppercase">Idle</p>
            </div>
            <div className="bg-surface-container-low rounded-lg p-3 text-center">
              <p className="font-headline font-extrabold text-2xl text-tertiary">{riders.length}</p>
              <p className="text-[10px] text-on-surface-variant uppercase">GPS Live</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
