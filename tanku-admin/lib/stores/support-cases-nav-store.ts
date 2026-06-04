'use client'

import { create } from 'zustand'

export type SupportCasesViewMode = 'table' | 'kanban'

interface SupportCasesNavState {
  viewMode: SupportCasesViewMode
  setViewMode: (mode: SupportCasesViewMode) => void
}

export const useSupportCasesNavStore = create<SupportCasesNavState>((set) => ({
  viewMode: 'table',
  setViewMode: (viewMode) => set({ viewMode }),
}))
