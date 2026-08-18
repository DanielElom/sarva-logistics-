/**
 * @page AboutPage
 * @description About Sarva — mission, team, version info, and legal links.
 * @route /shared/about
 */
'use client'

import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ScreenWrapper from '@/components/layout/ScreenWrapper'

const STATS = [
  { icon: 'location_on', label: 'Launching in Abuja', sub: 'Serving the FCT first' },
  { icon: 'two_wheeler', label: '10,000+ deliveries', sub: 'Planned at launch' },
  { icon: 'verified', label: 'Verified riders only', sub: 'Every courier screened' },
]

const LEGAL_ITEMS = [
  { icon: 'gavel', label: 'Terms of Service' },
  { icon: 'security', label: 'Privacy Policy' },
  { icon: 'cookie', label: 'Cookie Policy' },
]

const SOCIAL_LINKS = [
  { icon: 'photo_camera', label: 'Instagram' },
  { icon: 'tag', label: 'Twitter / X' },
  { icon: 'work', label: 'LinkedIn' },
]

export default function AboutPage() {
  const router = useRouter()

  return (
    <ScreenWrapper>
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-[#f8faf4]/90 backdrop-blur-lg flex items-center gap-4 px-6 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <button
          onClick={() => router.back()}
          className="p-2 text-primary hover:bg-surface-container-high rounded-full active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
            arrow_back
          </span>
        </button>
        <h1 className="font-['Manrope'] font-bold text-lg text-primary tracking-tight">
          About Sarva
        </h1>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-8 pb-16 space-y-12">
        {/* ── Brand Section ── */}
        <section className="flex flex-col items-center text-center">
          {/* logo */}
          <div className="mb-6 p-5 bg-surface-container-lowest rounded-full shadow-sm">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #003418 0%, #004d26 100%)', transform: 'rotate(6deg)' }}
            >
              <span
                className="material-symbols-outlined text-white"
                style={{ fontVariationSettings: "'FILL' 1", fontSize: '40px', transform: 'rotate(-6deg)' }}
              >
                electric_moped
              </span>
            </div>
          </div>
          <h2 className="font-['Manrope'] font-extrabold text-3xl tracking-tight text-on-surface mb-1">
            Sarva Logistics
          </h2>
          <p className="text-on-surface-variant text-sm font-semibold uppercase tracking-widest mb-3">
            We Grow When You Grow
          </p>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-surface-container-high text-xs font-bold text-on-surface-variant">
              Sarva Logistics v1.0.0
            </span>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-xs font-bold text-primary uppercase tracking-wide">
              Beta
            </span>
          </div>
        </section>

        {/* ── Mission Section ── */}
        <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border-l-4 border-primary">
          <div className="flex items-center gap-3 mb-4">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}
            >
              volunteer_activism
            </span>
            <h3 className="font-['Manrope'] font-bold text-on-surface text-lg">Our Mission</h3>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
            Sarva is building Abuja's most reliable last-mile delivery network — one verified rider at a time. We believe that access to fast, professional logistics should not be a luxury reserved for large corporations.
          </p>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
            "Sarva" means all — everyone, everything, the whole. That is the promise in the name: a delivery network that serves the whole of Abuja, not just the parts that are easy to reach. Every parcel is handled with the care of a skilled craftsman.
          </p>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            From individual senders in Garki to restaurants in Wuse 2, Sarva is designed to serve the full spectrum of Abuja's economy — with transparency, accountability, and community at its core.
          </p>
        </section>

        {/* ── Stats Section ── */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
            By the Numbers
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-surface-container-lowest rounded-xl p-5 flex items-center gap-4 shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}
                  >
                    {stat.icon}
                  </span>
                </div>
                <div>
                  <p className="font-['Manrope'] font-bold text-on-surface">{stat.label}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{stat.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Acknowledgements ── */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
            Built With
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Stack</p>
              <p className="text-sm text-on-surface leading-relaxed">NestJS · Next.js · Prisma · Redis · Socket.io</p>
            </div>
            <div className="bg-surface-container-low p-5 rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Open Source</p>
              <p className="text-sm text-on-surface leading-relaxed">Built on community-driven frameworks with love.</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex items-start gap-4">
            <div className="bg-secondary-container p-3 rounded-xl flex-shrink-0">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
              >
                handshake
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Partners</p>
              <p className="text-sm text-on-surface leading-relaxed">
                Grateful for support from Nigeria's independent rider community and early adopters in Abuja.
              </p>
            </div>
          </div>
        </section>

        {/* ── Legal Section ── */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
            Legal
          </h3>
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden divide-y divide-outline-variant/15">
            {LEGAL_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => toast('Coming soon', { icon: '📄' })}
                className="w-full flex items-center justify-between p-5 hover:bg-surface-container-low active:bg-surface-container transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="material-symbols-outlined text-on-surface-variant"
                    style={{ fontVariationSettings: "'FILL' 0", fontSize: '20px' }}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium text-on-surface">{item.label}</span>
                </div>
                <span
                  className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors"
                  style={{ fontVariationSettings: "'FILL' 0", fontSize: '20px' }}
                >
                  chevron_right
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Social Links ── */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
            Follow Us
          </h3>
          <div className="flex gap-3">
            {SOCIAL_LINKS.map((s) => (
              <button
                key={s.label}
                onClick={() => toast('Coming soon', { icon: '🔗' })}
                className="flex-1 flex flex-col items-center gap-2 py-4 bg-surface-container-lowest rounded-2xl shadow-sm active:scale-95 transition-transform hover:bg-surface-container-low"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 0", fontSize: '20px' }}
                  >
                    {s.icon}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant">{s.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="text-center py-4 space-y-2">
          <p className="text-on-surface font-['Manrope'] font-bold text-sm">
            Built in Nigeria, for Nigeria
          </p>
          <p className="text-xs text-on-surface-variant/60 leading-relaxed">
            © 2026 Sarva Logistics. All rights reserved.
            <br />
            Designed for efficiency, built for the community.
          </p>
        </footer>
      </main>
    </ScreenWrapper>
  )
}
