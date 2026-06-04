'use client'

import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { FilterCheckboxPill } from '@/components/support-cases/FilterCheckboxPill'
import {
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  FLOW_STATUSES,
  type SupportCaseStatus,
  type SupportCaseType,
} from '@/lib/types/support-cases'

export type SupportCaseFilters = {
  statuses: SupportCaseStatus[]
  caseTypes: SupportCaseType[]
  orderId: string
}

interface SupportCaseFiltersModalProps {
  open: boolean
  filters: SupportCaseFilters
  onClose: () => void
  onApply: (filters: SupportCaseFilters) => void
}

const ALL_CASE_TYPES = Object.keys(CASE_TYPE_LABELS) as SupportCaseType[]

const EMPTY_FILTERS: SupportCaseFilters = {
  statuses: [],
  caseTypes: [],
  orderId: '',
}

export function SupportCaseFiltersModal({
  open,
  filters,
  onClose,
  onApply,
}: SupportCaseFiltersModalProps) {
  const [localStatuses, setLocalStatuses] = useState<SupportCaseStatus[]>(filters.statuses)
  const [localCaseTypes, setLocalCaseTypes] = useState<SupportCaseType[]>(filters.caseTypes)
  const [localOrderId, setLocalOrderId] = useState(filters.orderId)

  useEffect(() => {
    if (open) {
      setLocalStatuses(filters.statuses)
      setLocalCaseTypes(filters.caseTypes)
      setLocalOrderId(filters.orderId)
    }
  }, [open, filters])

  if (!open) return null

  const toggleStatus = (status: SupportCaseStatus, checked: boolean) => {
    setLocalStatuses((prev) =>
      checked ? [...prev, status] : prev.filter((s) => s !== status)
    )
  }

  const toggleCaseType = (caseType: SupportCaseType, checked: boolean) => {
    setLocalCaseTypes((prev) =>
      checked ? [...prev, caseType] : prev.filter((t) => t !== caseType)
    )
  }

  const handleApply = () => {
    onApply({
      statuses: localStatuses,
      caseTypes: localCaseTypes,
      orderId: localOrderId.trim(),
    })
    onClose()
  }

  const handleClear = () => {
    setLocalStatuses([])
    setLocalCaseTypes([])
    setLocalOrderId('')
    onApply(EMPTY_FILTERS)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-filters-title"
        className="relative max-h-[min(90vh,640px)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl custom-scrollbar"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="support-filters-title" className="text-lg font-bold text-gray-900">
              Filtros
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Estado, tipo de caso o referencia de pedido (ORD-…).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-800">Estado</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Sin selección se muestran todos los estados.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {FLOW_STATUSES.map((status) => (
                <FilterCheckboxPill
                  key={status}
                  id={`filter-status-${status}`}
                  label={CASE_STATUS_LABELS[status]}
                  checked={localStatuses.includes(status)}
                  onChange={(checked) => toggleStatus(status, checked)}
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-800">Tipo de caso</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Sin selección se muestran todos los tipos.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ALL_CASE_TYPES.map((caseType) => (
                <FilterCheckboxPill
                  key={caseType}
                  id={`filter-type-${caseType}`}
                  label={CASE_TYPE_LABELS[caseType]}
                  checked={localCaseTypes.includes(caseType)}
                  onChange={(checked) => toggleCaseType(caseType, checked)}
                />
              ))}
            </div>
          </section>

          <section>
            <label htmlFor="filter-order-id" className="block text-sm font-semibold text-gray-800">
              Pedido (ref)
            </label>
            <input
              id="filter-order-id"
              type="text"
              value={localOrderId}
              onChange={(e) => setLocalOrderId(e.target.value)}
              placeholder="Ej. ORD-2026-0000001"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
            />
          </section>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Aplicar filtros
          </button>
        </div>
      </div>
    </div>
  )
}
