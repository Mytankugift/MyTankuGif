'use client'

import type { ReactNode } from 'react'

import { AdminPageShell } from './AdminPageShell'

/** Contenedor unificado para subpáginas de /settings (nav en layout, scroll en main). */
export function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  return <AdminPageShell className="space-y-6">{children}</AdminPageShell>
}
