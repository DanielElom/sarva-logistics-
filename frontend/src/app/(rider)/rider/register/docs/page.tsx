/**
 * @page RiderRegisterDocsPage
 * @description Rider document upload during onboarding — profile photo, ID, license, bike papers, and bike photos.
 * @route /rider/register/docs
 */
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/auth.store'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import api from '@/lib/api'

async function compressImage(file: File, maxDimension = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Image processing timed out'))
    }, 15000)

    const reader = new FileReader()
    reader.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('Could not read file'))
    }
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('Could not load image — unsupported format'))
      }
      img.onload = () => {
        clearTimeout(timeout)
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

type DocField = 'profilePhoto' | 'idDocument' | 'licenseDocument' | 'bikePapers' | 'bikePhotoFront' | 'bikePhotoSide' | 'bikePhotoPlate'

export default function RiderRegisterDocsPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const user = useAuthStore((s) => s.user)

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
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

  const profilePhotoRef = useRef<HTMLInputElement>(null)
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

  // Guard: if this rider has already submitted KYC (docs exist on their profile),
  // redirect to under-review instead of showing the empty upload form.
  // Catches both the phone-reuse testing scenario and a real user navigating
  // back to /rider/register/docs after already submitting.
  useEffect(() => {
    if (!isAuthenticated || role !== 'RIDER') return
    api.get('/riders/me')
      .then(({ data }) => {
        if (data.idDocument) {
          router.replace('/status/under-review')
        }
      })
      .catch(() => {
        // 404 = brand-new rider with no profile row yet — show the form normally
      })
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not process this image'
      toast.error(`${msg} — try a different photo`)
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }))
      // Reset input so the same file can be re-selected after an error
      e.target.value = ''
    }
  }

  async function handleSubmit() {
    if (!profilePhoto) {
      toast.error('Please upload your profile photo')
      return
    }
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
        profilePhoto,
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
  }: {
    label: string
    value: string | null
    isUploading: boolean
    icon: string
    onTap: () => void
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
          <div className="w-full aspect-4/3 rounded-lg overflow-hidden relative">
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
              <span className="material-symbols-outlined text-on-primary text-xs" style={{ fontVariationSettings: "'FILL' 1", fontSize: '14px' }}>check</span>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-4/3 rounded-lg bg-surface-container-high flex items-center justify-center">
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

        {/* Section 0 — Profile Photo */}
        <section className="space-y-3">
          <div className="px-1">
            <h2 className="font-headline font-bold text-on-surface">Profile Photo</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Upload a clear photo of your face — customers will see this during delivery</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => profilePhotoRef.current?.click()}
              className="relative"
            >
              <div className={`w-24 h-24 rounded-full border-4 overflow-hidden flex items-center justify-center transition-all ${
                profilePhoto ? 'border-primary' : 'border-outline-variant bg-surface-container-high'
              }`}>
                {uploading.profilePhoto ? (
                  <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
                ) : profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                )}
              </div>
              <div className={`absolute bottom-0 right-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-md ${
                profilePhoto ? 'bg-primary' : 'bg-surface-container-high'
              }`}>
                {profilePhoto ? (
                  <span className="material-symbols-outlined text-on-primary" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>check</span>
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>photo_camera</span>
                )}
              </div>
            </button>
            <p className="text-sm text-on-surface-variant">
              {uploading.profilePhoto ? 'Compressing…' : profilePhoto ? 'Tap to replace' : 'Tap to upload photo'}
            </p>
          </div>
          <input
            ref={profilePhotoRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleFileSelect(e, 'profilePhoto', setProfilePhoto)}
          />
        </section>

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
          className="w-full h-14 bg-linear-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all duration-150 disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Complete Registration'}
        </button>
      </main>
    </ScreenWrapper>
  )
}
