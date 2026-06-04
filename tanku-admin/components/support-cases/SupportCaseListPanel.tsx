'use client'

import { useEffect, useMemo, useState } from 'react'
import { FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import {
  SupportCaseFiltersModal,
  type SupportCaseFilters,
} from '@/components/support-cases/SupportCaseFiltersModal'
import {
  CASE_STATUS_LABELS,
  assignedAdminDisplayName,
  CASE_TYPE_LABELS,
  statusBadgeClass,
  type SupportCaseListItem,
} from '@/lib/types/support-cases'

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '')
}

interface SupportCaseListPanelProps {
  cases: SupportCaseListItem[]
  loading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  filters: SupportCaseFilters
  onApplyFilters: (filters: SupportCaseFilters) => void
  onSearchChange: (query: string) => void
}

export function SupportCaseListPanel({
  cases,
  loading,
  selectedId,
  onSelect,
  filters,
  onApplyFilters,
  onSearchChange,
}: SupportCaseListPanelProps) {
  const [localSearch, setLocalSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const hasActiveFilters =
    filters.statuses.length > 0 || filters.caseTypes.length > 0 || Boolean(filters.orderId.trim())

  useEffect(() => {
    const handle = window.setTimeout(() => {
      onSearchChange(localSearch.trim())
    }, 300)
    return () => window.clearTimeout(handle)
  }, [localSearch, onSearchChange])

  const displayedCases = useMemo(() => {
    const q = normalizeSearchText(localSearch.trim())
    if (!q) return cases
    return cases.filter((c) => {
      const haystack = normalizeSearchText(
        [
          c.id,
          c.ref,
          c.orderId,
          c.orderRef,
          c.userEmail,
          CASE_TYPE_LABELS[c.caseType],
          CASE_STATUS_LABELS[c.status],
          c.description,
        ]
          .filter(Boolean)
          .join(' ')
      )
      return haystack.includes(q)
    })
  }, [cases, localSearch])

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-gray-200 bg-white xl:w-[min(100%,22rem)] xl:max-w-sm 2xl:max-w-md">
      <div className="shrink-0 border-b border-gray-200 p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Historial de solicitudes</h2>
          <p className="text-xs text-gray-500">
            {displayedCases.length === cases.length
              ? `${cases.length} casos`
              : `${displayedCases.length} de ${cases.length} casos`}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Buscar por RCL, ORD, pedido o motivo..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            title="Filtros"
            className={`inline-flex shrink-0 items-center justify-center rounded-lg border p-2 transition-colors ${
              hasActiveFilters
                ? 'border-teal-300 bg-teal-50 text-teal-700'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="relative">
              <FunnelIcon className="h-3.5 w-3.5" />
              {hasActiveFilters ? (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-teal-600" />
              ) : null}
            </span>
          </button>
        </div>
      </div>

      <SupportCaseFiltersModal
        open={filtersOpen}
        filters={filters}
        onClose={() => setFiltersOpen(false)}
        onApply={onApplyFilters}
      />

      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-gray-900" />
          </div>
        ) : displayedCases.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-gray-500">No hay casos</p>
        ) : (
          <ul className="space-y-2">
            {displayedCases.map((c) => {
              const selected = c.id === selectedId
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-shadow ${
                      selected
                        ? 'border-teal-400 bg-teal-50/60 shadow-sm ring-1 ring-teal-200'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-teal-700">
                        {c.ref ?? `#${c.id.slice(-8).toUpperCase()}`}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass(c.status)}`}
                      >
                        {CASE_STATUS_LABELS[c.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      Pedido {c.orderRef ?? c.orderId.slice(-8).toUpperCase()} ·{' '}
                      {CASE_TYPE_LABELS[c.caseType]}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400 truncate">{c.userEmail}</p>
                    <p className="mt-1 text-[11px] text-gray-500">
                      {c.assignedAdmin
                        ? `Asignado: ${assignedAdminDisplayName(c.assignedAdmin)}`
                        : 'Sin asignar'}
                    </p>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Creado {new Date(c.createdAt).toLocaleDateString('es-CO')}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
