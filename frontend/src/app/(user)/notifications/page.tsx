/**
 * @page NotificationsPage
 * @description In-app notification center — order updates, payment confirmations, system alerts.
 * @route /notifications
 */
'use client'

import { useRouter } from 'next/navigation'
import ScreenWrapper from '@/components/layout/ScreenWrapper'
import BottomNav from '@/components/ui/BottomNav'

export default function NotificationsPage() {
  const router = useRouter()
  return (
    <ScreenWrapper>
      <header className="sticky top-0 z-30 bg-[#f8faf4] flex items-center gap-4 px-6 py-4">
        <button onClick={() => router.back()} className="p-2 text-primary active:scale-95">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_back</span>
        </button>
        <h1 className="font-['Manrope'] font-bold text-lg text-primary">Notifications</h1>
      </header>
      <main className="flex flex-col items-center justify-center h-[70vh] px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1", fontSize: '32px' }}>notifications</span>
        </div>
        <h2 className="font-['Manrope'] font-bold text-on-surface mb-2">Notifications</h2>
        <p className="text-sm text-on-surface-variant">Push notifications coming soon.</p>
      </main>
      <BottomNav />
    </ScreenWrapper>
  )
}
