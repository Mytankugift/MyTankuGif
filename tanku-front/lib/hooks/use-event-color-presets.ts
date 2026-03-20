'use client'

import { useCallback, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

export type EventColorPreset = { id: string; label: string; hex: string }

export type SavePresetsResult =
  | { ok: true; presets: EventColorPreset[] }
  | { ok: false; error: string }

export function useEventColorPresets() {
  const { isAuthenticated } = useAuthStore()
  const [presets, setPresets] = useState<EventColorPreset[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadPresets = useCallback(async () => {
    if (!isAuthenticated) {
      setPresets([])
      return
    }
    setIsLoading(true)
    try {
      const res = await apiClient.get<{ presets: EventColorPreset[] }>(
        API_ENDPOINTS.EVENTS.COLOR_PRESETS
      )
      if (res.success && res.data && Array.isArray(res.data.presets)) {
        setPresets(res.data.presets)
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  const savePresets = useCallback(
    async (next: EventColorPreset[]): Promise<SavePresetsResult> => {
      if (!isAuthenticated) {
        return { ok: false, error: 'Inicia sesión para guardar tipos' }
      }
      const res = await apiClient.put<{ presets: EventColorPreset[] }>(
        API_ENDPOINTS.EVENTS.COLOR_PRESETS,
        { presets: next }
      )
      if (res.success && res.data && Array.isArray(res.data.presets)) {
        setPresets(res.data.presets)
        return { ok: true, presets: res.data.presets }
      }
      return {
        ok: false,
        error: res.error?.message ?? 'No se pudo guardar el tipo',
      }
    },
    [isAuthenticated]
  )

  return { presets, loadPresets, savePresets, isLoading }
}
