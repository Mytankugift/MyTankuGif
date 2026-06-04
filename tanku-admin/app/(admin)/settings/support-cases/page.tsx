'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { AdminSettingsLayout } from '@/components/admin/AdminSettingsLayout'
import { AdminCollapsibleCard } from '@/components/admin/AdminCollapsibleCard'
import { AdminFormSection } from '@/components/admin/AdminFormSection'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { extractApiErrorMessage } from '@/lib/api/errors'
import { showNotification } from '@/components/notifications'
import { LifebuoyIcon } from '@heroicons/react/24/outline'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface SupportCasesConfig {
  notificationEmail: string | null
  updatedAt: string | null
}

export default function SupportCasesSettingsPage() {
  const { isAuthenticated, _hasHydrated: hasHydrated } = useAdminAuthStore()
  const [notificationEmail, setNotificationEmail] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<{ success: boolean; data: SupportCasesConfig }>(
        API_ENDPOINTS.ADMIN.SYSTEM.SUPPORT_CASES_CONFIG
      )
      if (res.data.success && res.data.data) {
        setNotificationEmail(res.data.data.notificationEmail ?? '')
        setUpdatedAt(res.data.data.updatedAt)
      }
    } catch (err) {
      showNotification(extractApiErrorMessage(err, 'No se pudo cargar la configuración'), 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return
    void loadConfig()
  }, [hasHydrated, isAuthenticated, loadConfig])

  const handleSave = async () => {
    const trimmed = notificationEmail.trim()
    if (trimmed && !EMAIL_RE.test(trimmed)) {
      showNotification('Ingresa un correo válido o deja el campo vacío', 'error')
      return
    }

    setSaving(true)
    try {
      const res = await apiClient.patch<{ success: boolean; data: SupportCasesConfig }>(
        API_ENDPOINTS.ADMIN.SYSTEM.SUPPORT_CASES_CONFIG,
        { notificationEmail: trimmed || null }
      )
      if (res.data.success && res.data.data) {
        setNotificationEmail(res.data.data.notificationEmail ?? '')
        setUpdatedAt(res.data.data.updatedAt ?? new Date().toISOString())
        showNotification('Configuración de postventa guardada', 'success')
      }
    } catch (err) {
      showNotification(extractApiErrorMessage(err, 'Error al guardar'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <AdminSettingsLayout>
      <AdminCollapsibleCard
        title="Postventa / Soporte"
        description="Correo al que se notifica cuando un usuario reporta un problema desde la app."
        icon={LifebuoyIcon}
        defaultOpen
      >
        <AdminFormSection title="Notificaciones por email">
          {loading ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : (
            <div className="space-y-4 max-w-lg">
              <div>
                <label
                  htmlFor="support-notification-email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Correo de notificaciones de postventa
                </label>
                <input
                  id="support-notification-email"
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="soporte@empresa.com"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Al crear una solicitud («Tengo un problema»), se envía un correo a esta dirección.
                  Si está vacío, no se envía correo (el caso se crea igual).
                </p>
              </div>
              {updatedAt ? (
                <p className="text-xs text-gray-400">
                  Última actualización:{' '}
                  {new Date(updatedAt).toLocaleString('es-CO', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              ) : null}
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="rounded-md bg-[#0092c6] px-4 py-2 text-sm font-medium text-white hover:bg-[#007bb5] disabled:opacity-60"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          )}
        </AdminFormSection>
      </AdminCollapsibleCard>
    </AdminSettingsLayout>
  )
}
