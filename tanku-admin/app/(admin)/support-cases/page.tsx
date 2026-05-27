'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { AdminPageShell } from '@/components/admin/AdminPageShell'
import {
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  KANBAN_STATUSES,
  statusBadgeClass,
  type SupportCaseListItem,
  type SupportCaseStatus,
  type SupportCaseType,
} from '@/lib/types/support-cases'
import { MagnifyingGlassIcon, Squares2X2Icon, TableCellsIcon } from '@heroicons/react/24/outline'

type ViewMode = 'table' | 'kanban'

export default function SupportCasesPage() {
  const router = useRouter()
  const { isAuthenticated, _hasHydrated: hasHydrated } = useAdminAuthStore()
  const [cases, setCases] = useState<SupportCaseListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [statusFilter, setStatusFilter] = useState<SupportCaseStatus | ''>('')
  const [caseTypeFilter, setCaseTypeFilter] = useState<SupportCaseType | ''>('')
  const [orderIdSearch, setOrderIdSearch] = useState('')

  const loadCases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (caseTypeFilter) params.set('caseType', caseTypeFilter)
      if (orderIdSearch.trim()) params.set('orderId', orderIdSearch.trim())

      const url =
        params.toString().length > 0
          ? `${API_ENDPOINTS.ADMIN.SUPPORT_CASES.LIST}?${params.toString()}`
          : API_ENDPOINTS.ADMIN.SUPPORT_CASES.LIST

      const response = await apiClient.get<{ success: boolean; data: SupportCaseListItem[] }>(url)
      setCases(response.data.data ?? [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar casos'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, caseTypeFilter, orderIdSearch])

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return
    loadCases()
  }, [hasHydrated, isAuthenticated, loadCases])

  useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated) {
      router.replace('/auth/login')
    }
  }, [hasHydrated, isAuthenticated, router])

  const casesByStatus = useMemo(() => {
    const map: Record<SupportCaseStatus, SupportCaseListItem[]> = {
      OPEN: [],
      IN_REVIEW: [],
      WAITING_USER: [],
      RESOLVED: [],
      CLOSED: [],
    }
    for (const c of cases) {
      map[c.status].push(c)
    }
    return map
  }, [cases])

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <AdminPageShell>
      <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Postventa</h1>
          <p className="mt-1 text-sm text-gray-600">Casos reportados desde la app Tanku</p>
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
              viewMode === 'table' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <TableCellsIcon className="h-4 w-4" />
            Tabla
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
              viewMode === 'kanban' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Squares2X2Icon className="h-4 w-4" />
            Kanban
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SupportCaseStatus | '')}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {KANBAN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CASE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
          <select
            value={caseTypeFilter}
            onChange={(e) => setCaseTypeFilter(e.target.value as SupportCaseType | '')}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {(Object.keys(CASE_TYPE_LABELS) as SupportCaseType[]).map((t) => (
              <option key={t} value={t}>
                {CASE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">ID de pedido</label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={orderIdSearch}
              onChange={(e) => setOrderIdSearch(e.target.value)}
              placeholder="Buscar por orderId..."
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={loadCases}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Buscar
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : viewMode === 'table' ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Caso</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Pedido</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No hay casos de soporte
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/support-cases/${c.id}`}
                        className="font-mono text-blue-600 hover:underline"
                      >
                        #{c.id.slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.userEmail}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {c.orderId.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-sm">{CASE_TYPE_LABELS[c.caseType]}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(c.status)}`}
                      >
                        {CASE_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(c.createdAt).toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {KANBAN_STATUSES.map((status) => (
            <div key={status} className="rounded-lg border border-gray-200 bg-gray-50">
              <div className="border-b border-gray-200 px-3 py-2">
                <h3 className="text-sm font-semibold text-gray-800">
                  {CASE_STATUS_LABELS[status]}
                  <span className="ml-2 text-gray-500">({casesByStatus[status].length})</span>
                </h3>
              </div>
              <div className="max-h-[70vh] space-y-2 overflow-y-auto p-2">
                {casesByStatus[status].length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-400">Sin casos</p>
                ) : (
                  casesByStatus[status].map((c) => (
                    <Link
                      key={c.id}
                      href={`/support-cases/${c.id}`}
                      className="block rounded-md border border-gray-200 bg-white p-3 shadow-sm hover:border-gray-300"
                    >
                      <p className="font-mono text-xs text-blue-600">#{c.id.slice(-8).toUpperCase()}</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 line-clamp-2">
                        {CASE_TYPE_LABELS[c.caseType]}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 truncate">{c.userEmail}</p>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        Pedido {c.orderId.slice(-8).toUpperCase()}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </AdminPageShell>
  )
}
