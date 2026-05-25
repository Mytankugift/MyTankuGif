'use client'

import { create } from 'zustand'

export type DetailNavActionVariant = 'default' | 'primary' | 'danger' | 'muted'

export interface DetailNavAction {
  id: string
  label: string
  variant?: DetailNavActionVariant
  disabled?: boolean
  onClick: () => void
}

interface AdminDetailNavState {
  title: string | null
  subtitle: string | null
  actions: DetailNavAction[]
  setDetailNav: (payload: {
    title: string
    subtitle?: string | null
    actions?: DetailNavAction[]
  }) => void
  patchDetailNav: (
    patch: Partial<Pick<AdminDetailNavState, 'title' | 'subtitle' | 'actions'>>
  ) => void
  clearDetailNav: () => void
}

export const useAdminDetailNavStore = create<AdminDetailNavState>((set) => ({
  title: null,
  subtitle: null,
  actions: [],
  setDetailNav: ({ title, subtitle = null, actions = [] }) =>
    set({ title, subtitle, actions }),
  patchDetailNav: (patch) => set(patch),
  clearDetailNav: () => set({ title: null, subtitle: null, actions: [] }),
}))
