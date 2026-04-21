'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { showNotification } from '@/components/notifications'
import { ArrowLeftIcon, EnvelopeIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'

interface EmailTestResponse {
  success: boolean
  error?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailTestSettingsPage() {
  const { isAuthenticated, _hasHydrated: hasHydrated } = useAdminAuthStore()
  const [to, setTo] = useState('')
  const [sending, setSending] = useState(false)

  const handleSendTestEmail = async () => {
    const trimmedEmail = to.trim()
    if (!trimmedEmail) {
      showNotification('Ingresa un correo de destino', 'error')
      return
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      showNotification('Ingresa un correo válido', 'error')
      return
    }

    try {
      setSending(true)
      const response = await apiClient.post<EmailTestResponse>(API_ENDPOINTS.EMAIL.TEST, {
        to: trimmedEmail,
      })

      if (response.data.success) {
        showNotification(`Correo de prueba enviado a ${trimmedEmail}`, 'success')
      } else {
        showNotification(response.data.error || 'No se pudo enviar el correo de prueba', 'error')
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined
      showNotification(message || 'Error al enviar el correo de prueba', 'error')
    } finally {
      setSending(false)
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
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Volver a ajustes
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <EnvelopeIcon className="w-6 h-6 text-blue-600" />
            Email de prueba
          </h1>
          <p className="text-sm text-gray-600 mb-5">
            Envía un correo de prueba usando el endpoint del backend para validar la configuración
            actual del proveedor de email.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label htmlFor="email-test-to" className="block text-xs font-medium text-gray-500 mb-1">
                Correo de destino
              </label>
              <input
                id="email-test-to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="correo@dominio.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={sending}
              className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
              {sending ? 'Enviando...' : 'Enviar prueba'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
