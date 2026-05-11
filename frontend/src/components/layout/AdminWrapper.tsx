import type { ReactNode } from 'react'

interface AdminWrapperProps {
  children: ReactNode
  className?: string
}

export default function AdminWrapper({ children, className = '' }: AdminWrapperProps) {
  return (
    <div className={`min-h-screen w-full bg-surface flex flex-col ${className}`}>
      {children}
    </div>
  )
}
