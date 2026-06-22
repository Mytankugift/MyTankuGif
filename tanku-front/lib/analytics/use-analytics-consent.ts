'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { setTrackingEnabled } from './tracker'

/**
 * Sincroniza el gate del SDK de tracking con el consentimiento real (`UserConsent`).
 * - Usuario autenticado: permitido solo si NO tiene pendiente aceptar la política
 *   de datos (`requiresDataPolicyAcceptance !== true`).
 * - Anónimo: permitido (uso general del sitio / feed público).
 * Montar una vez en el layout principal.
 */
export function useAnalyticsConsent(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    const requiresAcceptance = (user as { requiresDataPolicyAcceptance?: boolean } | null)
      ?.requiresDataPolicyAcceptance
    const allowed = !isAuthenticated || requiresAcceptance !== true
    setTrackingEnabled(allowed)
  }, [isAuthenticated, user])
}
