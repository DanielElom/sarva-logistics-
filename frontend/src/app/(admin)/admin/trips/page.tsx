'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

interface Trip {
  id: string
  orderId: string
  customerName: string
  riderName: string
  pickup: string
  dropoff: string
  fare: number
  status: 'COMPLETED' | 'CANCELLED' | 'DISPUTED' | 'IN_PROGRESS'
  date: string
  distance: string
}

const DEMO_TRIPS: Trip[] = [
  { id: '1', orderId: 'FR-20240501', customerName: 'Ngozi Adamu', riderName: 'Emeka Okafor', pickup: '14 Awolowo Road, Ikoyi', dropoff: '3 Admiralty Way, Lekki', fare: 2400, status: 'COMPLETED', date: '2024-05-07 09:12', distance: '6.2km' },
  { id: '2', orderId: 'FR-20240502', customerName: 'Seun Adeola', riderName: 'Fatima Aliyu', pickup: 'Ikeja City Mall', dropoff: 'Surulere, Lagos', fare: 1800, status: 'DISPUTED', date: '2024-05-07 10:45', distance: '8.1km' },
  { id: '3', orderId: 'FR-20240503', customerName: 'Amaka Obi', riderName: '—', pickup: 'V.I. Marina', dropoff: 'Maryland, Lagos', fare: 0, status: 'CANCELLED', date: '2024-05-07 11:02', distance: '—' },
  { id: '4', orderId: 'FR-20240504', customerName: 'Kunle Bakare', riderName: 'Tunde Adeyemi', pickup: 'Ajah, Lagos', dropoff: 'Eti-Osa, Lagos', fare: 3100, status: 'IN_PROGRESS', date: '2024-05-07 11:30', distance: '11.4km' },
]

const STATUS_OPTIONS = ['ALL', 'COMPLETED', 'IN_PROGRESS', 'DISPUTED', 'CANCELLED']

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<Trip[]>(DEMO_TRIPS)
  const [statusF, setStatusF] = useState('ALL')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  function handleExport() {
    const headers = ['Order ID', 'Customer', 'Rider', 'Pickup', 'Dropoff', 'Fare', 'Distance', 'Status', 'Date']
    const rows = filtered.map(t => [t.orderId, t.customerName, t.riderName, t.pickup, t.dropoff, t.fare > 0 ? `₦${t.fare}` : '—', t.distance, t.status, t.date])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'fair-ride-trips.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const fetchTrips = useCallback(async () => {
    try {
      const res = await api.get('/admin/trips')
      setTrips(res.data)
    } catch { /* keep demo */ }
  }, [])

  useEffect(() => { fetchTrips() }, [fetchTrips])

  async function handleReassign(id: string) {
    try { await api.post(`/admin/trips/${id}/reassign`) } catch { /* ignore */ }
  }

  async function handleDispute(id: string) {
    try { await api.post(`/admin/trips/${id}/dispute`) } catch { /* ignore */ }
  }

  const filtered = trips.filter(t => {
    const matchSearch = t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.riderName.toLowerCase().includes(search.toLowerCase()) ||
      t.orderId.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusF === 'ALL' || t.status === statusF
    return matchSearch && matchStatus
  })

  function statusBadge(status: Trip['status']) {
    if (status === 'COMPLETED') return 'bg-secondary-container text-on-secondary-container'
    if (status === 'DISPUTED') return 'bg-tertiary/10 text-tertiary'
    if (status === 'CANCELLED') return 'bg-error-container text-on-error-container'
    return 'bg-primary-fixed text-on-primary-fixed'
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">Trip Management</h1>
          <p className="text-xs text-on-surface-variant">{trips.length} trips · {trips.filter(t => t.status === 'DISPUTED').length} disputed</p>
        </div>
        <button onClick={handleExport} className="px-5 py-2 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl text-sm font-bold shadow-sm">
          Export CSV
        </button>
      </header>

      <div className="p-8 space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-4 gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary"
              placeholder="Search trips…"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-surface-container-low border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-surface-container-low border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={fetchTrips}
            className="bg-primary text-on-primary rounded-xl py-2.5 text-sm font-bold"
          >
            Apply Filters
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatusF(s)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${statusF === s ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              {s} {s === 'DISPUTED' ? `(${trips.filter(t => t.status === 'DISPUTED').length})` : ''}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant/10">
              <tr>
                {['Order ID', 'Customer', 'Rider', 'Pickup → Drop', 'Fare', 'Distance', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filtered.map(trip => (
                <tr key={trip.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-4 py-4 text-xs font-mono text-on-surface-variant">{trip.orderId}</td>
                  <td className="px-4 py-4 text-sm font-medium text-on-surface">{trip.customerName}</td>
                  <td className="px-4 py-4 text-sm text-on-surface-variant">{trip.riderName}</td>
                  <td className="px-4 py-4 max-w-[200px]">
                    <p className="text-xs text-on-surface line-clamp-1">{trip.pickup}</p>
                    <p className="text-xs text-on-surface-variant line-clamp-1">{trip.dropoff}</p>
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-on-surface">
                    {trip.fare > 0 ? `₦${trip.fare.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-4 text-sm text-on-surface-variant">{trip.distance}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadge(trip.status)}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-on-surface-variant whitespace-nowrap">{trip.date}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-xs font-bold text-primary hover:underline">View</button>
                      {trip.status === 'IN_PROGRESS' && (
                        <button onClick={() => handleReassign(trip.id)} className="text-xs font-bold text-secondary hover:underline">Reassign</button>
                      )}
                      {trip.status === 'COMPLETED' && (
                        <button onClick={() => handleDispute(trip.id)} className="text-xs font-bold text-error hover:underline">Dispute</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Live activity widget */}
        <div className="bg-primary text-on-primary rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-xs opacity-70 uppercase tracking-widest mb-1">Live Activity</p>
            <p className="font-headline font-extrabold text-2xl">{trips.filter(t => t.status === 'IN_PROGRESS').length} trips in progress right now</p>
          </div>
          <div className="w-3 h-3 rounded-full bg-primary-fixed animate-ping" />
        </div>
      </div>
    </div>
  )
}
