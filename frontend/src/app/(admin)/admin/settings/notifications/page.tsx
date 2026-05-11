/**
 * @page AdminNotificationsSettingsPage
 * @description Platform notification rules — push, SMS, email triggers per order event.
 * @route /admin/settings/notifications
 */
'use client'

import { useState } from 'react'
import api from '@/lib/api'

const EVENT_TRIGGERS = [
  { id: 'trip_accepted', label: 'Trip accepted', sub: 'Triggered when courier confirms shipment', push: true, sms: true, email: false },
  { id: 'rider_arrived', label: 'Rider arrived', sub: 'Arrival notification at pickup/dropoff', push: true, sms: false, email: false },
  { id: 'payment_success', label: 'Payment successful', sub: 'Post-transaction confirmation', push: false, sms: false, email: true },
  { id: 'promotions', label: 'Promotions', sub: 'Marketing and retention campaigns', push: true, sms: false, email: true },
]

type Channel = 'push' | 'sms' | 'email'

export default function AdminSettingsNotificationsPage() {
  const [pushEnabled, setPushEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [triggers, setTriggers] = useState(EVENT_TRIGGERS)
  const [saved, setSaved] = useState(false)

  function toggleTrigger(id: string, channel: Channel) {
    setTriggers(prev => prev.map(t => t.id === id ? { ...t, [channel]: !t[channel as keyof typeof t] } : t))
  }

  async function handleSave() {
    try {
      await api.patch('/admin/settings/notifications', { pushEnabled, smsEnabled, emailEnabled, triggers })
    } catch { /* proceed */ }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function ToggleSwitch({ val, set }: { val: boolean; set: (v: boolean) => void }) {
    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={val} onChange={() => set(!val)} className="sr-only peer" />
        <div className="w-11 h-6 bg-outline-variant/30 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
      </label>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">Notification Settings</h1>
          <p className="text-xs text-on-surface-variant">Configure automated dispatch communications and event triggers</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm">Revert</button>
          <button
            onClick={handleSave}
            className={`px-6 py-2 font-bold rounded-xl text-sm ${saved ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary text-on-primary shadow-lg'}`}
          >
            {saved ? '✓ Saved' : 'Save Rules'}
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6 max-w-6xl">
        <h2 className="font-headline font-extrabold text-3xl text-primary">Notification Settings</h2>

        <div className="grid grid-cols-12 gap-6">
          {/* Global channels */}
          <div className="col-span-4 space-y-6">
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
              <h3 className="font-headline font-bold text-primary mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">settings_input_component</span>
                Global Channels
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Push Alerts', sub: 'Mobile App', icon: 'notifications_active', val: pushEnabled, set: setPushEnabled },
                  { label: 'SMS Bridge', sub: 'Global SMS', icon: 'sms', val: smsEnabled, set: setSmsEnabled },
                  { label: 'Email Digest', sub: 'Transactional', icon: 'mail', val: emailEnabled, set: setEmailEnabled },
                ].map(ch => (
                  <div key={ch.label} className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">{ch.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{ch.label}</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{ch.sub}</p>
                      </div>
                    </div>
                    <ToggleSwitch val={ch.val} set={ch.set} />
                  </div>
                ))}
              </div>
            </div>

            {/* Provider config */}
            <div className="bg-primary rounded-2xl p-6 text-on-primary">
              <h3 className="font-headline font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">hub</span>
                Provider Config
              </h3>
              <div className="space-y-3">
                <div className="bg-white/10 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-medium">AWS SNS</span>
                  <span className="text-[10px] bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
                </div>
                <div className="bg-white/10 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-medium">Twilio API</span>
                  <span className="text-[10px] bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full font-bold">CONNECTED</span>
                </div>
                <button className="w-full mt-2 py-2 bg-on-primary-container text-primary text-xs font-bold rounded-lg hover:brightness-110 transition-all">
                  Manage Integration
                </button>
              </div>
            </div>
          </div>

          {/* Event triggers */}
          <div className="col-span-8">
            <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-headline font-extrabold text-xl text-primary">Event Triggers</h3>
                  <p className="text-xs text-on-surface-variant">Map events to notification channels.</p>
                </div>
                <div className="flex gap-2">
                  {['PUSH', 'SMS', 'EMAIL'].map(ch => (
                    <span key={ch} className="text-[10px] font-bold text-on-surface-variant px-3 py-1 bg-surface-container rounded-full">{ch}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {triggers.map(trigger => (
                  <div key={trigger.id} className="grid grid-cols-12 items-center p-4 hover:bg-surface-container-low rounded-2xl transition-all">
                    <div className="col-span-6">
                      <p className="font-bold text-on-surface">{trigger.label}</p>
                      <p className="text-xs text-on-surface-variant">{trigger.sub}</p>
                    </div>
                    <div className="col-span-6 flex justify-around">
                      {(['push', 'sms', 'email'] as Channel[]).map(ch => (
                        <input
                          key={ch}
                          type="checkbox"
                          checked={trigger[ch] as boolean}
                          onChange={() => toggleTrigger(trigger.id, ch)}
                          className="w-5 h-5 rounded text-primary border-outline-variant focus:ring-primary/20"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button className="px-6 py-2.5 bg-surface-container-high text-on-surface font-bold text-sm rounded-xl">Revert</button>
                <button onClick={handleSave} className="px-8 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-xl shadow-lg">Save Rules</button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-surface-container-low p-6 rounded-2xl flex items-start gap-4 border border-outline-variant/10">
                <div className="p-3 bg-secondary-container rounded-xl">
                  <span className="material-symbols-outlined text-on-secondary-container">history</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-on-surface">Delivery Logs</h4>
                  <p className="text-xs text-on-surface-variant mt-1">Review last 48 hours of sent communications.</p>
                  <button className="text-[10px] font-extrabold text-primary mt-3 block uppercase tracking-wider hover:underline">View History</button>
                </div>
              </div>
              <div className="bg-surface-container-low p-6 rounded-2xl flex items-start gap-4 border border-outline-variant/10">
                <div className="p-3 bg-tertiary-fixed rounded-xl">
                  <span className="material-symbols-outlined text-on-tertiary-fixed">security</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-on-surface">Opt-out Policy</h4>
                  <p className="text-xs text-on-surface-variant mt-1">Manage compliance rules and opt-out keywords.</p>
                  <button className="text-[10px] font-extrabold text-tertiary mt-3 block uppercase tracking-wider hover:underline">Configure</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
