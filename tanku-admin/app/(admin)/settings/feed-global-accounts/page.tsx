'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { AdminSettingsLayout } from '@/components/admin/AdminSettingsLayout'
import { AdminCollapsibleCard } from '@/components/admin/AdminCollapsibleCard'
import { AdminFormSection } from '@/components/admin/AdminFormSection'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { extractApiErrorMessage } from '@/lib/api/errors'
import { showNotification } from '@/components/notifications'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FeedGlobalAccountRow {
  id: string
  userId: string
  email: string
  username: string | null
  firstName: string | null
  lastName: string | null
  avatar: string | null
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export default function FeedGlobalAccountsSettingsPage() {
  const { isAuthenticated, _hasHydrated: hasHydrated } = useAdminAuthStore()
  const [accounts, setAccounts] = useState<FeedGlobalAccountRow[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<{ success: boolean; data: FeedGlobalAccountRow[] }>(
        API_ENDPOINTS.ADMIN.FEED_GLOBAL_ACCOUNTS.LIST
      )
      if (res.data.success && res.data.data) {
        setAccounts(res.data.data)
      }
    } catch (err) {
      showNotification(extractApiErrorMessage(err) || 'No se pudo cargar la lista', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return
    void loadAccounts()
  }, [hasHydrated, isAuthenticated, loadAccounts])

  const handleAdd = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      showNotification('Ingresa un correo válido de usuario de la app', 'error')
      return
    }

    setAdding(true)
    try {
      const res = await apiClient.post<{ success: boolean; data: FeedGlobalAccountRow }>(
        API_ENDPOINTS.ADMIN.FEED_GLOBAL_ACCOUNTS.CREATE,
        { email: trimmed }
      )
      if (res.data.success && res.data.data) {
        setEmail('')
        showNotification('Cuenta añadida al feed global', 'success')
        await loadAccounts()
      }
    } catch (err) {
      showNotification(extractApiErrorMessage(err) || 'Error al añadir cuenta', 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleToggleActive = async (row: FeedGlobalAccountRow) => {
    setTogglingId(row.id)
    try {
      const res = await apiClient.patch<{ success: boolean; data: FeedGlobalAccountRow }>(
        API_ENDPOINTS.ADMIN.FEED_GLOBAL_ACCOUNTS.UPDATE(row.id),
        { active: !row.active }
      )
      if (res.data.success) {
        showNotification(row.active ? 'Cuenta desactivada' : 'Cuenta activada', 'success')
        await loadAccounts()
      }
    } catch (err) {
      showNotification(extractApiErrorMessage(err) || 'Error al actualizar', 'error')
    } finally {
      setTogglingId(null)
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
        title="Cuentas del feed"
        summary="Usuarios de la app cuyos posts e historias se muestran a todos (feed autenticado y landing)."
        defaultOpen
      >
        <AdminFormSection title="Añadir cuenta por correo">
          <div className="flex flex-col sm:flex-row gap-2 max-w-xl mb-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={adding}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {adding ? 'Añadiendo…' : 'Añadir'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            El correo debe corresponder a un usuario registrado en la app. Sus publicaciones aparecerán
            como si fueran amigos de todos los usuarios. El bloqueo no oculta cuentas globales.
          </p>

          {loading ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-gray-500">No hay cuentas globales configuradas.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Usuario</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Correo</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {accounts.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {row.avatar ? (
                            <Image
                              src={row.avatar}
                              alt=""
                              width={32}
                              height={32}
                              className="rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200" />
                          )}
                          <span className="text-gray-900">
                            {row.username ||
                              [row.firstName, row.lastName].filter(Boolean).join(' ') ||
                              '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            row.active
                              ? 'text-green-700 font-medium'
                              : 'text-gray-400'
                          }
                        >
                          {row.active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(row)}
                          disabled={togglingId === row.id}
                          className="text-blue-600 hover:underline disabled:opacity-50"
                        >
                          {togglingId === row.id
                            ? '…'
                            : row.active
                              ? 'Desactivar'
                              : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminFormSection>
      </AdminCollapsibleCard>
    </AdminSettingsLayout>
  )
}
