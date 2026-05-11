import type { ReactNode } from 'react'

interface ScreenWrapperProps {
  children: ReactNode
  className?: string
}

export default function ScreenWrapper({ children, className = '' }: ScreenWrapperProps) {
  return (
    <div className="min-h-screen w-full flex justify-center bg-surface">
      <div className={`relative w-full max-w-107.5 min-h-screen bg-surface overflow-x-hidden ${className}`}>
        {children}
      </div>
    </div>
  )
}
