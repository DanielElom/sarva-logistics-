/**
 * @page RiderRegisterDocsPage
 * @description Rider document upload during onboarding — ID, license, bike papers.
 * @route /rider/register/docs
 */
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import api from '@/lib/api'

export default function RiderRegisterDocsPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const user = useAuthStore((s) => s.user)

  const [photo, setPhoto] = useState<string | null>(null)
  const [licenseDoc, setLicenseDoc] = useState<string | null>(null)
  const [bikeDoc, setBikeDoc] = useState<string | null>(null)
  const [bvn, setBvn] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [commissionModel, setCommissionModel] = useState<'PERCENTAGE' | 'PER_TRIP'>('PERCENTAGE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const photoRef = useRef<HTMLInputElement>(null)
  const licenseRef = useRef<HTMLInputElement>(null)
  const bikeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
  }, [isAuthenticated, role, router])

  function toBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const reader = new FileReader()
      reader.onload = () => res(reader.result as string)
      reader.onerror = rej
      reader.readAsDataURL(file)
    })
  }

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void,
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await toBase64(file)
    setter(b64)
  }

  async function handleSubmit() {
    if (!photo || !licenseDoc || !bikeDoc) {
      setError('Please upload your photo, license, and bike documents.')
      return
    }
    if (!bvn || !bankName || !accountNumber) {
      setError('Please complete all bank and identity fields.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post('/riders/me/kyc', {
        photo,
        licenseDocument: licenseDoc,
        bikeDocument: bikeDoc,
        bvn,
        bankName,
        accountNumber,
        commissionModel,
      })
      router.replace('/status/under-review')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenWrapper>
      <header className="fixed top-0 w-full z-50 bg-emerald-950/80 backdrop-blur-lg shadow-xl shadow-emerald-950/20">
        <div className="flex items-center gap-4 px-6 h-16">
          <button onClick={() => router.back()} className="text-white">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-extrabold tracking-tighter text-emerald-50 font-headline">
            Complete Registration
          </h1>
        </div>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-lg mx-auto space-y-8">
        {/* Profile photo */}
        <section className="flex flex-col items-center gap-4">
          <button
            onClick={() => photoRef.current?.click()}
            className="w-28 h-28 rounded-full bg-surface-container-low border-2 border-dashed border-outline-variant flex flex-col items-center justify-center overflow-hidden relative"
          >
            {photo ? (
              <img src={photo} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <>
                <span className="material-symbols-outlined text-3xl text-on-surface-variant">
                  add_a_photo
                </span>
                <span className="text-[10px] text-on-surface-variant mt-1">Add Photo</span>
              </>
            )}
          </button>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleFileChange(e, setPhoto)}
          />
          <p className="text-sm text-on-surface-variant font-body text-center">
            Upload a clear profile photo
          </p>
        </section>

        {/* Identity info (read-only from store) */}
        <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-headline font-bold text-on-surface mb-2">Personal Details</h2>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Full Name
            </label>
            <p className="mt-1 font-body text-on-surface font-medium">{user?.name ?? '—'}</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Phone
            </label>
            <p className="mt-1 font-body text-on-surface font-medium">{user?.phone ?? '—'}</p>
          </div>
        </section>

        {/* Document uploads */}
        <section className="space-y-4">
          <h2 className="font-headline font-bold text-on-surface px-1">Documents</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* License */}
            <button
              onClick={() => licenseRef.current?.click()}
              className={`p-5 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-colors ${
                licenseDoc
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant bg-surface-container-lowest'
              }`}
            >
              <span
                className={`material-symbols-outlined text-3xl ${licenseDoc ? 'text-primary' : 'text-on-surface-variant'}`}
                style={{ fontVariationSettings: licenseDoc ? "'FILL' 1" : "'FILL' 0" }}
              >
                {licenseDoc ? 'check_circle' : 'id_card'}
              </span>
              <span className="text-xs font-bold text-center text-on-surface">
                {licenseDoc ? 'License Added' : "Driver's License"}
              </span>
            </button>
            <input
              ref={licenseRef}
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => handleFileChange(e, setLicenseDoc)}
            />

            {/* Bike doc */}
            <button
              onClick={() => bikeRef.current?.click()}
              className={`p-5 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-colors ${
                bikeDoc
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant bg-surface-container-lowest'
              }`}
            >
              <span
                className={`material-symbols-outlined text-3xl ${bikeDoc ? 'text-primary' : 'text-on-surface-variant'}`}
                style={{ fontVariationSettings: bikeDoc ? "'FILL' 1" : "'FILL' 0" }}
              >
                {bikeDoc ? 'check_circle' : 'pedal_bike'}
              </span>
              <span className="text-xs font-bold text-center text-on-surface">
                {bikeDoc ? 'Bike Doc Added' : 'Bike Document'}
              </span>
            </button>
            <input
              ref={bikeRef}
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => handleFileChange(e, setBikeDoc)}
            />
          </div>
        </section>

        {/* Identity number */}
        <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-headline font-bold text-on-surface mb-2">Identity Verification</h2>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-1">
              BVN / NIN
            </label>
            <input
              type="text"
              value={bvn}
              onChange={(e) => setBvn(e.target.value)}
              placeholder="Enter your BVN or NIN"
              className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-on-surface font-body placeholder:text-on-surface-variant/40 border-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </section>

        {/* Bank details */}
        <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-headline font-bold text-on-surface mb-2">Payout Details</h2>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-1">
              Bank Name
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Access Bank"
              className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-on-surface font-body placeholder:text-on-surface-variant/40 border-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-1">
              Account Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="10-digit account number"
              maxLength={10}
              className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-on-surface font-body placeholder:text-on-surface-variant/40 border-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </section>

        {/* Commission model */}
        <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
          <h2 className="font-headline font-bold text-on-surface mb-4">Commission Model</h2>
          <div className="space-y-3">
            {[
              { value: 'PERCENTAGE', label: 'Percentage', sub: 'Earn a % of each order fare' },
              { value: 'PER_TRIP', label: 'Per Trip', sub: 'Flat fee per completed delivery' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCommissionModel(opt.value as 'PERCENTAGE' | 'PER_TRIP')}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  commissionModel === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-outline-variant bg-surface-container-low'
                }`}
              >
                <div className="text-left">
                  <p className="font-headline font-bold text-on-surface">{opt.label}</p>
                  <p className="text-xs text-on-surface-variant">{opt.sub}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    commissionModel === opt.value
                      ? 'border-primary bg-primary'
                      : 'border-outline-variant'
                  }`}
                >
                  {commissionModel === opt.value && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {error && (
          <p className="text-error text-sm font-body text-center px-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all duration-150 disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Complete Registration'}
        </button>
      </main>
    </ScreenWrapper>
  )
}
