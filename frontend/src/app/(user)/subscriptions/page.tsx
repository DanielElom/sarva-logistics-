'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import BottomNav from '@/components/ui/BottomNav'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

interface Plan {
  id: string
  plan: string
  tier?: number
  name: string
  price: number
  durationDays: number
  deliveryLimit: number | null
  description: string
}

interface ActiveSubscription {
  id: string
  plan: string
  tier?: number | null
  price: number
  startDate: string
  endDate: string
  status: string
  autoRenew: boolean
}

type BizRole = 'VENDOR' | 'RESTAURANT' | 'CORPORATE'
type RiderRole = 'RIDER'

function formatPrice(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function planDisplayName(plan: string, tier?: number | null) {
  if (plan === 'BUSINESS_VOLUME') {
    if (tier === 1) return 'Business Starter'
    if (tier === 2) return 'Business Growth'
    if (tier === 3) return 'Business Enterprise'
  }
  if (plan === 'BUSINESS_FLAT') return 'Business Flat Rate'
  if (plan === 'RIDER_WEEKLY') return 'Rider Weekly'
  if (plan === 'RIDER_MONTHLY') return 'Rider Monthly'
  return plan
}

function PlanCard({
  plan,
  isPopular,
  isCurrent,
  subscribing,
  onSubscribe,
}: {
  plan: Plan
  isPopular: boolean
  isCurrent: boolean
  subscribing: boolean
  onSubscribe: (plan: Plan) => void
}) {
  const displayName = planDisplayName(plan.plan, plan.tier)
  const period = plan.durationDays === 7 ? '/week' : '/month'

  return (
    <div
      className={[
        'relative rounded-2xl overflow-hidden transition-all',
        isCurrent
          ? 'border-2 border-primary shadow-lg shadow-primary/10'
          : isPopular
          ? 'border-2 border-primary/40 shadow-md'
          : 'border border-outline-variant/30',
      ].join(' ')}
    >
      {/* popular badge */}
      {isPopular && !isCurrent && (
        <div className="absolute top-0 right-0 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white rounded-bl-xl"
          style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)' }}>
          Most Popular
        </div>
      )}
      {isCurrent && (
        <div className="absolute top-0 right-0 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white bg-primary rounded-bl-xl">
          Current Plan
        </div>
      )}

      <div className={`p-6 ${isPopular ? 'bg-primary/3' : 'bg-surface-container-lowest'}`}>
        {/* icon */}
        <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${isCurrent ? 'bg-primary' : 'bg-surface-container-high'}`}>
          <span
            className={`material-symbols-outlined ${isCurrent ? 'text-white' : 'text-primary'}`}
            style={{ fontVariationSettings: "'FILL' 1", fontSize: '24px' }}
          >
            {plan.plan === 'RIDER_WEEKLY' || plan.plan === 'RIDER_MONTHLY' ? 'electric_moped' : 'business_center'}
          </span>
        </div>

        {/* name + price */}
        <h3 className="font-['Manrope'] font-extrabold text-lg text-on-surface mb-0.5">{displayName}</h3>
        <div className="flex items-baseline gap-1 mb-3">
          <span className="font-['Manrope'] font-extrabold text-3xl text-primary">{formatPrice(plan.price)}</span>
          <span className="text-sm text-on-surface-variant font-medium">{period}</span>
        </div>

        {/* description */}
        <p className="text-sm text-on-surface-variant mb-4">{plan.description}</p>

        {/* feature list */}
        <ul className="space-y-2 mb-6">
          {plan.deliveryLimit !== null ? (
            <li className="flex items-center gap-2 text-sm text-on-surface">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}>check_circle</span>
              Up to {plan.deliveryLimit} deliveries
            </li>
          ) : (
            <li className="flex items-center gap-2 text-sm text-on-surface">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}>all_inclusive</span>
              Unlimited deliveries
            </li>
          )}
          {plan.plan === 'BUSINESS_FLAT' && (
            <li className="flex items-center gap-2 text-sm text-on-surface">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}>check_circle</span>
              Guaranteed fleet bike priority
            </li>
          )}
          {plan.plan === 'RIDER_WEEKLY' && (
            <li className="flex items-center gap-2 text-sm text-on-surface">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}>trending_down</span>
              5% commission (instead of 15%)
            </li>
          )}
          {plan.plan === 'RIDER_MONTHLY' && (
            <li className="flex items-center gap-2 text-sm text-on-surface">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}>trending_down</span>
              0% commission on all orders
            </li>
          )}
          <li className="flex items-center gap-2 text-sm text-on-surface">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}>check_circle</span>
            {plan.durationDays}-day validity
          </li>
          <li className="flex items-center gap-2 text-sm text-on-surface">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}>check_circle</span>
            Paystack secure payment
          </li>
        </ul>

        {/* CTA */}
        {isCurrent ? (
          <div className="w-full py-3.5 rounded-xl font-['Manrope'] font-bold text-sm text-primary bg-primary/8 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}>verified</span>
            Active Plan
          </div>
        ) : (
          <button
            onClick={() => onSubscribe(plan)}
            disabled={subscribing}
            className="w-full py-3.5 rounded-xl font-['Manrope'] font-bold text-sm text-white active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)' }}
          >
            {subscribing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Redirecting…
              </>
            ) : (
              <>Subscribe — {formatPrice(plan.price)}{period}</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export default function SubscriptionsPage() {
  const router = useRouter()
  const role = useAuthStore((s) => s.role)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [plans, setPlans] = useState<Plan[]>([])
  const [activeSub, setActiveSub] = useState<ActiveSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const isBusiness = role === 'VENDOR' || role === 'RESTAURANT' || role === 'CORPORATE'
  const isRider = role === 'RIDER'
  const isIndividual = role === 'INDIVIDUAL'

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/welcome'); return }

    Promise.allSettled([
      api.get<Plan[]>('/subscriptions/plans'),
      api.get<ActiveSubscription>('/subscriptions/me'),
    ]).then(([plansRes, subRes]) => {
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data)
      if (subRes.status === 'fulfilled') setActiveSub(subRes.value.data)
    }).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visiblePlans = plans.filter((p) => {
    if (isRider) return p.plan === 'RIDER_WEEKLY' || p.plan === 'RIDER_MONTHLY'
    if (isBusiness) return p.plan === 'BUSINESS_VOLUME' || p.plan === 'BUSINESS_FLAT'
    return false
  })

  function isCurrentPlan(plan: Plan) {
    if (!activeSub) return false
    if (activeSub.plan !== plan.plan) return false
    if (plan.plan === 'BUSINESS_VOLUME' && activeSub.tier !== plan.tier) return false
    return true
  }

  function isPopularPlan(plan: Plan) {
    if (plan.plan === 'BUSINESS_VOLUME' && plan.tier === 2) return true
    if (plan.plan === 'RIDER_MONTHLY') return true
    return false
  }

  async function handleSubscribe(plan: Plan) {
    if (activeSub) {
      toast.error('Cancel your current plan first before switching.')
      return
    }
    setSubscribing(true)
    try {
      const payload: { planType: string; tier?: number } = { planType: plan.plan }
      if (plan.plan === 'BUSINESS_VOLUME' && plan.tier) payload.tier = plan.tier
      const { data } = await api.post<{ paymentUrl: string }>('/subscriptions/subscribe', payload)
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        toast.success('Subscription activated!')
        const { data: sub } = await api.get<ActiveSubscription>('/subscriptions/me')
        setActiveSub(sub)
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not initiate payment'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
      setSubscribing(false)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      await api.post('/subscriptions/cancel')
      toast.success('Subscription cancelled')
      setActiveSub(null)
      setShowCancelConfirm(false)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not cancel subscription'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <ScreenWrapper>
      <header className="sticky top-0 z-30 bg-[#f8faf4] flex items-center gap-4 px-6 py-4 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <button onClick={() => router.back()} className="p-2 text-primary active:scale-95 transition-transform">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_back</span>
        </button>
        <div>
          <h1 className="font-['Manrope'] font-bold text-lg text-primary leading-tight">Subscription Plans</h1>
          {activeSub && (
            <p className="text-xs text-green-600 font-semibold">{daysUntil(activeSub.endDate)} days remaining</p>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-6 pb-32 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : isIndividual ? (
          /* Individual — no subscription needed */
          <div className="flex flex-col items-center text-center py-16 space-y-5">
            <div className="w-20 h-20 rounded-2xl bg-primary/8 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1", fontSize: '40px' }}>person_check</span>
            </div>
            <div>
              <h2 className="font-['Manrope'] font-extrabold text-2xl text-on-surface mb-2">No Subscription Needed</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed max-w-xs mx-auto">
                As an individual user, you pay per delivery — no monthly fees. Book a delivery whenever you need it.
              </p>
            </div>
            <button
              onClick={() => router.push('/home')}
              className="px-8 py-3.5 rounded-xl font-['Manrope'] font-bold text-white active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)' }}
            >
              Book a Delivery
            </button>
          </div>
        ) : (
          <>
            {/* active subscription banner */}
            {activeSub && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>workspace_premium</span>
                    </div>
                    <div>
                      <p className="font-['Manrope'] font-bold text-on-surface text-sm">
                        {planDisplayName(activeSub.plan, activeSub.tier)}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Renews {new Date(activeSub.endDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full flex-shrink-0">Active</span>
                </div>

                {!showCancelConfirm ? (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="mt-4 w-full py-2.5 rounded-xl text-xs font-bold text-error bg-error/8 active:scale-[0.99] transition-all"
                  >
                    Cancel Subscription
                  </button>
                ) : (
                  <div className="mt-4 bg-error/5 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-on-surface font-semibold">Cancel your subscription? You'll lose access at the end of the billing period.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-on-surface bg-surface-container-high active:scale-95"
                      >
                        Keep Plan
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-error active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {cancelling && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                        {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* intro text */}
            <div>
              <h2 className="font-['Manrope'] font-extrabold text-2xl text-on-surface mb-1">
                {isRider ? 'Rider Plans' : 'Business Plans'}
              </h2>
              <p className="text-sm text-on-surface-variant">
                {isRider
                  ? 'Reduce your commission and keep more of what you earn.'
                  : 'Scale your deliveries with a plan that fits your volume.'}
              </p>
            </div>

            {/* payment note */}
            <div className="flex items-center gap-3 px-4 py-3.5 bg-surface-container-low rounded-xl">
              <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>lock</span>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Payments are processed securely via <span className="font-bold text-on-surface">Paystack</span>. You'll be redirected to complete payment.
              </p>
            </div>

            {/* plan cards */}
            <div className="space-y-4">
              {visiblePlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isPopular={isPopularPlan(plan)}
                  isCurrent={isCurrentPlan(plan)}
                  subscribing={subscribing}
                  onSubscribe={handleSubscribe}
                />
              ))}
            </div>

            {/* FAQ hint */}
            <div className="flex items-start gap-3 px-4 py-4 bg-surface-container-low rounded-xl">
              <span className="material-symbols-outlined text-tertiary flex-shrink-0 mt-0.5" style={{ fontSize: '20px' }}>help_outline</span>
              <div>
                <p className="text-xs font-bold text-on-surface mb-0.5">Have questions about plans?</p>
                <button
                  onClick={() => router.push('/shared/support')}
                  className="text-xs text-primary font-bold underline underline-offset-2"
                >
                  Visit our Support Center
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </ScreenWrapper>
  )
}
