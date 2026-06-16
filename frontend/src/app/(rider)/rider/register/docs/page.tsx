/**
 * @page RiderRegisterDocsPage
 * @description Rider document upload during onboarding — ID, license, bike papers, and bike photos.
 * @route /rider/register/docs
 */
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import api from '@/lib/api'

async function compressImage(file: File, maxDimension = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height / width) * maxDimension)
            width = maxDimension
          } else {
            width = Math.round((width / height) * maxDimension)
            height = maxDimension
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

type DocField = 'idDocument' | 'licenseDocument' | 'bikePapers' | 'bikePhotoFront' | 'bikePhotoSide' | 'bikePhotoPlate'

export default function RiderRegisterDocsPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const user = useAuthStore((s) => s.user)

  const [idDocument, setIdDocument] = useState<string | null>(null)
  const [licenseDocument, setLicenseDocument] = useState<string | null>(null)
  const [bikePapers, setBikePapers] = useState<string | null>(null)
  const [bvn, setBvn] = useState('')
  const [bikePhotoFront, setBikePhotoFront] = useState<string | null>(null)
  const [bikePhotoSide, setBikePhotoSide] = useState<string | null>(null)
  const [bikePhotoPlate, setBikePhotoPlate] = useState<string | null>(null)
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const idRef = useRef<HTMLInputElement>(null)
  const licenseRef = useRef<HTMLInputElement>(null)
  const bikePapersRef = useRef<HTMLInputElement>(null)
  const frontPhotoRef = useRef<HTMLInputElement>(null)
  const sidePhotoRef = useRef<HTMLInputElement>(null)
  const platePhotoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role !== 'RIDER') { router.replace('/home'); return }
  }, [isAuthenticated, role, router])

  async function handleFileSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    field: DocField,
    setter: (v: string) => void,
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading((prev) => ({ ...prev, [field]: true }))
    try {
      const compressed = await compressImage(file)
      setter(compressed)
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }))
    }
  }

  async function handleSubmit() {
    if (!idDocument || !licenseDocument || !bikePapers) {
      setError('Please upload your ID, driver\'s license, and bike papers.')
      return
    }
    if (!bvn.trim()) {
      setError('Please enter your BVN or NIN.')
      return
    }
    if (!bikePhotoFront || !bikePhotoSide || !bikePhotoPlate) {
      setError('Please upload all three bike photos (front, side, and number plate).')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post('/riders/me/kyc', {
        idDocument,
        licenseDocument,
        bikePapers,
        bvnNin: bvn,
        bikePhotoFront,
        bikePhotoSide,
        bikePhotoPlate,
      })
      router.replace('/status/under-review')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function UploadCard({
    label,
    value,
    isUploading,
    icon,
    onTap,
    accept = 'image/*,application/pdf',
  }: {
    label: string
    value: string | null
    isUploading: boolean
    icon: string
    onTap: () => void
    accept?: string
  }) {
    return (
      <button
        type="button"
        onClick={onTap}
        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
          value
            ? 'border-primary bg-primary/5'
            : 'border-outline-variant bg-surface-container-lowest'
        }`}
      >
        {value ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-outline-variant/20">
            <img src={value} alt={label} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
            isUploading ? 'bg-primary/10' : 'bg-surface-container-high'
          }`}>
            {isUploading ? (
              <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
            ) : (
              <span className={`material-symbols-outlined ${value ? 'text-primary' : 'text-on-surface-variant'}`}>
                {icon}
              </span>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-headline font-bold text-sm ${value ? 'text-primary' : 'text-on-surface'}`}>
            {isUploading ? 'Compressing…' : value ? `${label} — Added` : label}
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {value ? 'Tap to replace' : 'Tap to upload'}
          </p>
        </div>
        {value && (
          <span className="material-symbols-outlined text-primary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
        )}
      </button>
    )
  }

  function BikePhotoSlot({
    label,
    value,
    isUploading,
    onTap,
  }: {
    label: string
    value: string | null
    isUploading: boolean
    onTap: () => void
  }) {
    return (
      <button
        type="button"
        onClick={onTap}
        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
          value ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'
        }`}
      >
        {value ? (
          <div className="w-full aspect-[4/3] rounded-lg overflow-hidden relative">
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
              <span className="material-symbols-outlined text-on-primary text-xs" style={{ fontVariationSettings: "'FILL' 1", fontSize: '14px' }}>check</span>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-[4/3] rounded-lg bg-surface-container-high flex items-center justify-center">
            {isUploading ? (
              <span className="material-symbols-outlined text-primary animate-spin text-3xl">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-on-surface-variant text-3xl">photo_camera</span>
            )}
          </div>
        )}
        <p className={`text-xs font-bold text-center ${value ? 'text-primary' : 'text-on-surface-variant'}`}>
          {isUploading ? 'Compressing…' : label}
        </p>
      </button>
    )
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

        {/* Section 1 — Personal Info (read-only) */}
        <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-headline font-bold text-on-surface">Personal Details</h2>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-sm">person</span>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Full Name</p>
              <p className="font-body text-on-surface font-medium">{user?.name ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-sm">phone</span>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Phone</p>
              <p className="font-body text-on-surface font-medium">{user?.phone ?? '—'}</p>
            </div>
          </div>
        </section>

        {/* Section 2 — Identity Documents */}
        <section className="space-y-3">
          <h2 className="font-headline font-bold text-on-surface px-1">Identity Documents</h2>

          <UploadCard
            label="National ID / Passport"
            value={idDocument}
            isUploading={uploading.idDocument ?? false}
            icon="id_card"
            onTap={() => idRef.current?.click()}
          />
          <input
            ref={idRef}
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => handleFileSelect(e, 'idDocument', setIdDocument)}
          />

          <UploadCard
            label="Driver's License"
            value={licenseDocument}
            isUploading={uploading.licenseDocument ?? false}
            icon="card_membership"
            onTap={() => licenseRef.current?.click()}
          />
          <input
            ref={licenseRef}
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => handleFileSelect(e, 'licenseDocument', setLicenseDocument)}
          />

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block px-1">
              BVN / NIN
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={bvn}
              onChange={(e) => setBvn(e.target.value)}
              placeholder="Enter your BVN or NIN"
              className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-on-surface font-body placeholder:text-on-surface-variant/40 border-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </section>

        {/* Section 3 — Vehicle Documents */}
        <section className="space-y-3">
          <h2 className="font-headline font-bold text-on-surface px-1">Vehicle Documents</h2>

          <UploadCard
            label="Bike Papers / Registration"
            value={bikePapers}
            isUploading={uploading.bikePapers ?? false}
            icon="pedal_bike"
            onTap={() => bikePapersRef.current?.click()}
          />
          <input
            ref={bikePapersRef}
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => handleFileSelect(e, 'bikePapers', setBikePapers)}
          />
        </section>

        {/* Section 4 — Bike Photos */}
        <section className="space-y-3">
          <div className="px-1">
            <h2 className="font-headline font-bold text-on-surface">Bike Photos</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Upload clear photos of your motorcycle</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <BikePhotoSlot
              label="Front View"
              value={bikePhotoFront}
              isUploading={uploading.bikePhotoFront ?? false}
              onTap={() => frontPhotoRef.current?.click()}
            />
            <BikePhotoSlot
              label="Side View"
              value={bikePhotoSide}
              isUploading={uploading.bikePhotoSide ?? false}
              onTap={() => sidePhotoRef.current?.click()}
            />
            <BikePhotoSlot
              label="Number Plate"
              value={bikePhotoPlate}
              isUploading={uploading.bikePhotoPlate ?? false}
              onTap={() => platePhotoRef.current?.click()}
            />
          </div>

          <input ref={frontPhotoRef} type="file" accept="image/*" className="sr-only"
            onChange={(e) => handleFileSelect(e, 'bikePhotoFront', setBikePhotoFront)} />
          <input ref={sidePhotoRef} type="file" accept="image/*" className="sr-only"
            onChange={(e) => handleFileSelect(e, 'bikePhotoSide', setBikePhotoSide)} />
          <input ref={platePhotoRef} type="file" accept="image/*" className="sr-only"
            onChange={(e) => handleFileSelect(e, 'bikePhotoPlate', setBikePhotoPlate)} />
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
