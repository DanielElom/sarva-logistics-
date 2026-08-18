/**
 * @page SupportPage
 * @description Customer support page — FAQs, contact channels, and dispute filing.
 * @route /shared/support
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import BottomNav from '@/components/ui/BottomNav'

// ── FAQ Data ─────────────────────────────────────────────────────────────────

const FAQ_SECTIONS = [
  {
    category: 'Delivery & Booking',
    icon: 'two_wheeler',
    items: [
      {
        q: 'How do I book a delivery?',
        a: 'Tap "Book New Delivery" on the home screen, choose your delivery type (On Demand, Scheduled, or Same Day), set your pickup and dropoff addresses, then confirm your booking. A rider will be matched to you in under 5 minutes.',
      },
      {
        q: 'Can I cancel a booking after placing it?',
        a: 'Yes — you can cancel a delivery for free before a rider has been assigned. Once a rider is en route to your pickup, a cancellation fee may apply depending on how far along the rider is.',
      },
      {
        q: 'What items are not allowed for delivery?',
        a: 'We do not carry hazardous materials, illegal items, live animals, or items that exceed 30 kg in weight or require special temperature control. For large cargo, contact our business team.',
      },
    ],
  },
  {
    category: 'Payments & Pricing',
    icon: 'payments',
    items: [
      {
        q: 'How is the delivery price calculated?',
        a: 'Pricing is based on distance, delivery type, and current demand. You will always see the estimated price before confirming your booking. Surge pricing applies during peak hours.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'We accept Cash on Delivery, Card, OPay, and Bank Transfer. You can set your preferred payment method in Settings or choose at checkout. Card and OPay payments are processed securely.',
      },
      {
        q: 'How do I get a refund?',
        a: 'If your delivery failed due to a rider error or platform issue, contact support within 48 hours. Refunds are processed within 3–5 business days back to your original payment method.',
      },
    ],
  },
  {
    category: 'Account & Profile',
    icon: 'person',
    items: [
      {
        q: 'How do I update my name or email?',
        a: 'Go to Profile → tap "Edit" in the top-right corner. You can update your full name and email address. Your phone number is tied to your account and cannot be changed directly — contact support if needed.',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'On the login screen, tap "Forgot Password". Enter your registered phone number and we will send an OTP to reset your password. If you never set a password, you can log in with OTP instead.',
      },
      {
        q: 'Can I have multiple accounts?',
        a: 'Each phone number can only be linked to one Sarva account. If you need a business account in addition to a personal account, contact us to discuss multi-account options.',
      },
    ],
  },
  {
    category: 'Rider Issues',
    icon: 'electric_moped',
    items: [
      {
        q: 'My rider is late or not moving — what do I do?',
        a: 'You can contact your rider directly through the in-app chat or call feature on the tracking screen. If your rider is unreachable for more than 10 minutes with no movement, tap "There\'s a Problem" on the confirm delivery screen to raise a dispute.',
      },
      {
        q: 'How do I report a bad rider experience?',
        a: 'After your delivery, use the rating screen to leave a star rating and comment. For serious incidents, go to the support screen and submit an issue report under "Rider Complaint". Our team reviews all complaints within 24 hours.',
      },
    ],
  },
]

const ISSUE_CATEGORIES = [
  'Delivery Issue',
  'Payment Issue',
  'Account Issue',
  'Rider Complaint',
  'Other',
]

// ── FAQ Item ──────────────────────────────────────────────────────────────────

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b border-outline-variant/20 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-4 py-4 text-left active:opacity-70 transition-opacity"
      >
        <span className="text-sm font-semibold text-on-surface leading-snug">{question}</span>
        <span
          className={`material-symbols-outlined text-on-surface-variant flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ fontVariationSettings: "'FILL' 0", fontSize: '20px' }}
        >
          expand_more
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-sm text-on-surface-variant leading-relaxed pb-4">{answer}</p>
      </div>
    </div>
  )
}

// ── Contact Card ──────────────────────────────────────────────────────────────

function ContactCard({
  icon,
  title,
  subtitle,
  onClick,
  accent,
}: {
  icon: string
  title: string
  subtitle: string
  onClick: () => void
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-4 p-5 rounded-2xl transition-all active:scale-[0.98] text-left w-full',
        accent
          ? 'bg-primary text-white shadow-[0_8px_24px_rgba(0,52,24,0.2)]'
          : 'bg-surface-container-lowest border border-outline-variant/20 hover:bg-surface-container-low',
      ].join(' ')}
    >
      <div
        className={[
          'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
          accent ? 'bg-white/20' : 'bg-primary/10',
        ].join(' ')}
      >
        <span
          className={`material-symbols-outlined ${accent ? 'text-white' : 'text-primary'}`}
          style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}
        >
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <p className={`font-['Manrope'] font-bold text-sm ${accent ? 'text-white' : 'text-on-surface'}`}>
          {title}
        </p>
        <p className={`text-xs mt-0.5 truncate ${accent ? 'text-white/70' : 'text-on-surface-variant'}`}>
          {subtitle}
        </p>
      </div>
      {accent && (
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
          <span className="text-[10px] text-white/80 font-bold">Live</span>
        </div>
      )}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const router = useRouter()

  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const [issueCategory, setIssueCategory] = useState('')
  const [issueDesc, setIssueDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function toggleFaq(key: string) {
    setOpenFaq((prev) => (prev === key ? null : key))
  }

  async function handleSubmit() {
    if (!issueCategory) { toast.error('Please select an issue category'); return }
    if (!issueDesc.trim()) { toast.error('Please describe your issue'); return }
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 800))
    setSubmitting(false)
    setIssueCategory('')
    setIssueDesc('')
    toast.success('Report submitted. We will get back to you within 24 hours.')
  }

  return (
    <ScreenWrapper>
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-[#f8faf4]/90 backdrop-blur-lg flex justify-between items-center px-6 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-primary hover:bg-surface-container-high rounded-full active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
              arrow_back
            </span>
          </button>
          <h1 className="font-['Manrope'] font-bold text-lg text-primary tracking-tight">
            Support Center
          </h1>
        </div>
        <button className="relative p-2 text-primary hover:bg-surface-container-high rounded-full active:scale-95 transition-transform">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0", fontSize: '24px' }}>
            notifications
          </span>
        </button>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-6 pb-32 space-y-10">
        {/* ── Hero ── */}
        <section>
          <h2 className="font-['Manrope'] font-extrabold text-3xl text-on-surface tracking-tight mb-2">
            What do you need help with?
          </h2>
          <p className="text-on-surface-variant">
            Browse our knowledge base or reach out to our support team.
          </p>
        </section>

        {/* ── Contact Options ── */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Contact Us
          </h3>
          <ContactCard
            icon="support_agent"
            title="Live Chat"
            subtitle="Usually replies in 2 minutes"
            accent
            onClick={() => toast('Live chat coming soon', { icon: '💬' })}
          />
          <div className="grid grid-cols-2 gap-3">
            <ContactCard
              icon="mail"
              title="Email Support"
              subtitle="support@sarvalogistics.ng"
              onClick={() => window.open('mailto:support@sarvalogistics.ng')}
            />
            <ContactCard
              icon="call"
              title="Call Support"
              subtitle="+234 800 FAIRRIDE"
              onClick={() => window.open('tel:+2348003247743')}
            />
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="space-y-5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Frequently Asked Questions
          </h3>
          {FAQ_SECTIONS.map((section) => (
            <div key={section.category} className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
              {/* section header */}
              <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                  >
                    {section.icon}
                  </span>
                </div>
                <p className="font-['Manrope'] font-bold text-on-surface">{section.category}</p>
              </div>
              <div className="px-5 pb-2">
                {section.items.map((item, i) => {
                  const key = `${section.category}-${i}`
                  return (
                    <FaqItem
                      key={key}
                      question={item.q}
                      answer={item.a}
                      isOpen={openFaq === key}
                      onToggle={() => toggleFaq(key)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </section>

        {/* ── Report an Issue ── */}
        <section className="bg-surface-container-low rounded-2xl p-6 relative overflow-hidden">
          {/* decorative */}
          <div className="absolute -right-10 -bottom-10 opacity-[0.04] pointer-events-none select-none">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '140px', fontVariationSettings: "'FILL' 1" }}>
              mail
            </span>
          </div>

          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}
              >
                report
              </span>
              <h3 className="font-['Manrope'] font-bold text-xl text-on-surface">Report an Issue</h3>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Can't find what you're looking for? Describe your issue and our team will get back to you within 24 hours.
            </p>

            {/* category */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">
                Issue Category
              </label>
              <select
                value={issueCategory}
                onChange={(e) => setIssueCategory(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 focus:border-primary/40 focus:outline-none text-sm text-on-surface appearance-none transition-colors"
              >
                <option value="">Select a category…</option>
                {ISSUE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* description */}
            <div>
              <div className="flex justify-between items-end mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Description
                </label>
                <span className="text-[10px] text-on-surface-variant">{issueDesc.length}/500</span>
              </div>
              <textarea
                value={issueDesc}
                onChange={(e) => { if (e.target.value.length <= 500) setIssueDesc(e.target.value) }}
                placeholder="Describe your issue in detail…"
                rows={4}
                className="w-full px-4 py-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 focus:border-primary/40 focus:outline-none text-sm text-on-surface resize-none transition-colors placeholder:text-outline"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !issueCategory || !issueDesc.trim()}
              className="w-full py-4 rounded-xl font-['Manrope'] font-bold text-white text-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)' }}
            >
              {submitting && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </section>
      </main>

      {/* ── Floating Live Chat FAB ── */}
      <div className="fixed bottom-24 right-6 z-40">
        <button
          onClick={() => toast('Live chat coming soon', { icon: '💬' })}
          className="flex items-center gap-3 bg-primary text-white pl-4 pr-5 py-3.5 rounded-full shadow-[0_12px_48px_rgba(0,52,24,0.3)] hover:scale-105 active:scale-95 transition-all"
        >
          <div className="bg-primary-container p-1.5 rounded-full">
            <span
              className="material-symbols-outlined text-white"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
            >
              support_agent
            </span>
          </div>
          <span className="font-bold text-sm">Live Chat</span>
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
        </button>
      </div>

      <BottomNav />
    </ScreenWrapper>
  )
}
