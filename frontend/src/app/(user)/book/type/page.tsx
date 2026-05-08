'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import { useAuthStore } from '@/stores/auth.store'
import { useBookingStore, type DeliveryType } from '@/stores/booking.store'

/* ─────────────────────────────────────────────────────────────── */
/*  Page                                                           */
/* ─────────────────────────────────────────────────────────────── */
export default function BookTypePage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const setDeliveryType = useBookingStore((s) => s.setDeliveryType)
  const storedType = useBookingStore((s) => s.deliveryType)

  const [selected, setSelected] = useState<DeliveryType | null>(storedType)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // Next 7 days (starting tomorrow) — computed once
  const days = useMemo<{ label: string; value: string }[]>(() => {
    const result = []
    for (let i = 1; i <= 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      result.push({
        label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
        value: d.toISOString().split('T')[0],
      })
    }
    return result
  }, [])

  // 30-minute slots from 06:00 to 22:00
  const timeSlots = useMemo<{ label: string; value: string }[]>(() => {
    const result = []
    for (let h = 6; h <= 22; h++) {
      for (const m of [0, 30]) {
        if (h === 22 && m === 30) break
        const value = `${String(h).padStart(2, '0')}:${m === 0 ? '00' : '30'}`
        const label = new Date(`2000-01-01T${value}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        result.push({ label, value })
      }
    }
    return result
  }, [])

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (role === 'RIDER') { router.replace('/rider/home'); return }
    if (role === 'ADMIN') { router.replace('/admin/dashboard'); return }
  }, [isAuthenticated, role, router])

  if (!isAuthenticated || role === 'RIDER' || role === 'ADMIN') return null

  function handleContinue() {
    if (!selected) {
      toast.error('Please select a delivery type')
      return
    }
    if (selected === 'SCHEDULED') {
      if (!selectedDate || !selectedTime) {
        toast.error('Please select a date and time')
        return
      }
      const scheduledFor = new Date(`${selectedDate}T${selectedTime}:00`).toISOString()
      setDeliveryType(selected, scheduledFor)
    } else {
      setDeliveryType(selected)
    }
    router.push('/book/address')
  }

  const canContinue =
    selected !== null &&
    (selected !== 'SCHEDULED' || (!!selectedDate && !!selectedTime))

  return (
    <ScreenWrapper>
      {/* ── Fixed header ─────────────────────────────────────────── */}
      <header className="fixed top-0 w-full max-w-107.5 z-50 flex items-center gap-3 px-6 h-16 bg-surface border-b border-outline-variant/10">
        <button
          onClick={() => router.push('/home')}
          className="p-1.5 -ml-1.5 rounded-full active:scale-90 transition-transform active:bg-surface-container"
          aria-label="Back to home"
        >
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>
            arrow_back
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.18em]">
            STEP 01
          </p>
          <h1 className="font-headline font-bold text-base text-on-surface leading-tight tracking-tight truncate">
            Book a Delivery
          </h1>
        </div>

        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-on-primary" style={{ fontSize: '18px' }}>
            local_shipping
          </span>
        </div>
      </header>

      {/* ── Scrollable body ───────────────────────────────────────── */}
      <main className="pt-16 pb-36 px-6">
        {/* Section heading */}
        <div className="pt-8 mb-8">
          <h2 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight mb-2">
            Select service
          </h2>
          <p className="text-on-surface-variant font-medium text-sm leading-relaxed">
            Choose how you want your items moved across the city.
          </p>
        </div>

        {/* ── Delivery type cards ───────────────────────────────────── */}
        <div className="space-y-4">

          {/* ON_DEMAND */}
          <TypeCard
            isSelected={selected === 'ON_DEMAND'}
            onSelect={() => setSelected('ON_DEMAND')}
            icon="bolt"
            iconBgDefault="bg-primary-container/10"
            iconBgSelected="bg-primary-container/25"
            iconColorDefault="text-primary"
            iconColorSelected="text-primary"
            badgeLabel="Lightning speed"
            badgeClassDefault="bg-primary text-on-primary"
            badgeClassSelected="bg-primary text-on-primary"
            title="On-demand"
            description="Direct point-to-point delivery. No stops, just speed."
            footerIcon="schedule"
            footerTextDefault="Pickup in 8 – 12 mins"
            footerTextSelected="Available now · Riders nearby · Standard pricing"
          />

          {/* SCHEDULED */}
          <TypeCard
            isSelected={selected === 'SCHEDULED'}
            onSelect={() => setSelected('SCHEDULED')}
            icon="calendar_today"
            iconBgDefault="bg-surface-container-low"
            iconBgSelected="bg-primary-container/20"
            iconColorDefault="text-on-surface-variant"
            iconColorSelected="text-primary"
            badgeLabel="Choose a time"
            badgeClassDefault="bg-surface-container-high text-on-surface-variant"
            badgeClassSelected="bg-primary text-on-primary"
            title="Scheduled"
            description="Book up to 7 days in advance. Perfect for planned events."
            footerIcon="event_available"
            footerTextDefault="Available 24/7"
            footerTextSelected="Book in advance · Guaranteed rider · Standard pricing"
          />

          {/* SAME_DAY */}
          <TypeCard
            isSelected={selected === 'SAME_DAY'}
            onSelect={() => setSelected('SAME_DAY')}
            icon="eco"
            iconBgDefault="bg-secondary-container/30"
            iconBgSelected="bg-secondary-container/60"
            iconColorDefault="text-secondary"
            iconColorSelected="text-primary"
            badgeLabel="Economical"
            badgeClassDefault="bg-secondary-container text-on-secondary-container"
            badgeClassSelected="bg-primary text-on-primary"
            title="Same-day"
            description="Delivered by EOD. Our most sustainable and cost-effective option."
            footerIcon="local_shipping"
            footerTextDefault="Pickup by 2:00 PM"
            footerTextSelected="Delivered today · Priority handling · Standard pricing"
          />
        </div>

        {/* ── Scheduled date / time picker ─────────────────────────── */}
        {selected === 'SCHEDULED' && (
          <div className="mt-5 rounded-2xl overflow-hidden border border-outline-variant/20 bg-surface-container-low">
            <div className="px-5 pt-5 pb-4">
              <h3 className="font-headline font-bold text-base text-on-surface flex items-center gap-2 mb-5">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                >
                  calendar_month
                </span>
                When do you need delivery?
              </h3>

              {/* Date row */}
              <div className="mb-5">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.16em] mb-3">
                  Date
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {days.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => setSelectedDate(day.value)}
                      className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 ${
                        selectedDate === day.value
                          ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                          : 'bg-surface border border-outline-variant/40 text-on-surface-variant'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time grid */}
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.16em] mb-3">
                  Time
                </p>
                <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.value}
                      onClick={() => setSelectedTime(slot.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95 ${
                        selectedTime === slot.value
                          ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                          : 'bg-surface border border-outline-variant/40 text-on-surface-variant'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confirmation pill */}
              {selectedDate && selectedTime && (
                <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/[0.08] border border-primary/20">
                  <span
                    className="material-symbols-outlined text-primary shrink-0"
                    style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <span className="text-xs font-semibold text-primary">
                    {new Date(`${selectedDate}T${selectedTime}:00`).toLocaleString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tracking Excellence banner ───────────────────────────── */}
        <section className="mt-8">
          <div className="bg-surface-container-low rounded-xl overflow-hidden relative h-32 flex items-center px-6 border border-outline-variant/10">
            {/* Subtle map texture */}
            <div
              className="absolute inset-0 opacity-[0.07] bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAZEGym_VRabioAegNSDDiH6b1EsFKo9PdkDlPyi5hgousdE5u7FN0U8-wVVdgVnVxNasRZl9eIjhgKOIMbUdddLyc26tXTB4d47F_C_jeebUmWXOzzfnKWny5JyovFpWafB4eGsTnEsdCXB7_wlFl800C83puKAM8RB1ugYg0watxgDcgGu2pG8aXScFgqZ106UP3oUw41foEGtFTjOZ19YxWNZ39FYpjitT_GQECP9cqnY17tLzbQ42AvhX1VHK87r3zBGd6WujQ')",
              }}
            />
            <div className="relative z-10">
              <h4 className="font-headline font-bold text-lg text-on-surface">
                Tracking Excellence
              </h4>
              <p className="text-xs text-on-surface-variant max-w-[200px] mt-0.5 leading-relaxed">
                Real-time GPS tracking included with every service tier.
              </p>
            </div>
            <div className="ml-auto relative z-10 shrink-0">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  location_on
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Fixed Continue button ─────────────────────────────────── */}
      <div className="fixed bottom-0 w-full max-w-107.5 z-50 px-6 pb-8 pt-4 glass-nav border-t border-outline-variant/10">
        <button
          onClick={handleContinue}
          className={`w-full py-4 rounded-full font-headline font-bold text-base flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] ${
            canContinue
              ? 'editorial-gradient text-on-primary shadow-[0_8px_24px_rgba(0,52,24,0.25)]'
              : 'bg-surface-container text-on-surface-variant'
          }`}
        >
          Continue
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            arrow_forward
          </span>
        </button>
      </div>
    </ScreenWrapper>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/*  TypeCard sub-component                                         */
/* ─────────────────────────────────────────────────────────────── */
interface TypeCardProps {
  isSelected: boolean
  onSelect: () => void
  icon: string
  iconBgDefault: string
  iconBgSelected: string
  iconColorDefault: string
  iconColorSelected: string
  badgeLabel: string
  badgeClassDefault: string
  badgeClassSelected: string
  title: string
  description: string
  footerIcon: string
  footerTextDefault: string
  footerTextSelected: string
}

function TypeCard({
  isSelected,
  onSelect,
  icon,
  iconBgDefault,
  iconBgSelected,
  iconColorDefault,
  iconColorSelected,
  badgeLabel,
  badgeClassDefault,
  badgeClassSelected,
  title,
  description,
  footerIcon,
  footerTextDefault,
  footerTextSelected,
}: TypeCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className="relative group cursor-pointer active:scale-[0.98] transition-all duration-200 focus:outline-none"
    >
      {/* Hover glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container rounded-xl opacity-0 group-hover:opacity-[0.04] group-active:opacity-[0.08] transition-opacity pointer-events-none" />

      <div
        className={`relative bg-surface-container-lowest p-6 rounded-xl border-2 flex flex-col gap-4 shadow-sm transition-all duration-200 ${
          isSelected
            ? 'border-primary'
            : 'border-transparent hover:border-primary/20'
        }`}
        style={isSelected ? { boxShadow: '0 0 0 3px rgba(0,52,24,0.07), 0 1px 3px rgba(0,0,0,0.06)' } : undefined}
      >
        {/* Top row: icon + badge */}
        <div className="flex justify-between items-start">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-200 ${
              isSelected ? iconBgSelected : iconBgDefault
            }`}
          >
            <span
              className={`material-symbols-outlined font-bold transition-colors duration-200 ${
                isSelected ? iconColorSelected : iconColorDefault
              }`}
              style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {icon}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isSelected && (
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-full font-label text-[10px] font-bold uppercase tracking-widest transition-colors duration-200 ${
                isSelected ? badgeClassSelected : badgeClassDefault
              }`}
            >
              {badgeLabel}
            </span>
          </div>
        </div>

        {/* Title + description */}
        <div>
          <h3 className="font-headline font-bold text-xl text-on-surface">{title}</h3>
          <p className="text-on-surface-variant text-sm mt-1 leading-relaxed">{description}</p>
        </div>

        {/* Footer row */}
        <div
          className={`flex items-center gap-2 pt-2 border-t transition-colors duration-200 ${
            isSelected ? 'border-primary/20' : 'border-surface-container-low'
          }`}
        >
          <span
            className={`material-symbols-outlined transition-colors duration-200 ${
              isSelected ? 'text-primary' : 'text-on-surface-variant'
            }`}
            style={{ fontSize: '16px' }}
          >
            {footerIcon}
          </span>
          <span
            className={`text-xs font-semibold transition-colors duration-200 ${
              isSelected ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            {isSelected ? footerTextSelected : footerTextDefault}
          </span>
        </div>
      </div>
    </div>
  )
}
