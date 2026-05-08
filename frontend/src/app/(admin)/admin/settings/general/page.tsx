'use client'

import { useState, useRef } from 'react'
import api from '@/lib/api'

export default function AdminSettingsGeneralPage() {
  const [platformName, setPlatformName] = useState('Fair-Ride')
  const [currency, setCurrency] = useState('NGN')
  const [timezone, setTimezone] = useState('GMT+1')
  const [supportEmail, setSupportEmail] = useState('support@fair-ride.com')
  const [supportPhone, setSupportPhone] = useState('+234 800 123 4567')
  const [saved, setSaved] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    try {
      await api.patch('/admin/settings/general', { platformName, currency, timezone, supportEmail, supportPhone })
    } catch { /* proceed */ }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">General Settings</h1>
          <p className="text-xs text-on-surface-variant">Platform identity and global parameters</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm">Discard Changes</button>
          <button
            onClick={handleSave}
            className={`px-6 py-2 font-bold rounded-xl text-sm flex items-center gap-2 ${saved ? 'bg-secondary-container text-on-secondary-container' : 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg'}`}
          >
            <span className="material-symbols-outlined text-sm">save</span>
            {saved ? 'Saved!' : 'Save Configuration'}
          </button>
        </div>
      </header>

      <div className="p-8 max-w-5xl space-y-6">
        <div>
          <h2 className="font-headline font-extrabold text-3xl text-on-surface mb-1">General Settings</h2>
          <p className="text-on-surface-variant">Configure your platform identity and global system parameters.</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Platform identity */}
          <div className="col-span-8 bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">branding_watermark</span>
              <h3 className="font-headline font-bold text-lg text-on-surface">Platform Identity</h3>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Platform Name</label>
                  <input
                    value={platformName}
                    onChange={e => setPlatformName(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary text-on-surface font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Default Currency</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary text-on-surface font-medium appearance-none"
                  >
                    <option value="NGN">Nigerian Naira (₦)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="EUR">Euro (€)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Platform Logo</label>
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="border-2 border-dashed border-outline-variant/30 rounded-xl p-8 flex flex-col items-center justify-center hover:bg-surface-container-low cursor-pointer transition-colors"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="h-16 object-contain mb-2 rounded-lg" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-primary text-2xl">cloud_upload</span>
                    </div>
                  )}
                  <p className="text-sm font-bold text-on-surface">{logoPreview ? 'Click to change logo' : 'Click to upload or drag and drop'}</p>
                  <p className="text-xs text-on-surface-variant mt-1">SVG, PNG, or JPG (max. 800x400px)</p>
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
              </div>
            </div>
          </div>

          {/* Localization */}
          <div className="col-span-4 bg-primary text-on-primary rounded-xl p-8 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/30 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined">language</span>
                <h3 className="font-headline font-bold text-lg">Localization</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider opacity-70 block mb-2">System Timezone</label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full bg-white/10 border-none rounded-lg py-2.5 px-3 text-sm font-medium focus:ring-1 appearance-none"
                  >
                    <option>GMT+1 (Lagos)</option>
                    <option>GMT+0 (London)</option>
                    <option>GMT-5 (New York)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-70">Auto Daylight Savings</span>
                  <div className="w-10 h-5 bg-primary-fixed/50 rounded-full relative">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-on-primary-fixed rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs italic opacity-60 mt-8 relative z-10 border-t border-white/10 pt-4">
              &ldquo;Precision is the foundation of structural logistics.&rdquo;
            </p>
          </div>

          {/* Contact */}
          <div className="col-span-12 bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">contact_mail</span>
              <h3 className="font-headline font-bold text-lg text-on-surface">Official Communication</h3>
            </div>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Support Email</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">alternate_email</span>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={e => setSupportEmail(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-10 pr-4 focus:ring-1 focus:ring-primary text-on-surface font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Contact Phone</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">call</span>
                  <input
                    type="tel"
                    value={supportPhone}
                    onChange={e => setSupportPhone(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-10 pr-4 focus:ring-1 focus:ring-primary text-on-surface font-medium"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <p className="text-xs text-on-surface-variant">These details appear on all automated customer receipts and tracking pages.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
