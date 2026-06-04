'use client'



import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { apiClient } from '@/lib/api/client'

import { API_ENDPOINTS } from '@/lib/api/endpoints'

import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'

import { useAdminDetailNavStore } from '@/lib/stores/admin-detail-nav-store'

import { useSupportCasesNavStore } from '@/lib/stores/support-cases-nav-store'

import { ADMIN_PAGE_X } from '@/components/admin/AdminPageShell'

import { SupportCaseListPanel } from '@/components/support-cases/SupportCaseListPanel'

import { SupportCaseDetailPanel } from '@/components/support-cases/SupportCaseDetailPanel'

import type { SupportCaseFilters } from '@/components/support-cases/SupportCaseFiltersModal'

import {

  CASE_STATUS_LABELS,

  CASE_TYPE_LABELS,

  KANBAN_STATUSES,

  statusBadgeClass,

  type SupportCaseDetail,

  type SupportCaseListItem,

  type SupportCaseStatus,

} from '@/lib/types/support-cases'



const EMPTY_FILTERS: SupportCaseFilters = {

  statuses: [],

  caseTypes: [],

  orderId: '',

}



function buildListUrl(filters: SupportCaseFilters, search: string): string {

  const params = new URLSearchParams()

  if (filters.statuses.length > 0) {

    params.set('status', filters.statuses.join(','))

  }

  if (filters.caseTypes.length > 0) {

    params.set('caseType', filters.caseTypes.join(','))

  }

  if (filters.orderId.trim()) {

    params.set('orderId', filters.orderId.trim())

  }

  if (search.trim()) {

    params.set('search', search.trim())

  }

  const qs = params.toString()

  return qs.length > 0

    ? `${API_ENDPOINTS.ADMIN.SUPPORT_CASES.LIST}?${qs}`

    : API_ENDPOINTS.ADMIN.SUPPORT_CASES.LIST

}



