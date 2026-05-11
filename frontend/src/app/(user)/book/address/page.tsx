/**
 * @page BookAddressPage
 * @description Step 2 of booking: enter pickup and dropoff addresses with autocomplete.
 * @route /book/address
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import { useBookingStore } from '@/stores/booking.store'
import api from '@/lib/api'

/* ── types ─────────────────────────────────────────────────────── */
interface Suggestion {
  description: string
  lat: number
  lng: number
}

interface AddrState {
  text: string
  lat: number | null
  lng: number | null
}

const EMPTY_ADDR: AddrState = { text: '', lat: null, lng: null }

/* ── page ───────────────────────────────────────────────────────── */
export default function BookAddressPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const deliveryType = useBookingStore((s) => s.deliveryType)
  const { setAddresses, setPriceEstimate, setPriceEstimate: _setPE, setPackageDescription } =
    useBookingStore()

  const [pickup, setPickup] = useState<AddrState>(EMPTY_ADDR)
  const [dropoff, setDropoff] = useState<AddrState>(EMPTY_ADDR)
  const [pickupSuggs, setPickupSuggs] = useState<Suggestion[]>([])
  const [dropoffSuggs, setDropoffSuggs] = useState<Suggestion[]>([])
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | null>(null)
  const [swapDeg, setSwapDeg] = useState(0)
  const [pkgDesc, setPkgDesc] = useState('')
  const [aiText, setAiText] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [loadingEstimate, setLoadingEstimate] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreBlurRef = useRef(false)

  /* auth + flow guard */
  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role === 'RIDER') { router.replace('/rider/home'); return }
    if (role === 'ADMIN') { router.replace('/admin/dashboard'); return }
    if (!deliveryType) { router.replace('/book/type'); return }
  }, [isAuthenticated, role, deliveryType, router])

  /* fetch suggestions */
  const fetchSuggestions = useCallback(async (field: 'pickup' | 'dropoff', q: string) => {
    try {
      const { data } = await api.get(`/orders/places/autocomplete?input=${encodeURIComponent(q)}`)
      if (field === 'pickup') setPickupSuggs(data.suggestions ?? [])
      else setDropoffSuggs(data.suggestions ?? [])
    } catch {
      /* silent */
    }
  }, [])

  function handleAddrChange(field: 'pickup' | 'dropoff', value: string) {
    const setter = field === 'pickup' ? setPickup : setDropoff
    setter({ text: value, lat: null, lng: null })

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(field, value), 300)
  }

  function handleFocus(field: 'pickup' | 'dropoff') {
    setActiveField(field)
    const text = field === 'pickup' ? pickup.text : dropoff.text
    if (!text) fetchSuggestions(field, '')
  }

  function handleBlur() {
    setTimeout(() => {
      if (!ignoreBlurRef.current) setActiveField(null)
      ignoreBlurRef.current = false
    }, 160)
  }

  function selectSuggestion(field: 'pickup' | 'dropoff', s: Suggestion) {
    ignoreBlurRef.current = true
    if (field === 'pickup') {
      setPickup({ text: s.description, lat: s.lat, lng: s.lng })
      setPickupSuggs([])
    } else {
      setDropoff({ text: s.description, lat: s.lat, lng: s.lng })
      setDropoffSuggs([])
    }
    setActiveField(null)
  }

  function useCurrentLocation(field: 'pickup' | 'dropoff') {
    ignoreBlurRef.current = true
    setActiveField(null)
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const text = 'Current location'
        if (field === 'pickup') setPickup({ text, lat, lng })
        else setDropoff({ text, lat, lng })
      },
      () => toast.error('Could not get your location'),
    )
  }

  function handleSwap() {
    setSwapDeg((d) => d + 180)
    setPickup(dropoff)
    setDropoff(pickup)
  }

  /* AI assist */
  async function handleAiSubmit() {
    if (!aiText.trim()) return
    setAiLoading(true)
    try {
      const { data } = await api.post('/orders/ai-address', { description: aiText })
      if (data.pickupAddress) setPickup({ text: data.pickupAddress, lat: null, lng: null })
      if (data.dropoffAddress) setDropoff({ text: data.dropoffAddress, lat: null, lng: null })
      setAiOpen(false)
      setAiText('')
      toast.success('Addresses filled from description')
    } catch {
      toast.error('Could not parse description')
    } finally {
      setAiLoading(false)
    }
  }

  /* continue */
  async function handleContinue() {
    if (!pickup.text || !dropoff.text) {
      toast.error('Please set both pickup and drop-off locations')
      return
    }

    /* use stored coords or fall back to mock Lagos coords */
    const pLat = pickup.lat ?? 6.5244
    const pLng = pickup.lng ?? 3.3792
    const dLat = dropoff.lat ?? 6.4698
    const dLng = dropoff.lng ?? 3.5852

    setLoadingEstimate(true)
    try {
      const { data } = await api.get(
        `/orders/price-estimate?pickupLat=${pLat}&pickupLng=${pLng}&dropoffLat=${dLat}&dropoffLng=${dLng}`,
      )
      setAddresses(
        { latitude: pLat, longitude: pLng, address: pickup.text },
        { latitude: dLat, longitude: dLng, address: dropoff.text },
      )
      setPriceEstimate(data.estimatedPrice, data.distanceKm, data.estimatedEta)
      if (pkgDesc.trim()) setPackageDescription(pkgDesc.trim())
      router.push('/book/confirm')
    } catch {
      toast.error('Could not fetch price estimate. Please try again.')
    } finally {
      setLoadingEstimate(false)
    }
  }

  if (!isAuthenticated || !deliveryType) return null

  const bothSet = !!pickup.text && !!dropoff.text

  return (
    <ScreenWrapper>
      {/* ── Map underlay ─────────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <MapUnderlay />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(248,250,244,0.55) 0%, rgba(248,250,244,0.35) 40%, rgba(248,250,244,0.75) 80%, rgba(248,250,244,1) 100%)',
          }}
        />
      </div>

      {/* ── Fixed header ─────────────────────────────────────────── */}
      <header className="fixed top-0 w-full max-w-107.5 z-50 flex items-center gap-3 px-6 h-16 bg-[#f8faf4]/85 backdrop-blur-lg border-b border-outline-variant/10">
        <button
          onClick={() => router.push('/book/type')}
          className="p-1.5 -ml-1.5 rounded-full active:scale-90 transition-transform active:bg-surface-container"
          aria-label="Back"
        >
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>
            arrow_back
          </span>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.18em]">
            STEP 02
          </p>
          <h1 className="font-headline font-bold text-base text-on-surface leading-tight tracking-tight">
            Set Locations
          </h1>
        </div>
        {/* Step progress pills */}
        <div className="flex gap-1 shrink-0">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`h-1.5 rounded-full transition-all ${
                n === 2 ? 'w-6 bg-primary' : n < 2 ? 'w-3 bg-primary/50' : 'w-3 bg-outline-variant/40'
              }`}
            />
          ))}
        </div>
      </header>

      {/* ── Scrollable content ───────────────────────────────────── */}
      <main className="relative z-10 pt-16 pb-36 px-4">
        {/* Hero heading */}
        <div className="pt-8 mb-6 px-2">
          <h2 className="font-headline font-extrabold text-3xl text-primary tracking-tight">
            Set Your Route
          </h2>
          <p className="text-on-surface-variant font-medium text-sm mt-1">
            Precision logistics starting from your doorstep.
          </p>
        </div>

        {/* ── Main card ───────────────────────────────────────────── */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,52,24,0.10)] overflow-visible">
          <div className="p-6 flex flex-col gap-5">

            {/* Pickup field */}
            <div className="relative">
              <label className="block font-label font-semibold text-[10px] text-on-surface-variant uppercase tracking-[0.16em] mb-2 px-1">
                Pickup Location
              </label>
              <div className="relative flex items-center">
                <span
                  className="absolute left-4 material-symbols-outlined text-primary pointer-events-none"
                  style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                >
                  location_on
                </span>
                <input
                  type="text"
                  value={pickup.text}
                  onChange={(e) => handleAddrChange('pickup', e.target.value)}
                  onFocus={() => handleFocus('pickup')}
                  onBlur={handleBlur}
                  placeholder="Enter pickup address…"
                  className="w-full pl-11 pr-10 py-4 bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-surface-container-lowest rounded-xl text-on-surface placeholder:text-outline/50 text-sm font-medium focus:outline-none transition-all"
                />
                {pickup.text && (
                  <button
                    onMouseDown={() => { ignoreBlurRef.current = true }}
                    onClick={() => { setPickup(EMPTY_ADDR); setPickupSuggs([]) }}
                    className="absolute right-3 text-on-surface-variant active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                  </button>
                )}
              </div>

              {/* Pickup suggestions dropdown */}
              {activeField === 'pickup' && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-surface-container-lowest rounded-xl shadow-[0_8px_32px_rgba(0,52,24,0.12)] border border-outline-variant/20 overflow-hidden">
                  {/* Current location */}
                  <button
                    onMouseDown={() => { ignoreBlurRef.current = true }}
                    onClick={() => useCurrentLocation('pickup')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container active:bg-surface-container transition-colors border-b border-outline-variant/10 text-left"
                  >
                    <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: '18px' }}>
                      my_location
                    </span>
                    <span className="text-sm font-semibold text-primary">Use my current location</span>
                  </button>
                  {pickupSuggs.map((s) => (
                    <button
                      key={s.description}
                      onMouseDown={() => { ignoreBlurRef.current = true }}
                      onClick={() => selectSuggestion('pickup', s)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container active:bg-surface-container transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant shrink-0" style={{ fontSize: '16px' }}>
                        location_on
                      </span>
                      <span className="text-sm text-on-surface">{s.description}</span>
                    </button>
                  ))}
                  {pickupSuggs.length === 0 && (
                    <p className="px-4 py-3 text-sm text-on-surface-variant">No results found</p>
                  )}
                </div>
              )}
            </div>

            {/* Swap + connector */}
            <div className="flex items-center gap-3 -my-1">
              <div className="ml-5 w-0.5 h-6 bg-gradient-to-b from-primary/40 to-primary-container/20 rounded-full" />
              <button
                onClick={handleSwap}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold active:scale-95 transition-all hover:bg-surface-container-high"
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '16px',
                    transform: `rotate(${swapDeg}deg)`,
                    transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                    display: 'inline-block',
                  }}
                >
                  swap_vert
                </span>
                Swap
              </button>
            </div>

            {/* Dropoff field */}
            <div className="relative">
              <label className="block font-label font-semibold text-[10px] text-on-surface-variant uppercase tracking-[0.16em] mb-2 px-1">
                Drop-off Destination
              </label>
              <div className="relative flex items-center">
                <span
                  className="absolute left-4 material-symbols-outlined pointer-events-none"
                  style={{ fontSize: '20px', color: 'var(--color-primary-container)', fontVariationSettings: "'FILL' 1" }}
                >
                  flag
                </span>
                <input
                  type="text"
                  value={dropoff.text}
                  onChange={(e) => handleAddrChange('dropoff', e.target.value)}
                  onFocus={() => handleFocus('dropoff')}
                  onBlur={handleBlur}
                  placeholder="Where are we delivering to?"
                  className="w-full pl-11 pr-10 py-4 bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-surface-container-lowest rounded-xl text-on-surface placeholder:text-outline/50 text-sm font-medium focus:outline-none transition-all"
                />
                {dropoff.text && (
                  <button
                    onMouseDown={() => { ignoreBlurRef.current = true }}
                    onClick={() => { setDropoff(EMPTY_ADDR); setDropoffSuggs([]) }}
                    className="absolute right-3 text-on-surface-variant active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                  </button>
                )}
              </div>

              {/* Dropoff suggestions dropdown */}
              {activeField === 'dropoff' && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-surface-container-lowest rounded-xl shadow-[0_8px_32px_rgba(0,52,24,0.12)] border border-outline-variant/20 overflow-hidden">
                  <button
                    onMouseDown={() => { ignoreBlurRef.current = true }}
                    onClick={() => useCurrentLocation('dropoff')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container active:bg-surface-container transition-colors border-b border-outline-variant/10 text-left"
                  >
                    <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: '18px' }}>
                      my_location
                    </span>
                    <span className="text-sm font-semibold text-primary">Use my current location</span>
                  </button>
                  {dropoffSuggs.map((s) => (
                    <button
                      key={s.description}
                      onMouseDown={() => { ignoreBlurRef.current = true }}
                      onClick={() => selectSuggestion('dropoff', s)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container active:bg-surface-container transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant shrink-0" style={{ fontSize: '16px' }}>
                        location_on
                      </span>
                      <span className="text-sm text-on-surface">{s.description}</span>
                    </button>
                  ))}
                  {dropoffSuggs.length === 0 && (
                    <p className="px-4 py-3 text-sm text-on-surface-variant">No results found</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Route preview strip (when both set) ────────────── */}
            {bothSet && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-primary/[0.06] rounded-xl border border-primary/15">
                <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>
                  route
                </span>
                <p className="text-xs font-semibold text-primary truncate">
                  {pickup.text} → {dropoff.text}
                </p>
              </div>
            )}

            {/* ── AI Natural Language Assist ──────────────────────── */}
            <div className="border-t border-surface-container-high pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-label font-semibold text-[10px] text-on-surface-variant uppercase tracking-[0.16em]">
                  Natural Language Assist
                </span>
                <button
                  onClick={() => setAiOpen((o) => !o)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-container/10 rounded-full text-[10px] font-bold text-primary uppercase tracking-tight active:scale-95 transition-transform"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
                  >
                    auto_awesome
                  </span>
                  AI Assist
                </button>
              </div>

              {aiOpen && (
                <div className="space-y-3">
                  <div className="relative">
                    <textarea
                      value={aiText}
                      onChange={(e) => setAiText(e.target.value)}
                      rows={3}
                      placeholder="e.g. 'Pick up from GTB Wuse 2 and deliver to my office in Maitama'"
                      className="w-full p-4 bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-surface-container-lowest rounded-xl text-on-surface placeholder:text-outline/50 text-sm resize-none focus:outline-none transition-all"
                    />
                    <span className="absolute bottom-3 right-3 text-[10px] text-outline font-medium">
                      Describe your delivery
                    </span>
                  </div>
                  <button
                    onClick={handleAiSubmit}
                    disabled={aiLoading || !aiText.trim()}
                    className="w-full py-3 rounded-xl bg-primary text-on-primary font-headline font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <>
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}
                        >
                          progress_activity
                        </span>
                        Parsing…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                          auto_awesome
                        </span>
                        Fill Addresses
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Quick context chips */}
              <div className="flex flex-wrap gap-2 mt-3">
                {['Fragile Item', 'Residential Gate', 'Signature Required'].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setPkgDesc((d) => d ? `${d}, ${chip}` : chip)}
                    className="px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-semibold active:bg-primary/10 active:text-primary transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Package description ──────────────────────────────── */}
            <div className="border-t border-surface-container-high pt-4">
              <label className="block font-label font-semibold text-[10px] text-on-surface-variant uppercase tracking-[0.16em] mb-2 px-1">
                What are you sending? <span className="normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={pkgDesc}
                onChange={(e) => setPkgDesc(e.target.value)}
                placeholder="e.g. Documents, clothes, electronics…"
                className="w-full px-4 py-3.5 bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-surface-container-lowest rounded-xl text-on-surface placeholder:text-outline/50 text-sm focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Map preview strip */}
        <div className="mt-4 rounded-2xl overflow-hidden relative h-24 bg-surface-container-low border border-outline-variant/10">
          <MapUnderlay />
          <div className="absolute inset-0 bg-surface/40" />
          <div className="absolute inset-0 flex items-center justify-center gap-3">
            {bothSet ? (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-full shadow-sm">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>location_on</span>
                  <span className="text-[11px] font-semibold text-on-surface truncate max-w-[100px]">{pickup.text}</span>
                </div>
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '16px' }}>arrow_forward</span>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-full shadow-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-primary-container)', fontVariationSettings: "'FILL' 1" }}>flag</span>
                  <span className="text-[11px] font-semibold text-on-surface truncate max-w-[100px]">{dropoff.text}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-on-surface-variant font-medium text-center px-4">
                Set pickup and drop-off to preview route
              </p>
            )}
          </div>
        </div>
      </main>

      {/* ── Fixed Continue button ─────────────────────────────────── */}
      <div className="fixed bottom-0 w-full max-w-107.5 z-50 px-6 pb-8 pt-4 glass-nav border-t border-outline-variant/10">
        <button
          onClick={handleContinue}
          disabled={loadingEstimate}
          className={`w-full py-4 rounded-full font-headline font-bold text-base flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] ${
            bothSet
              ? 'editorial-gradient text-on-primary shadow-[0_8px_24px_rgba(0,52,24,0.25)]'
              : 'bg-surface-container text-on-surface-variant'
          } disabled:opacity-60`}
        >
          {loadingEstimate ? (
            <>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}
              >
                progress_activity
              </span>
              Getting price…
            </>
          ) : (
            <>
              Continue to Booking
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                arrow_forward
              </span>
            </>
          )}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ScreenWrapper>
  )
}

