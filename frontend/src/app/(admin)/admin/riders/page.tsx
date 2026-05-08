'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

interface Rider {
  id: string
  name: string
  phone: string
  rating: number
  trips: number
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED'
  docStatus: 'APPROVED' | 'PENDING' | 'REJECTED'
  joinedAt: string
}

const DEMO_RIDERS: Rider[] = [
  { id: '1', name: 'Emeka Okafor', phone: '+234 803 001 2345', rating: 4.8, trips: 342, status: 'ACTIVE', docStatus: 'APPROVED', joinedAt: '2024-01-15' },
  { id: '2', name: 'Fatima Aliyu', phone: '+234 806 003 4567', rating: 4.6, trips: 218, status: 'ACTIVE', docStatus: 'APPROVED', joinedAt: '2024-02-20' },
  { id: '3', name: 'Chukwuemeka Eze', phone: '+234 808 005 6789', rating: 4.2, trips: 91, status: 'PENDING', docStatus: 'PENDING', joinedAt: '2024-05-01' },
  { id: '4', name: 'Aisha Bello', phone: '+234 815 007 8901', rating: 3.9, trips: 54, status: 'SUSPENDED', docStatus: 'APPROVED', joinedAt: '2024-03-10' },
  { id: '5', name: 'Tunde Adeyemi', phone: '+234 817 009 0123', rating: 4.9, trips: 512, status: 'ACTIVE', docStatus: 'APPROVED', joinedAt: '2023-11-08' },
]

const STATUS_FILTER = ['ALL', 'ACTIVE', 'PENDING', 'SUSPENDED']
const DOC_FILTER = ['ALL', 'APPROVED', 'PENDING', 'REJECTED']

export default function AdminRidersPage() {
  const [riders, setRiders] = useState<Rider[]>(DEMO_RIDERS)
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('ALL')
  const [docF, setDocF] = useState('ALL')
  const [hovered, setHovered] = useState<string | null>(null)

  const fetchRiders = useCallback(async () => {
    try {
      const res = await api.get('/admin/riders')
      setRiders(res.data)
    } catch { /* keep demo */ }
  }, [])

  useEffect(() => { fetchRiders() }, [fetchRiders])

  async function handleApprove(id: string) {
    try {
      await api.patch(`/admin/riders/${id}/approve`)
      setRiders(prev => prev.map(r => r.id === id ? { ...r, status: 'ACTIVE' as const, docStatus: 'APPROVED' as const } : r))
    } catch { /* ignore */ }
  }

  async function handleSuspend(id: string) {
    try {
      await api.patch(`/admin/riders/${id}/suspend`)
      setRiders(prev => prev.map(r => r.id === id ? { ...r, status: 'SUSPENDED' as const } : r))
    } catch { /* ignore */ }
  }

  const filtered = riders.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.phone.includes(search)
    const matchStatus = statusF === 'ALL' || r.status === statusF
    const matchDoc = docF === 'ALL' || r.docStatus === docF
    return matchSearch && matchStatus && matchDoc
  })

  function handleExport() {
    const headers = ['Name', 'Phone', 'Rating', 'Trips', 'Status', 'Docs', 'Joined']
    const rows = filtered.map(r => [r.name, r.phone, r.rating, r.trips, r.status, r.docStatus, r.joinedAt])
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'fair-ride-riders.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">Rider Management</h1>
          <p className="text-xs text-on-surface-variant">{riders.length} total · {riders.filter(r => r.status === 'PENDING').length} pending approval</p>
        </div>
        <button onClick={handleExport} className="px-5 py-2 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">download</span>
          Export CSV
        </button>
      </header>

      <div className="p-8 space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Fleet Size', value: riders.length, icon: 'people', color: 'text-primary' },
            { label: 'Pending Approval', value: riders.filter(r => r.status === 'PENDING').length, icon: 'pending_actions', color: 'text-tertiary' },
            { label: 'Top Rated (4.5+)', value: riders.filter(r => r.rating >= 4.5).length, icon: 'star', color: 'text-secondary' },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center">
                <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
              </div>
              <div>
                <p className={`font-headline font-extrabold text-3xl ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-on-surface-variant">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary"
              placeholder="Search riders…"
            />
          </div>
          <div className="flex gap-2">
            {STATUS_FILTER.map(f => (
              <button
                key={f}
                onClick={() => setStatusF(f)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${statusF === f ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {DOC_FILTER.map(f => (
              <button
                key={f}
                onClick={() => setDocF(f)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${docF === f ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant/10">
              <tr>
                {['Rider', 'Phone', 'Rating', 'Trips', 'Status', 'Docs', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filtered.map(rider => (
                <tr
                  key={rider.id}
                  className="relative hover:bg-surface-container-low transition-colors"
                  onMouseEnter={() => setHovered(rider.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary text-xs font-bold">
                        {rider.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-on-surface">{rider.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-on-surface-variant">{rider.phone}</td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-1 text-sm font-bold text-on-surface">
                      <span className="material-symbols-outlined text-sm text-tertiary">star</span>
                      {rider.rating}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-on-surface">{rider.trips}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      rider.status === 'ACTIVE' ? 'bg-secondary-container text-on-secondary-container' :
                      rider.status === 'PENDING' ? 'bg-primary-fixed text-on-primary-fixed' :
                      'bg-error-container text-on-error-container'
                    }`}>
                      {rider.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      rider.docStatus === 'APPROVED' ? 'bg-secondary-container text-on-secondary-container' :
                      rider.docStatus === 'PENDING' ? 'bg-surface-container-high text-on-surface-variant' :
                      'bg-error-container text-on-error-container'
                    }`}>
                      {rider.docStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-on-surface-variant">{rider.joinedAt}</td>
                  <td className="px-4 py-4">
                    <div className={`flex items-center gap-2 transition-opacity ${hovered === rider.id ? 'opacity-100' : 'opacity-0'}`}>
                      <button className="px-3 py-1 text-xs font-bold text-primary hover:bg-primary-fixed rounded-lg transition-colors">View</button>
                      {rider.status === 'PENDING' && (
                        <button onClick={() => handleApprove(rider.id)} className="px-3 py-1 text-xs font-bold text-secondary hover:bg-secondary-container rounded-lg transition-colors">Approve</button>
                      )}
                      {rider.status === 'ACTIVE' && (
                        <button onClick={() => handleSuspend(rider.id)} className="px-3 py-1 text-xs font-bold text-error hover:bg-error-container rounded-lg transition-colors">Suspend</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
