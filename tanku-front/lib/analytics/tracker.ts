'use client'

/**
 * SDK ligero de tracking de comportamiento.
 * - Encola eventos y los envía en lotes (por tamaño o tiempo).
 * - Flush forzado al ocultar/cerrar la pestaña vía sendBeacon (fallback fetch keepalive).
 * - sessionId persistido en sessionStorage; userId lo infiere el backend del token.
 * - Gate de consentimiento (isTrackingAllowed).
 * Ver _meta/tracking-eventos.md.
 */

import { logger } from '@/lib/utils/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'
const ENDPOINT = '/api/v1/analytics/events'
const FLUSH_INTERVAL_MS = 5000
const MAX_QUEUE = 20
const SESSION_KEY = 'tanku_session_id'
const CONSENT_KEY = 'tanku_tracking_consent'

export interface TrackPayload {
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

interface QueuedEvent extends TrackPayload {
  eventType: string
  ts: number
}

let queue: QueuedEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let listenersBound = false

// Gate de consentimiento en runtime. Lo sincroniza `useAnalyticsConsent` con el
// `UserConsent` real (DATA_TREATMENT): se desactiva para usuarios autenticados
// que aún no aceptaron la política. Por defecto permitido (anónimos / pre-hidratación).
let runtimeEnabled = true

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Habilita/inhabilita el tracking según el consentimiento real del usuario.
 * Lo invoca `useAnalyticsConsent` (ver lib/analytics/use-analytics-consent.ts).
 */
export function setTrackingEnabled(enabled: boolean): void {
  runtimeEnabled = enabled
  if (!enabled) queue = []
}

export function isTrackingAllowed(): boolean {
  if (!isBrowser() || !runtimeEnabled) return false
  // Opt-out explícito local (además del consentimiento de cuenta).
  try {
    return localStorage.getItem(CONSENT_KEY) !== 'denied'
  } catch {
    return true
  }
}

/** Opt-out/opt-in explícito del usuario (persistente). */
export function setTrackingConsent(allowed: boolean): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(CONSENT_KEY, allowed ? 'granted' : 'denied')
  } catch {
    // noop
  }
}

function getSessionId(): string {
  if (!isBrowser()) return ''
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

function getToken(): string | null {
  if (!isBrowser()) return null
  try {
    return localStorage.getItem('auth-token')
  } catch {
    return null
  }
}

function bindLifecycleFlush(): void {
  if (listenersBound || !isBrowser()) return
  listenersBound = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true)
  })
  window.addEventListener('pagehide', () => flush(true))
}

/** Encola un evento de comportamiento. No bloquea ni lanza. */
export function track(eventType: string, payload: TrackPayload = {}): void {
  if (!isBrowser() || !isTrackingAllowed()) return

  queue.push({
    eventType,
    entityType: payload.entityType,
    entityId: payload.entityId,
    metadata: payload.metadata,
    ts: Date.now(),
  })
  bindLifecycleFlush()

  if (queue.length >= MAX_QUEUE) {
    flush()
  } else if (!timer) {
    timer = setTimeout(() => flush(), FLUSH_INTERVAL_MS)
  }
}

/** Envía la cola acumulada. `useBeacon` para cierre/ocultado de pestaña. */
export function flush(useBeacon = false): void {
  if (!isBrowser()) return
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (queue.length === 0) return

  const body = JSON.stringify({ sessionId: getSessionId(), events: queue })
  queue = []
  const url = `${API_URL}${ENDPOINT}`

  // Cierre de pestaña: sendBeacon (no admite headers → si no hay sesión por cookie,
  // este último lote queda anónimo; los lotes normales sí van con Authorization).
  if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
      return
    } catch {
      // fallback a fetch
    }
  }

  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  fetch(url, { method: 'POST', headers, body, keepalive: true }).catch((err) => {
    logger.log('[tracker] flush falló (no crítico):', err)
  })
}