/* ── Map underlay SVG (shared between bg + preview) ─────────────── */
function MapUnderlay() {
  return (
    <div className="w-full h-full" style={{ backgroundColor: '#e8f0e8' }}>
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ filter: 'grayscale(100%) contrast(90%) brightness(105%) opacity(0.45)' }}
      >
        <defs>
          <pattern id="addr-minor" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#c5d4c5" strokeWidth="0.8" />
          </pattern>
          <pattern id="addr-major" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M 120 0 L 0 0 0 120" fill="none" stroke="#adc4ad" strokeWidth="2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#addr-minor)" />
        <rect width="100%" height="100%" fill="url(#addr-major)" />
        <rect y="22%" width="100%" height="10" fill="#b8ccb8" opacity="0.95" />
        <rect y="50%" width="100%" height="14" fill="#b0c4b0" opacity="0.95" />
        <rect y="76%" width="100%" height="10" fill="#b8ccb8" opacity="0.95" />
        <rect x="18%" y="0" width="10" height="100%" fill="#b8ccb8" opacity="0.95" />
        <rect x="50%" y="0" width="14" height="100%" fill="#b0c4b0" opacity="0.95" />
        <rect x="80%" y="0" width="10" height="100%" fill="#b8ccb8" opacity="0.95" />
        <rect x="2%" y="2%" width="15%" height="18%" fill="#d4e4d4" rx="3" opacity="0.7" />
        <rect x="28%" y="2%" width="20%" height="18%" fill="#cce0cc" rx="3" opacity="0.7" />
        <rect x="60%" y="2%" width="18%" height="18%" fill="#d4e4d4" rx="3" opacity="0.7" />
        <rect x="2%" y="26%" width="14%" height="22%" fill="#cce0cc" rx="3" opacity="0.7" />
        <rect x="28%" y="26%" width="20%" height="22%" fill="#d8e8d8" rx="3" opacity="0.7" />
        <rect x="60%" y="26%" width="18%" height="22%" fill="#cce0cc" rx="3" opacity="0.7" />
      </svg>
    </div>
  )
}