export default function SupportCasesPage() {

  const router = useRouter()

  const searchParams = useSearchParams()

  const selectedCaseId = searchParams.get('case')

  const { isAuthenticated, _hasHydrated: hasHydrated } = useAdminAuthStore()

  const setDetailNav = useAdminDetailNavStore((s) => s.setDetailNav)

  const clearDetailNav = useAdminDetailNavStore((s) => s.clearDetailNav)

  const viewMode = useSupportCasesNavStore((s) => s.viewMode)

  const setViewMode = useSupportCasesNavStore((s) => s.setViewMode)



  const [cases, setCases] = useState<SupportCaseListItem[]>([])

  const [detail, setDetail] = useState<SupportCaseDetail | null>(null)

  const [loadingList, setLoadingList] = useState(true)

  const [loadingDetail, setLoadingDetail] = useState(false)

  const [errorList, setErrorList] = useState<string | null>(null)

  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  const [filters, setFilters] = useState<SupportCaseFilters>(EMPTY_FILTERS)

  const [listSearch, setListSearch] = useState('')



  const loadCases = useCallback(async () => {

    setLoadingList(true)

    setErrorList(null)

    try {

      const url = buildListUrl(filters, listSearch)

      const response = await apiClient.get<{ success: boolean; data: SupportCaseListItem[] }>(url)

      setCases(response.data.data ?? [])

    } catch (err: unknown) {

      setErrorList(err instanceof Error ? err.message : 'Error al cargar casos')

    } finally {

      setLoadingList(false)

    }

  }, [filters, listSearch])



  const loadDetail = useCallback(async (caseId: string) => {

    setLoadingDetail(true)

    setErrorDetail(null)

    try {

      const response = await apiClient.get<{ success: boolean; data: SupportCaseDetail }>(

        API_ENDPOINTS.ADMIN.SUPPORT_CASES.BY_ID(caseId)

      )

      const data = response.data.data

      setDetail(data)

      if (data) {

        setDetailNav({

          caseCode: data.ref ?? `#${caseId.slice(-8).toUpperCase()}`,

          statusBadge: {

            label: CASE_STATUS_LABELS[data.status],

            className: statusBadgeClass(data.status),

          },

          subtitle: CASE_TYPE_LABELS[data.caseType],

        })

      }

    } catch (err: unknown) {

      setDetail(null)

      setErrorDetail(err instanceof Error ? err.message : 'Error al cargar el caso')

    } finally {

      setLoadingDetail(false)

    }

  }, [setDetailNav])



  useEffect(() => {

    if (!hasHydrated || !isAuthenticated) return

    setDetailNav({ caseCode: null, statusBadge: null, subtitle: null })

    loadCases()

    return () => clearDetailNav()

  }, [hasHydrated, isAuthenticated, loadCases, setDetailNav, clearDetailNav])



  useEffect(() => {

    if (!hasHydrated) return

    if (!isAuthenticated) {

      router.replace('/auth/login')

    }

  }, [hasHydrated, isAuthenticated, router])



  useEffect(() => {

    if (!hasHydrated || !isAuthenticated) return

    if (!selectedCaseId) {

      setDetail(null)

      setErrorDetail(null)

      setDetailNav({ caseCode: null, statusBadge: null, subtitle: null })

      return

    }

    loadDetail(selectedCaseId)

  }, [hasHydrated, isAuthenticated, selectedCaseId, loadDetail, setDetailNav])



  const selectCase = (id: string) => {

    const params = new URLSearchParams(searchParams.toString())

    params.set('case', id)

    router.replace(`/support-cases?${params.toString()}`, { scroll: false })

  }



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

    <div className={`${ADMIN_PAGE_X} flex h-full min-h-0 flex-col overflow-hidden`}>

      {errorList && (

        <div className="shrink-0 mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">

          {errorList}

        </div>

      )}



      {viewMode === 'kanban' ? (

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">

          <div className="custom-scrollbar grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-3 xl:grid-cols-5">

              {KANBAN_STATUSES.map((status) => (

                <div

                  key={status}

                  className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50"

                >

                  <div className="shrink-0 border-b border-gray-200 px-3 py-2">

                    <h3 className="text-sm font-semibold text-gray-800">

                      {CASE_STATUS_LABELS[status]}

                      <span className="ml-2 font-normal text-gray-500">

                        ({casesByStatus[status].length})

                      </span>

                    </h3>

                  </div>

                  <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-2">

                    {casesByStatus[status].length === 0 ? (

                      <p className="py-4 text-center text-xs text-gray-400">Sin casos</p>

                    ) : (

                      casesByStatus[status].map((c) => (

                        <button

                          key={c.id}

                          type="button"

                          onClick={() => {

                            setViewMode('table')

                            selectCase(c.id)

                          }}

                          className="block w-full rounded-md border border-gray-200 bg-white p-3 text-left shadow-sm hover:border-teal-300"

                        >

                          <p className="font-mono text-xs text-teal-700">

                            {c.ref ?? `#${c.id.slice(-8).toUpperCase()}`}

                          </p>

                          <p className="mt-1 text-sm font-medium text-gray-900 line-clamp-2">

                            {CASE_TYPE_LABELS[c.caseType]}

                          </p>

                          <p className="mt-1 text-xs text-gray-500 truncate">{c.userEmail}</p>

                        </button>

                      ))

                    )}

                  </div>

                </div>

              ))}

          </div>

        </div>

      ) : (

        <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">

          <div

            className={`min-h-0 min-w-0 shrink-0 ${

              selectedCaseId ? 'hidden xl:flex' : 'flex w-full xl:w-auto'

            }`}

          >

            <SupportCaseListPanel

              cases={cases}

              loading={loadingList}

              selectedId={selectedCaseId}

              onSelect={selectCase}

              filters={filters}

              onApplyFilters={setFilters}

              onSearchChange={setListSearch}

            />

          </div>

          <div

            className={`min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${

              selectedCaseId ? 'flex w-full' : 'hidden xl:flex'

            }`}

          >

            <SupportCaseDetailPanel

              detail={detail}

              loading={loadingDetail}

              error={errorDetail}

              onDetailUpdated={(updated) => {

                setDetail(updated)

                setDetailNav({

                  caseCode: updated.ref ?? `#${updated.id.slice(-8).toUpperCase()}`,

                  statusBadge: {

                    label: CASE_STATUS_LABELS[updated.status],

                    className: statusBadgeClass(updated.status),

                  },

                  subtitle: CASE_TYPE_LABELS[updated.caseType],

                })

                void loadCases()

              }}

            />

          </div>

        </div>

      )}

    </div>

  )

}

