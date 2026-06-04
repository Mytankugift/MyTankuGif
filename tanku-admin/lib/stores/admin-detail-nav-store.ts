'use client'

import { create } from 'zustand'

export type DetailNavActionVariant = 'default' | 'primary' | 'danger' | 'muted'

export interface DetailNavAction {
  id: string
  label: string
  variant?: DetailNavActionVariant
  disabled?: boolean
  /** Tooltip nativo del botón (p. ej. por qué está deshabilitado). */
  title?: string
  onClick: () => void
}

export interface DetailNavStatusBadge {
  label: string
  className: string
}

interface AdminDetailNavState {
  title: string | null
  subtitle: string | null
  /** Código visible del caso en breadcrumb (ej. #Y9LOS50F). */
  caseCode: string | null
  statusBadge: DetailNavStatusBadge | null
  actions: DetailNavAction[]
  setDetailNav: (payload: {
    title?: string | null
    subtitle?: string | null
    caseCode?: string | null
    statusBadge?: DetailNavStatusBadge | null
    actions?: DetailNavAction[]
  }) => void
  patchDetailNav: (
    patch: Partial<
      Pick<AdminDetailNavState, 'title' | 'subtitle' | 'caseCode' | 'statusBadge' | 'actions'>
    >
  ) => void
  clearDetailNav: () => void
}

export const useAdminDetailNavStore = create<AdminDetailNavState>((set) => ({
  title: null,
  subtitle: null,
  caseCode: null,
  statusBadge: null,
  actions: [],
  setDetailNav: (payload) =>
    set((prev) => ({
      title: payload.title !== undefined ? payload.title : prev.title,
      subtitle: payload.subtitle !== undefined ? payload.subtitle : prev.subtitle,
      caseCode: payload.caseCode !== undefined ? payload.caseCode : prev.caseCode,
      statusBadge: payload.statusBadge !== undefined ? payload.statusBadge : prev.statusBadge,
      actions: payload.actions !== undefined ? payload.actions : prev.actions,
    })),
  patchDetailNav: (patch) => set(patch),
  clearDetailNav: () =>
    set({ title: null, subtitle: null, caseCode: null, statusBadge: null, actions: [] }),
}))
