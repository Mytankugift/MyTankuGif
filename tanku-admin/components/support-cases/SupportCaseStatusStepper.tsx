'use client'

import {
  CASE_STATUS_LABELS,
  getNextStatusTransitions,
  statusBadgeClass,
  type SupportCaseStatus,
} from '@/lib/types/support-cases'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

interface SupportCaseStatusStepperProps {
  status: SupportCaseStatus
  updating: boolean
  onAdvance: (next: SupportCaseStatus) => void
}

export function SupportCaseStatusStepper({
  status,
  updating,
  onAdvance,
}: SupportCaseStatusStepperProps) {
  const transitions = getNextStatusTransitions(status)

  return (
    <div className="flex flex-col items-stretch gap-3 sm:items-end">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Estado actual
        </span>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass(status)}`}
        >
          {CASE_STATUS_LABELS[status]}
        </span>
      </div>

      {transitions.length > 0 ? (
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <p className="text-xs text-gray-500 text-right">Siguiente paso</p>
          {transitions.map((t) => (
            <button
              key={t.next}
              type="button"
              disabled={updating}
              onClick={() => onAdvance(t.next)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                t.variant === 'primary'
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
              }`}
            >
              {updating ? 'Guardando…' : t.label}
              {!updating && <ChevronRightIcon className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-right">Este caso ya está cerrado.</p>
      )}
    </div>
  )
}
