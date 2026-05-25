'use client'

import type { ReactNode } from 'react'

/** Ancho completo bajo el nav (sin max-w-7xl). */
export const ADMIN_PAGE_X = 'w-full px-4 sm:px-6 lg:px-8'

export function AdminPageShell({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-gradient-to-br from-gray-50 to-gray-100 ${className}`}>
      <div className={`${ADMIN_PAGE_X} py-6 pb-10`}>{children}</div>
    </div>
  )
}
