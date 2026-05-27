'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { useAdminDetailNavStore } from '@/lib/stores/admin-detail-nav-store'
import { SupportCaseStatusStepper } from '@/components/support-cases/SupportCaseStatusStepper'
import { SupportCaseSnapshotView } from '@/components/support-cases/SupportCaseSnapshotView'
import { SupportCaseTimeline } from '@/components/support-cases/SupportCaseTimeline'
import { showNotification } from '@/components/notifications'
import {
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  type SupportCaseDetail,
  type SupportCaseStatus,
} from '@/lib/types/support-cases'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function SupportCaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.id as string
  const { isAuthenticated, _hasHydrated: hasHydrated } = useAdminAuthStore()
  const setDetailNav = useAdminDetailNavStore((s) => s.setDetailNav)
  const clearDetailNav = useAdminDetailNavStore((s) => s.clearDetailNav)
  const [detail, setDetail] = useState<SupportCaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const loadDetail = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<{ success: boolean; data: SupportCaseDetail }>(
        API_ENDPOINTS.ADMIN.SUPPORT_CASES.BY_ID(caseId)
      )
      const data = response.data.data
      setDetail(data)
      setDetailNav({
        title: `Caso #${caseId.slice(-8).toUpperCase()}`,
        subtitle: data ? CASE_TYPE_LABELS[data.caseType] : null,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar el caso')
    } finally {
      setLoading(false)
    }
  }, [caseId, setDetailNav])

  useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated) {
      router.replace('/auth/login')
    }
  }, [hasHydrated, isAuthenticated, router])

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !caseId) return
    loadDetail()
    return () => clearDetailNav()
  }, [hasHydrated, isAuthenticated, caseId, loadDetail, clearDetailNav])

  const handleUpdateStatus = async (status: SupportCaseStatus) => {
    setStatusUpdating(true)
    try {
      const response = await apiClient.patch<{ success: boolean; data: SupportCaseDetail }>(
        API_ENDPOINTS.ADMIN.SUPPORT_CASES.UPDATE_STATUS(caseId),
        { status }
      )
      if (response.data.data) {
        setDetail(response.data.data)
        showNotification(`Estado actualizado a «${CASE_STATUS_LABELS[status]}»`, 'success')
      }
    } catch (err: unknown) {
      let message = 'No se pudo actualizar el estado'
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: { message?: string } } } }
        if (axiosErr.response?.data?.error?.message) {
          message = axiosErr.response.data.error.message
        }
      }
      showNotification(message, 'error')
    } finally {
      setStatusUpdating(false)
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
    <AdminPageShell>
      <div className="mx-auto w-full max-w-4xl">
      <Link
        href="/support-cases"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver a postventa
      </Link>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {detail && !loading && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Caso de soporte
                </p>
                <h1 className="mt-1 text-xl font-bold text-gray-900 font-mono">
                  #{detail.id.slice(-8).toUpperCase()}
                </h1>
                <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {detail.description}
                </p>
              </div>

              <div className="shrink-0 lg:min-w-[220px] lg:border-l lg:border-gray-100 lg:pl-6">
                <SupportCaseStatusStepper
                  status={detail.status}
                  updating={statusUpdating}
                  onAdvance={handleUpdateStatus}
                />
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-gray-500">Usuario</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {detail.userEmail}
                  {(detail.userFirstName || detail.userLastName) && (
                    <span className="text-gray-500">
                      {' '}
                      · {[detail.userFirstName, detail.userLastName].filter(Boolean).join(' ')}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Pedido</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900 break-all">{detail.orderId}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Registrado</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(detail.createdAt).toLocaleString('es-CO')}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Última actualización</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(detail.updatedAt).toLocaleString('es-CO')}
                </dd>
              </div>
            </dl>
          </div>

          <SupportCaseSnapshotView detail={detail} />
          <SupportCaseTimeline events={detail.events} />
        </div>
      )}
      </div>
    </AdminPageShell>
  )
}
