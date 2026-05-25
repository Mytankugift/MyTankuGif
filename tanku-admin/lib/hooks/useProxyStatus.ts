'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

export interface ProxyStatus {
  status: 'active' | 'inactive' | 'not_configured' | 'active_with_errors'
  isActive: boolean
  proxyUrl: string | null
  message: string
  responseTime?: number
  httpStatus?: number
  timestamp: string
}

export function useProxyStatus(enabled: boolean) {
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const loadProxyStatus = useCallback(async () => {
    if (!enabled) return
    try {
      setLoading(true)
      const response = await apiClient.get<{ success: boolean; data: ProxyStatus }>(
        API_ENDPOINTS.ADMIN.SYSTEM.PROXY_STATUS
      )
      if (response.data.success) {
        setProxyStatus(response.data.data)
      }
    } catch (error: unknown) {
      console.error('Error cargando estado del proxy:', error)
      const status =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status === 404
          ? 'Endpoint no disponible (backend necesita recompilarse)'
          : `Error al verificar proxy: ${
              error instanceof Error ? error.message : 'Error desconocido'
            }`
      setProxyStatus({
        status: 'inactive',
        isActive: false,
        proxyUrl: null,
        message: status,
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setProxyStatus(null)
      return
    }
    loadProxyStatus()
    const interval = setInterval(loadProxyStatus, 30000)
    return () => clearInterval(interval)
  }, [enabled, loadProxyStatus])

  return { proxyStatus, loading, refresh: loadProxyStatus }
}
