'use client'

import { createContext, useContext } from 'react'

export const StalkerGiftMisRefreshKeyContext = createContext(0)

export function useStalkerGiftMisRefreshKey() {
  return useContext(StalkerGiftMisRefreshKeyContext)
}
